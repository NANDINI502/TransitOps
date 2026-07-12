import json
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from pydantic import BaseModel

from app.core.auth import CurrentUser, require_module_access
from app.utils.firestore_helpers import get_all_cached

router = APIRouter(prefix="/api/risk", tags=["risk"])

_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("CHAT_API_KEY")
        base_url = os.getenv("CHAT_API_BASE_URL", "https://ai.revealiq.in/api/v1")
        if not api_key:
            raise HTTPException(status_code=503, detail="Risk assistant is not configured (missing CHAT_API_KEY)")
        _client = OpenAI(api_key=api_key, base_url=base_url)
    return _client


CHAT_MODEL = os.getenv("CHAT_MODEL", "kautilya-daily")


class RiskPredictRequest(BaseModel):
    vehicle_id: str
    driver_id: str
    cargo_weight_kg: float
    planned_distance_km: float
    source: Optional[str] = None
    destination: Optional[str] = None


class RiskPredictResponse(BaseModel):
    risk_score: int
    risk_level: str
    summary: str
    factors: list[str]


SYSTEM_PROMPT = """You are a fleet risk-assessment engine for TransitOps, a transport operations platform.
Given structured data about a vehicle, its driver, and a planned trip, assess the operational risk of
dispatching this trip: likelihood of breakdown, accident, delay, or driver-related incident.

Consider: vehicle odometer and open/recent maintenance history, cargo weight vs vehicle max load,
driver safety score, license category/expiry, planned distance, and any other signal present in the data.

Respond ONLY with a JSON object matching this exact shape, no markdown, no extra text:
{
  "risk_score": <integer 0-100, 0 = negligible risk, 100 = extremely high risk>,
  "risk_level": "<one of: Low, Medium, High, Critical>",
  "summary": "<one sentence, plain language, explaining the overall risk verdict>",
  "factors": ["<short factor 1>", "<short factor 2>", ...]
}
List 2-5 factors, most significant first. Be specific and reference actual numbers from the data given.
"""


def _build_context(vehicle: dict, driver: dict, maintenance_logs: list[dict], body: RiskPredictRequest) -> str:
    vehicle_maintenance = [m for m in maintenance_logs if m.get("vehicle_id") == vehicle.get("id")]
    open_maintenance = [m for m in vehicle_maintenance if m.get("status") == "Active"]
    recent_maintenance = sorted(vehicle_maintenance, key=lambda m: m.get("date", ""), reverse=True)[:5]

    payload = {
        "trip": {
            "source": body.source,
            "destination": body.destination,
            "cargo_weight_kg": body.cargo_weight_kg,
            "planned_distance_km": body.planned_distance_km,
        },
        "vehicle": {
            "reg_no": vehicle.get("reg_no"),
            "name": vehicle.get("name"),
            "type": vehicle.get("type"),
            "status": vehicle.get("status"),
            "odometer_km": vehicle.get("odometer_km"),
            "max_load_kg": vehicle.get("max_load_kg"),
            "cargo_to_capacity_pct": round(100 * body.cargo_weight_kg / vehicle.get("max_load_kg", 1), 1)
            if vehicle.get("max_load_kg") else None,
            "open_maintenance_count": len(open_maintenance),
            "recent_maintenance": [
                {"service_type": m.get("service_type"), "date": m.get("date"), "status": m.get("status")}
                for m in recent_maintenance
            ],
        },
        "driver": {
            "name": driver.get("name"),
            "status": driver.get("status"),
            "safety_score": driver.get("safety_score"),
            "license_category": driver.get("license_category"),
            "license_expiry": driver.get("license_expiry"),
        },
    }
    return json.dumps(payload, default=str)


@router.post("/predict-trip", response_model=RiskPredictResponse)
def predict_trip_risk(
    body: RiskPredictRequest,
    user: CurrentUser = Depends(require_module_access("trips", "view")),
):
    vehicles = {v["id"]: v for v in get_all_cached("vehicles")}
    drivers = {d["id"]: d for d in get_all_cached("drivers")}
    vehicle = vehicles.get(body.vehicle_id)
    driver = drivers.get(body.driver_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    maintenance_logs = get_all_cached("maintenance_logs")
    context = _build_context(vehicle, driver, maintenance_logs, body)

    client = _get_client()
    try:
        completion = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": context},
            ],
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Risk model request failed: {exc}")

    raw = completion.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Risk model returned an unparseable response")

    try:
        return RiskPredictResponse(
            risk_score=int(parsed["risk_score"]),
            risk_level=str(parsed["risk_level"]),
            summary=str(parsed["summary"]),
            factors=[str(f) for f in parsed.get("factors", [])],
        )
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status_code=502, detail="Risk model returned an incomplete response")
