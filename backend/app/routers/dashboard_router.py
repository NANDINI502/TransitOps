from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.auth import CurrentUser, require_module_access
from app.core.firebase import db
from app.utils.firestore_helpers import doc_to_dict

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _filtered_vehicles(type: Optional[str], status: Optional[str], region: Optional[str]):
    query = db.collection("vehicles")
    if type:
        query = query.where("type", "==", type)
    if status:
        query = query.where("status", "==", status)
    if region:
        query = query.where("region", "==", region)
    return [doc_to_dict(d) for d in query.stream()]


@router.get("/kpis")
def get_kpis(
    type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    user: CurrentUser = Depends(require_module_access("fleet", "view")),
):
    vehicles = _filtered_vehicles(type, status, region)

    active_vehicles = [v for v in vehicles if v.get("status") != "Retired"]
    available_vehicles = [v for v in vehicles if v.get("status") == "Available"]
    vehicles_in_maintenance = [v for v in vehicles if v.get("status") == "In Shop"]
    on_trip_vehicles = [v for v in vehicles if v.get("status") == "On Trip"]

    trips = [doc_to_dict(d) for d in db.collection("trips").stream()]
    active_trips = [t for t in trips if t.get("status") == "Dispatched"]
    pending_trips = [t for t in trips if t.get("status") == "Draft"]

    drivers_on_duty = [
        doc_to_dict(d) for d in db.collection("drivers").where("status", "==", "On Trip").stream()
    ]

    fleet_utilization_pct = (
        (len(on_trip_vehicles) / len(active_vehicles) * 100) if active_vehicles else 0
    )

    return {
        "active_vehicles": len(active_vehicles),
        "available_vehicles": len(available_vehicles),
        "vehicles_in_maintenance": len(vehicles_in_maintenance),
        "active_trips": len(active_trips),
        "pending_trips": len(pending_trips),
        "drivers_on_duty": len(drivers_on_duty),
        "fleet_utilization_pct": round(fleet_utilization_pct, 2),
    }


@router.get("/recent-trips")
def recent_trips(
    limit: int = Query(default=10, ge=1, le=100),
    user: CurrentUser = Depends(require_module_access("fleet", "view")),
):
    docs = (
        db.collection("trips")
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    return [doc_to_dict(d) for d in docs]


@router.get("/vehicle-status-breakdown")
def vehicle_status_breakdown(user: CurrentUser = Depends(require_module_access("fleet", "view"))):
    vehicles = [doc_to_dict(d) for d in db.collection("vehicles").stream()]
    breakdown = {"Available": 0, "On Trip": 0, "In Shop": 0, "Retired": 0}
    for v in vehicles:
        s = v.get("status")
        if s in breakdown:
            breakdown[s] += 1
        else:
            breakdown[s] = breakdown.get(s, 0) + 1
    return breakdown
