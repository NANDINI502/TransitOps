import json
import os
from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import firestore
from openai import OpenAI
from pydantic import BaseModel

from app.core.auth import CurrentUser, ROLE_PERMISSIONS, get_current_user
from app.core.firebase import db
from app.models.schemas import (
    DriverCreate,
    ExpenseCreate,
    FuelLogCreate,
    MaintenanceCreate,
    TripCreate,
    VehicleCreate,
)
from app.utils.firestore_helpers import doc_to_dict, get_all_cached, invalidate_cache, next_trip_no, utcnow_iso
from app.routers.trips_router import (
    check_cargo_fits,
    check_driver_can_dispatch,
    check_vehicle_can_dispatch,
    enrich_trip,
    enrich_trips,
)

router = APIRouter(prefix="/api/chat", tags=["chat"])

_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("CHAT_API_KEY")
        base_url = os.getenv("CHAT_API_BASE_URL", "https://ai.revealiq.in/api/v1")
        if not api_key:
            raise HTTPException(status_code=503, detail="Chat assistant is not configured (missing CHAT_API_KEY)")
        _client = OpenAI(api_key=api_key, base_url=base_url)
    return _client


CHAT_MODEL = os.getenv("CHAT_MODEL", "kautilya-daily")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
    actions: list[dict] = []


def _forbidden(module: str, user: CurrentUser, need_full: bool = False) -> Optional[str]:
    level = ROLE_PERMISSIONS.get(user.role, {}).get(module)
    if level is None:
        return f"Your role ('{user.role}') has no access to {module}."
    if need_full and level != "full":
        return f"Your role ('{user.role}') has read-only access to {module}; this action requires edit access."
    return None


# ---------------------------------------------------------------------------
# Tool implementations - each mirrors the corresponding REST endpoint's logic
# and enforces the SAME RBAC rule the human user would hit via the UI/API.
# ---------------------------------------------------------------------------

def tool_list_vehicles(user: CurrentUser, status: Optional[str] = None, type: Optional[str] = None):
    if err := _forbidden("fleet", user):
        return {"error": err}
    vehicles = get_all_cached("vehicles")
    if status:
        vehicles = [v for v in vehicles if v.get("status") == status]
    if type:
        vehicles = [v for v in vehicles if v.get("type") == type]
    return {"count": len(vehicles), "vehicles": vehicles[:30]}


def tool_list_drivers(user: CurrentUser, status: Optional[str] = None):
    if err := _forbidden("drivers", user):
        return {"error": err}
    drivers = get_all_cached("drivers")
    if status:
        drivers = [d for d in drivers if d.get("status") == status]
    return {"count": len(drivers), "drivers": drivers[:30]}


def tool_list_trips(user: CurrentUser, status: Optional[str] = None):
    if err := _forbidden("trips", user):
        return {"error": err}
    trips = get_all_cached("trips")
    if status:
        trips = [t for t in trips if t.get("status") == status]
    return {"count": len(trips), "trips": enrich_trips(trips)[:30]}


def _find_vehicle_by_name_or_reg(query: str) -> Optional[dict]:
    query_l = query.strip().lower()
    for v in get_all_cached("vehicles"):
        if v.get("name", "").lower() == query_l or v.get("reg_no", "").lower() == query_l:
            return v
    for v in get_all_cached("vehicles"):
        if query_l in v.get("name", "").lower() or query_l in v.get("reg_no", "").lower():
            return v
    return None


def _find_driver_by_name(query: str) -> Optional[dict]:
    query_l = query.strip().lower()
    for d in get_all_cached("drivers"):
        if d.get("name", "").lower() == query_l:
            return d
    for d in get_all_cached("drivers"):
        if query_l in d.get("name", "").lower():
            return d
    return None


def tool_create_vehicle(user: CurrentUser, reg_no: str, name: str, type: str, max_load_kg: float,
                         acquisition_cost: float = 0, region: Optional[str] = None):
    if err := _forbidden("fleet", user, need_full=True):
        return {"error": err}
    try:
        body = VehicleCreate(reg_no=reg_no, name=name, type=type, max_load_kg=max_load_kg,
                              acquisition_cost=acquisition_cost, region=region)
    except Exception as exc:
        return {"error": str(exc)}
    existing = [v for v in get_all_cached("vehicles") if v.get("reg_no") == reg_no]
    if existing:
        return {"error": f"Vehicle with reg_no '{reg_no}' already exists"}
    data = body.model_dump()
    data["created_at"] = utcnow_iso()
    _, ref = db.collection("vehicles").add(data)
    invalidate_cache("vehicles")
    return {"success": True, "vehicle": doc_to_dict(ref.get())}


def tool_create_driver(user: CurrentUser, name: str, license_no: str, license_category: str,
                        license_expiry: str, contact: Optional[str] = None):
    if err := _forbidden("drivers", user, need_full=True):
        return {"error": err}
    try:
        body = DriverCreate(name=name, license_no=license_no, license_category=license_category,
                             license_expiry=license_expiry, contact=contact)
    except Exception as exc:
        return {"error": str(exc)}
    data = body.model_dump()
    data["created_at"] = utcnow_iso()
    _, ref = db.collection("drivers").add(data)
    invalidate_cache("drivers")
    return {"success": True, "driver": doc_to_dict(ref.get())}


def tool_create_trip(user: CurrentUser, source: str, destination: str, vehicle: str, driver: str,
                      cargo_weight_kg: float, planned_distance_km: float):
    if err := _forbidden("trips", user, need_full=True):
        return {"error": err}

    vehicle_doc = _find_vehicle_by_name_or_reg(vehicle)
    if not vehicle_doc:
        return {"error": f"No vehicle matching '{vehicle}' found"}
    driver_doc = _find_driver_by_name(driver)
    if not driver_doc:
        return {"error": f"No driver matching '{driver}' found"}

    try:
        body = TripCreate(source=source, destination=destination, vehicle_id=vehicle_doc["id"],
                           driver_id=driver_doc["id"], cargo_weight_kg=cargo_weight_kg,
                           planned_distance_km=planned_distance_km)
    except Exception as exc:
        return {"error": str(exc)}

    try:
        check_vehicle_can_dispatch(vehicle_doc)
        check_driver_can_dispatch(driver_doc)
        check_cargo_fits(body.cargo_weight_kg, vehicle_doc)
    except HTTPException as exc:
        return {"error": exc.detail}

    data = body.model_dump()
    data.update(status="Draft", trip_no=next_trip_no(), dispatched_at=None, completed_at=None,
                final_odometer_km=None, fuel_consumed_l=None, revenue=0, created_at=utcnow_iso())
    _, ref = db.collection("trips").add(data)
    invalidate_cache("trips")
    return {"success": True, "trip": enrich_trip(doc_to_dict(ref.get()))}


def _get_trip_or_error(trip_no_or_id: str) -> tuple[Optional[Any], Optional[dict]]:
    trips = get_all_cached("trips")
    for t in trips:
        if t.get("trip_no", "").lower() == trip_no_or_id.strip().lower() or t.get("id") == trip_no_or_id:
            return db.collection("trips").document(t["id"]), t
    return None, None


def tool_dispatch_trip(user: CurrentUser, trip_no: str):
    if err := _forbidden("trips", user, need_full=True):
        return {"error": err}
    trip_ref, trip = _get_trip_or_error(trip_no)
    if not trip:
        return {"error": f"Trip '{trip_no}' not found"}
    if trip["status"] != "Draft":
        return {"error": f"Only Draft trips can be dispatched (current status: {trip['status']})"}

    vehicle_ref = db.collection("vehicles").document(trip["vehicle_id"])
    driver_ref = db.collection("drivers").document(trip["driver_id"])
    vehicle_doc = vehicle_ref.get()
    driver_doc = driver_ref.get()
    if not vehicle_doc.exists or not driver_doc.exists:
        return {"error": "Vehicle or driver no longer exists"}
    vehicle = doc_to_dict(vehicle_doc)
    driver = doc_to_dict(driver_doc)

    try:
        check_vehicle_can_dispatch(vehicle)
        check_driver_can_dispatch(driver)
        check_cargo_fits(trip["cargo_weight_kg"], vehicle)
    except HTTPException as exc:
        return {"error": exc.detail}

    txn = db.transaction()

    @firestore.transactional
    def run(t):
        v_data = vehicle_ref.get(transaction=t).to_dict() or {}
        d_data = driver_ref.get(transaction=t).to_dict() or {}
        t_data = trip_ref.get(transaction=t).to_dict() or {}
        if t_data.get("status") != "Draft":
            raise HTTPException(status_code=400, detail="Trip is no longer in Draft status")
        if v_data.get("status") != "Available":
            raise HTTPException(status_code=400, detail=f"Vehicle status changed to '{v_data.get('status')}'")
        if d_data.get("status") != "Available":
            raise HTTPException(status_code=400, detail=f"Driver status changed to '{d_data.get('status')}'")
        now = utcnow_iso()
        t.update(vehicle_ref, {"status": "On Trip"})
        t.update(driver_ref, {"status": "On Trip"})
        t.update(trip_ref, {"status": "Dispatched", "dispatched_at": now})

    try:
        run(txn)
    except HTTPException as exc:
        return {"error": exc.detail}

    invalidate_cache("trips")
    invalidate_cache("vehicles")
    invalidate_cache("drivers")
    return {"success": True, "trip": enrich_trip(doc_to_dict(trip_ref.get()))}


def tool_complete_trip(user: CurrentUser, trip_no: str, final_odometer_km: float,
                        fuel_consumed_l: float, fuel_cost: Optional[float] = None,
                        revenue: Optional[float] = None):
    if err := _forbidden("trips", user, need_full=True):
        return {"error": err}
    trip_ref, trip = _get_trip_or_error(trip_no)
    if not trip:
        return {"error": f"Trip '{trip_no}' not found"}
    if trip["status"] != "Dispatched":
        return {"error": f"Only Dispatched trips can be completed (current status: {trip['status']})"}

    vehicle_ref = db.collection("vehicles").document(trip["vehicle_id"])
    driver_ref = db.collection("drivers").document(trip["driver_id"])
    fuel_log_ref = db.collection("fuel_logs").document()

    txn = db.transaction()

    @firestore.transactional
    def run(t):
        t_data = trip_ref.get(transaction=t).to_dict() or {}
        if t_data.get("status") != "Dispatched":
            raise HTTPException(status_code=400, detail="Trip is no longer in Dispatched status")
        now = utcnow_iso()
        t.update(vehicle_ref, {"status": "Available", "odometer_km": final_odometer_km})
        t.update(driver_ref, {"status": "Available"})
        t.update(trip_ref, {
            "status": "Completed", "completed_at": now,
            "final_odometer_km": final_odometer_km, "fuel_consumed_l": fuel_consumed_l,
            "revenue": revenue or 0,
        })
        t.set(fuel_log_ref, {
            "vehicle_id": trip["vehicle_id"], "trip_id": trip["id"], "liters": fuel_consumed_l,
            "cost": fuel_cost or 0, "date": date.today().isoformat(), "created_at": now,
        })

    try:
        run(txn)
    except HTTPException as exc:
        return {"error": exc.detail}

    invalidate_cache("trips")
    invalidate_cache("vehicles")
    invalidate_cache("drivers")
    invalidate_cache("fuel_logs")
    return {"success": True, "trip": enrich_trip(doc_to_dict(trip_ref.get()))}


def tool_cancel_trip(user: CurrentUser, trip_no: str, reason: Optional[str] = None):
    if err := _forbidden("trips", user, need_full=True):
        return {"error": err}
    trip_ref, trip = _get_trip_or_error(trip_no)
    if not trip:
        return {"error": f"Trip '{trip_no}' not found"}
    if trip["status"] not in ("Draft", "Dispatched"):
        return {"error": f"Only Draft or Dispatched trips can be cancelled (current status: {trip['status']})"}

    vehicle_ref = db.collection("vehicles").document(trip["vehicle_id"])
    driver_ref = db.collection("drivers").document(trip["driver_id"])
    was_dispatched = trip["status"] == "Dispatched"

    txn = db.transaction()

    @firestore.transactional
    def run(t):
        t_data = trip_ref.get(transaction=t).to_dict() or {}
        if t_data.get("status") not in ("Draft", "Dispatched"):
            raise HTTPException(status_code=400, detail="Trip is no longer cancellable")
        if was_dispatched:
            t.update(vehicle_ref, {"status": "Available"})
            t.update(driver_ref, {"status": "Available"})
        t.update(trip_ref, {"status": "Cancelled"})

    try:
        run(txn)
    except HTTPException as exc:
        return {"error": exc.detail}

    invalidate_cache("trips")
    if was_dispatched:
        invalidate_cache("vehicles")
        invalidate_cache("drivers")
    return {"success": True, "trip": enrich_trip(doc_to_dict(trip_ref.get()))}


def tool_log_maintenance(user: CurrentUser, vehicle: str, service_type: str, cost: float,
                          service_date: Optional[str] = None, status: str = "Active"):
    if err := _forbidden("fleet", user, need_full=True):
        return {"error": err}
    vehicle_doc = _find_vehicle_by_name_or_reg(vehicle)
    if not vehicle_doc:
        return {"error": f"No vehicle matching '{vehicle}' found"}
    try:
        body = MaintenanceCreate(vehicle_id=vehicle_doc["id"], service_type=service_type, cost=cost,
                                  date=service_date or date.today().isoformat(), status=status)
    except Exception as exc:
        return {"error": str(exc)}

    vehicle_ref = db.collection("vehicles").document(vehicle_doc["id"])
    maintenance_ref = db.collection("maintenance_logs").document()
    data = body.model_dump()
    data["created_at"] = utcnow_iso()

    if body.status == "Active":
        txn = db.transaction()

        @firestore.transactional
        def run(t):
            v_data = vehicle_ref.get(transaction=t).to_dict() or {}
            if v_data.get("status") == "Retired":
                raise HTTPException(status_code=400, detail="Cannot open a maintenance record for a retired vehicle")
            t.set(maintenance_ref, data)
            t.update(vehicle_ref, {"status": "In Shop"})

        try:
            run(txn)
        except HTTPException as exc:
            return {"error": exc.detail}
        invalidate_cache("vehicles")
    else:
        maintenance_ref.set(data)

    invalidate_cache("maintenance_logs")
    return {"success": True, "maintenance": doc_to_dict(maintenance_ref.get())}


def tool_log_fuel(user: CurrentUser, vehicle: str, liters: float, cost: float, log_date: Optional[str] = None):
    if err := _forbidden("fuel_expenses", user, need_full=True):
        return {"error": err}
    vehicle_doc = _find_vehicle_by_name_or_reg(vehicle)
    if not vehicle_doc:
        return {"error": f"No vehicle matching '{vehicle}' found"}
    try:
        body = FuelLogCreate(vehicle_id=vehicle_doc["id"], liters=liters, cost=cost,
                              date=log_date or date.today().isoformat())
    except Exception as exc:
        return {"error": str(exc)}
    data = body.model_dump()
    data["created_at"] = utcnow_iso()
    _, ref = db.collection("fuel_logs").add(data)
    invalidate_cache("fuel_logs")
    return {"success": True, "fuel_log": doc_to_dict(ref.get())}


def tool_log_expense(user: CurrentUser, vehicle: str, category: str, amount: float, log_date: Optional[str] = None):
    if err := _forbidden("fuel_expenses", user, need_full=True):
        return {"error": err}
    vehicle_doc = _find_vehicle_by_name_or_reg(vehicle)
    if not vehicle_doc:
        return {"error": f"No vehicle matching '{vehicle}' found"}
    try:
        body = ExpenseCreate(vehicle_id=vehicle_doc["id"], category=category, amount=amount,
                              date=log_date or date.today().isoformat())
    except Exception as exc:
        return {"error": str(exc)}
    data = body.model_dump()
    data["created_at"] = utcnow_iso()
    _, ref = db.collection("expenses").add(data)
    invalidate_cache("expenses")
    return {"success": True, "expense": doc_to_dict(ref.get())}


def tool_analytics_summary(user: CurrentUser):
    if err := _forbidden("analytics", user):
        return {"error": err}
    from app.routers.analytics_router import analytics_summary
    return analytics_summary(user=user)


TOOL_IMPLS = {
    "list_vehicles": tool_list_vehicles,
    "list_drivers": tool_list_drivers,
    "list_trips": tool_list_trips,
    "create_vehicle": tool_create_vehicle,
    "create_driver": tool_create_driver,
    "create_trip": tool_create_trip,
    "dispatch_trip": tool_dispatch_trip,
    "complete_trip": tool_complete_trip,
    "cancel_trip": tool_cancel_trip,
    "log_maintenance": tool_log_maintenance,
    "log_fuel": tool_log_fuel,
    "log_expense": tool_log_expense,
    "analytics_summary": tool_analytics_summary,
}

TOOL_SCHEMAS = [
    {"type": "function", "function": {
        "name": "list_vehicles", "description": "List vehicles in the fleet, optionally filtered by status or type.",
        "parameters": {"type": "object", "properties": {
            "status": {"type": "string", "enum": ["Available", "On Trip", "In Shop", "Retired"]},
            "type": {"type": "string"},
        }},
    }},
    {"type": "function", "function": {
        "name": "list_drivers", "description": "List drivers, optionally filtered by status.",
        "parameters": {"type": "object", "properties": {
            "status": {"type": "string", "enum": ["Available", "On Trip", "Off Duty", "Suspended"]},
        }},
    }},
    {"type": "function", "function": {
        "name": "list_trips", "description": "List trips, optionally filtered by status.",
        "parameters": {"type": "object", "properties": {
            "status": {"type": "string", "enum": ["Draft", "Dispatched", "Completed", "Cancelled"]},
        }},
    }},
    {"type": "function", "function": {
        "name": "create_vehicle", "description": "Register a new vehicle in the fleet.",
        "parameters": {"type": "object", "properties": {
            "reg_no": {"type": "string"}, "name": {"type": "string"}, "type": {"type": "string"},
            "max_load_kg": {"type": "number"}, "acquisition_cost": {"type": "number"},
            "region": {"type": "string"},
        }, "required": ["reg_no", "name", "type", "max_load_kg"]},
    }},
    {"type": "function", "function": {
        "name": "create_driver", "description": "Register a new driver.",
        "parameters": {"type": "object", "properties": {
            "name": {"type": "string"}, "license_no": {"type": "string"},
            "license_category": {"type": "string", "enum": ["LMV", "HMV"]},
            "license_expiry": {"type": "string", "description": "YYYY-MM-DD"},
            "contact": {"type": "string"},
        }, "required": ["name", "license_no", "license_category", "license_expiry"]},
    }},
    {"type": "function", "function": {
        "name": "create_trip", "description": "Create a new draft trip between two cities using a vehicle and driver (match by name or reg number).",
        "parameters": {"type": "object", "properties": {
            "source": {"type": "string"}, "destination": {"type": "string"},
            "vehicle": {"type": "string", "description": "Vehicle name or registration number"},
            "driver": {"type": "string", "description": "Driver name"},
            "cargo_weight_kg": {"type": "number"}, "planned_distance_km": {"type": "number"},
        }, "required": ["source", "destination", "vehicle", "driver", "cargo_weight_kg", "planned_distance_km"]},
    }},
    {"type": "function", "function": {
        "name": "dispatch_trip", "description": "Dispatch a Draft trip (assigns vehicle/driver as On Trip).",
        "parameters": {"type": "object", "properties": {"trip_no": {"type": "string"}}, "required": ["trip_no"]},
    }},
    {"type": "function", "function": {
        "name": "complete_trip", "description": "Mark a Dispatched trip Completed and log fuel consumption/revenue.",
        "parameters": {"type": "object", "properties": {
            "trip_no": {"type": "string"}, "final_odometer_km": {"type": "number"},
            "fuel_consumed_l": {"type": "number"}, "fuel_cost": {"type": "number"}, "revenue": {"type": "number"},
        }, "required": ["trip_no", "final_odometer_km", "fuel_consumed_l"]},
    }},
    {"type": "function", "function": {
        "name": "cancel_trip", "description": "Cancel a Draft or Dispatched trip.",
        "parameters": {"type": "object", "properties": {
            "trip_no": {"type": "string"}, "reason": {"type": "string"},
        }, "required": ["trip_no"]},
    }},
    {"type": "function", "function": {
        "name": "log_maintenance", "description": "Open or log a maintenance record for a vehicle (Active status puts the vehicle In Shop).",
        "parameters": {"type": "object", "properties": {
            "vehicle": {"type": "string"}, "service_type": {"type": "string"}, "cost": {"type": "number"},
            "service_date": {"type": "string", "description": "YYYY-MM-DD"},
            "status": {"type": "string", "enum": ["Active", "Completed"]},
        }, "required": ["vehicle", "service_type", "cost"]},
    }},
    {"type": "function", "function": {
        "name": "log_fuel", "description": "Log a standalone fuel purchase for a vehicle.",
        "parameters": {"type": "object", "properties": {
            "vehicle": {"type": "string"}, "liters": {"type": "number"}, "cost": {"type": "number"},
            "log_date": {"type": "string", "description": "YYYY-MM-DD"},
        }, "required": ["vehicle", "liters", "cost"]},
    }},
    {"type": "function", "function": {
        "name": "log_expense", "description": "Log a toll/misc/other expense for a vehicle.",
        "parameters": {"type": "object", "properties": {
            "vehicle": {"type": "string"}, "category": {"type": "string", "enum": ["toll", "misc", "other"]},
            "amount": {"type": "number"}, "log_date": {"type": "string", "description": "YYYY-MM-DD"},
        }, "required": ["vehicle", "category", "amount"]},
    }},
    {"type": "function", "function": {
        "name": "analytics_summary", "description": "Get fleet-wide analytics: fuel efficiency, utilization, cost, per-vehicle ROI.",
        "parameters": {"type": "object", "properties": {}},
    }},
]

SYSTEM_PROMPT = """You are the TransitOps assistant, embedded in a fleet/transport-ops platform.
You can look up and modify real data (vehicles, drivers, trips, maintenance, fuel, expenses) using the
provided tools, exactly as a human user with the current role would through the app's UI.

Rules:
- Always use tools to answer questions about live data or to perform actions - never guess or fabricate data.
- If a tool returns an "error" field, that means the action is blocked (either by business rules or by the
  user's role permissions). Explain the error plainly to the user; do not retry the same action a different way
  to work around a permissions error.
- Confirm the outcome of actions clearly and concisely (what changed, IDs/trip numbers involved).
- Be concise. Use plain language, not raw JSON, when replying to the user.
- Formatting: do NOT use markdown tables (no "|" pipe tables). The chat UI cannot render them. When listing
  multiple items, use a simple line-per-item list instead, e.g. "- Truck-011 (UP-78-YP-3730, East, 8,103 km)".
  Bold (**text**) and short bullet lists are fine.
"""


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest, user: CurrentUser = Depends(get_current_user)):
    client = _get_client()

    role_summary = f"The current user is '{user.name}' with role '{user.role}'. " \
                    f"Their module access is: {json.dumps(ROLE_PERMISSIONS.get(user.role, {}))}."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + "\n" + role_summary},
    ] + [{"role": m.role, "content": m.content} for m in body.messages]

    actions_taken = []

    for _ in range(6):
        try:
            completion = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=messages,
                tools=TOOL_SCHEMAS,
                tool_choice="auto",
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Chat model request failed: {exc}")

        msg = completion.choices[0].message
        tool_calls = getattr(msg, "tool_calls", None)

        if not tool_calls:
            return ChatResponse(reply=msg.content or "", actions=actions_taken)

        messages.append({"role": "assistant", "content": msg.content or "", "tool_calls": [
            {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
            for tc in tool_calls
        ]})

        for tc in tool_calls:
            fn_name = tc.function.name
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}

            impl = TOOL_IMPLS.get(fn_name)
            if not impl:
                result = {"error": f"Unknown tool '{fn_name}'"}
            else:
                try:
                    result = impl(user, **args)
                except Exception as exc:
                    result = {"error": str(exc)}

            actions_taken.append({"tool": fn_name, "args": args, "result": result})
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result, default=str),
            })

    return ChatResponse(reply="I've made several changes but hit the step limit - please check the results or ask me to continue.", actions=actions_taken)
