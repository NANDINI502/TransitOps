from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.auth import CurrentUser, require_module_access
from app.routers.trips_router import enrich_trips
from app.utils.firestore_helpers import get_all_cached

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _filtered_vehicles(type: Optional[str], status: Optional[str], region: Optional[str]):
    vehicles = get_all_cached("vehicles")
    if type:
        vehicles = [v for v in vehicles if v.get("type") == type]
    if status:
        vehicles = [v for v in vehicles if v.get("status") == status]
    if region:
        vehicles = [v for v in vehicles if v.get("region") == region]
    return vehicles


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

    trips = get_all_cached("trips")
    active_trips = [t for t in trips if t.get("status") == "Dispatched"]
    pending_trips = [t for t in trips if t.get("status") == "Draft"]

    drivers = get_all_cached("drivers")
    drivers_on_duty = [d for d in drivers if d.get("status") == "On Trip"]

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
    trips = sorted(get_all_cached("trips"), key=lambda t: t.get("created_at") or "", reverse=True)
    return enrich_trips(trips[:limit])


@router.get("/vehicle-status-breakdown")
def vehicle_status_breakdown(user: CurrentUser = Depends(require_module_access("fleet", "view"))):
    vehicles = get_all_cached("vehicles")
    breakdown = {"available": 0, "on_trip": 0, "in_shop": 0, "retired": 0}
    status_to_key = {"Available": "available", "On Trip": "on_trip", "In Shop": "in_shop", "Retired": "retired"}
    for v in vehicles:
        key = status_to_key.get(v.get("status"))
        if key:
            breakdown[key] += 1
    return breakdown
