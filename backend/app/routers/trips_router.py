from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from firebase_admin import firestore

from app.core.auth import CurrentUser, require_module_access
from app.core.firebase import db
from app.models.schemas import (
    TripCancelRequest,
    TripCompleteRequest,
    TripCreate,
    TripDispatchRequest,
    TripOut,
)
from app.utils.firestore_helpers import doc_to_dict, next_trip_no, utcnow_iso

router = APIRouter(prefix="/api/trips", tags=["trips"])


def license_ok(expiry: Optional[str]) -> bool:
    if not expiry:
        return False
    try:
        return date.fromisoformat(expiry) >= date.today()
    except ValueError:
        return False


def fetch_vehicle(vehicle_id: str):
    doc = db.collection("vehicles").document(vehicle_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")
    return doc_to_dict(doc)


def fetch_driver(driver_id: str):
    doc = db.collection("drivers").document(driver_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Driver '{driver_id}' not found")
    return doc_to_dict(doc)


def check_cargo_fits(cargo_weight_kg: float, vehicle: dict):
    max_load = vehicle.get("max_load_kg", 0)
    if cargo_weight_kg <= max_load:
        return
    exceeded_by = cargo_weight_kg - max_load
    raise HTTPException(
        status_code=400,
        detail=f"Capacity exceeded by {exceeded_by:g} kg - dispatch blocked "
        f"(vehicle capacity: {max_load:g} kg, cargo weight: {cargo_weight_kg:g} kg)",
    )


def check_driver_can_dispatch(driver: dict):
    name = driver.get("name")
    if driver.get("status") == "Suspended":
        raise HTTPException(status_code=400, detail=f"Driver '{name}' is suspended and cannot be assigned")
    if not license_ok(driver.get("license_expiry")):
        raise HTTPException(
            status_code=400,
            detail=f"Driver '{name}' has an expired or missing license (expiry: {driver.get('license_expiry')})",
        )
    if driver.get("status") == "On Trip":
        raise HTTPException(status_code=400, detail=f"Driver '{name}' is already on another trip")


def check_vehicle_can_dispatch(vehicle: dict):
    reg_no = vehicle.get("reg_no")
    status = vehicle.get("status")
    if status == "Retired":
        raise HTTPException(status_code=400, detail=f"Vehicle '{reg_no}' is retired and cannot be dispatched")
    if status == "In Shop":
        raise HTTPException(status_code=400, detail=f"Vehicle '{reg_no}' is in the shop and cannot be dispatched")
    if status == "On Trip":
        raise HTTPException(status_code=400, detail=f"Vehicle '{reg_no}' is already on another trip")


@router.get("", response_model=list[TripOut])
def list_trips(
    status: Optional[str] = Query(default=None),
    user: CurrentUser = Depends(require_module_access("trips", "view")),
):
    query = db.collection("trips")
    if status:
        query = query.where("status", "==", status)
    return [doc_to_dict(d) for d in query.stream()]


@router.post("", response_model=TripOut, status_code=201)
def create_trip(body: TripCreate, user: CurrentUser = Depends(require_module_access("trips", "full"))):
    vehicle = fetch_vehicle(body.vehicle_id)
    driver = fetch_driver(body.driver_id)
    check_cargo_fits(body.cargo_weight_kg, vehicle)

    data = body.model_dump()
    data.update(
        status="Draft",
        trip_no=next_trip_no(),
        dispatched_at=None,
        completed_at=None,
        final_odometer_km=None,
        fuel_consumed_l=None,
        revenue=0,
        created_at=utcnow_iso(),
    )

    _, ref = db.collection("trips").add(data)
    return doc_to_dict(ref.get())


@router.get("/{trip_id}", response_model=TripOut)
def get_trip(trip_id: str, user: CurrentUser = Depends(require_module_access("trips", "view"))):
    doc = db.collection("trips").document(trip_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Trip not found")
    return doc_to_dict(doc)


@router.post("/{trip_id}/dispatch", response_model=TripOut)
def dispatch_trip(
    trip_id: str,
    body: TripDispatchRequest = TripDispatchRequest(),
    user: CurrentUser = Depends(require_module_access("trips", "full")),
):
    trip_ref = db.collection("trips").document(trip_id)
    trip_doc = trip_ref.get()
    if not trip_doc.exists:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = doc_to_dict(trip_doc)

    if trip["status"] != "Draft":
        raise HTTPException(status_code=400, detail=f"Only Draft trips can be dispatched (current status: {trip['status']})")

    vehicle_ref = db.collection("vehicles").document(trip["vehicle_id"])
    driver_ref = db.collection("drivers").document(trip["driver_id"])

    vehicle_doc = vehicle_ref.get()
    driver_doc = driver_ref.get()
    if not vehicle_doc.exists:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if not driver_doc.exists:
        raise HTTPException(status_code=404, detail="Driver not found")

    vehicle = doc_to_dict(vehicle_doc)
    driver = doc_to_dict(driver_doc)
    check_vehicle_can_dispatch(vehicle)
    check_driver_can_dispatch(driver)
    check_cargo_fits(trip["cargo_weight_kg"], vehicle)

    txn = db.transaction()

    @firestore.transactional
    def run(t):
        v_data = vehicle_ref.get(transaction=t).to_dict() or {}
        d_data = driver_ref.get(transaction=t).to_dict() or {}
        t_data = trip_ref.get(transaction=t).to_dict() or {}

        if t_data.get("status") != "Draft":
            raise HTTPException(status_code=400, detail="Trip is no longer in Draft status")
        if v_data.get("status") != "Available":
            raise HTTPException(status_code=400, detail=f"Vehicle status changed to '{v_data.get('status')}' - cannot dispatch")
        if d_data.get("status") != "Available":
            raise HTTPException(status_code=400, detail=f"Driver status changed to '{d_data.get('status')}' - cannot dispatch")

        now = utcnow_iso()
        t.update(vehicle_ref, {"status": "On Trip"})
        t.update(driver_ref, {"status": "On Trip"})
        t.update(trip_ref, {"status": "Dispatched", "dispatched_at": now})

    run(txn)
    return doc_to_dict(trip_ref.get())


@router.post("/{trip_id}/complete", response_model=TripOut)
def complete_trip(
    trip_id: str, body: TripCompleteRequest, user: CurrentUser = Depends(require_module_access("trips", "full"))
):
    trip_ref = db.collection("trips").document(trip_id)
    trip_doc = trip_ref.get()
    if not trip_doc.exists:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = doc_to_dict(trip_doc)

    if trip["status"] != "Dispatched":
        raise HTTPException(
            status_code=400, detail=f"Only Dispatched trips can be completed (current status: {trip['status']})"
        )

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
        t.update(vehicle_ref, {"status": "Available", "odometer_km": body.final_odometer_km})
        t.update(driver_ref, {"status": "Available"})
        t.update(
            trip_ref,
            {
                "status": "Completed",
                "completed_at": now,
                "final_odometer_km": body.final_odometer_km,
                "fuel_consumed_l": body.fuel_consumed_l,
                "revenue": body.revenue or 0,
            },
        )
        t.set(
            fuel_log_ref,
            {
                "vehicle_id": trip["vehicle_id"],
                "trip_id": trip_id,
                "liters": body.fuel_consumed_l,
                "cost": body.fuel_cost or 0,
                "date": date.today().isoformat(),
                "created_at": now,
            },
        )

    run(txn)
    return doc_to_dict(trip_ref.get())


@router.post("/{trip_id}/cancel", response_model=TripOut)
def cancel_trip(
    trip_id: str,
    body: TripCancelRequest = TripCancelRequest(),
    user: CurrentUser = Depends(require_module_access("trips", "full")),
):
    trip_ref = db.collection("trips").document(trip_id)
    trip_doc = trip_ref.get()
    if not trip_doc.exists:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = doc_to_dict(trip_doc)

    if trip["status"] not in ("Draft", "Dispatched"):
        raise HTTPException(
            status_code=400, detail=f"Only Draft or Dispatched trips can be cancelled (current status: {trip['status']})"
        )

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

    run(txn)
    return doc_to_dict(trip_ref.get())
