import csv
import io
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.core.auth import CurrentUser, require_module_access
from app.core.firebase import db
from app.utils.firestore_helpers import doc_to_dict

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _vehicle_cost_breakdown():
    vehicles = [doc_to_dict(d) for d in db.collection("vehicles").stream()]
    breakdown = {
        v["id"]: {
            "fuel_cost": 0.0,
            "maintenance_cost": 0.0,
            "expenses_cost": 0.0,
            "revenue": 0.0,
            "vehicle": v,
        }
        for v in vehicles
    }

    for d in db.collection("fuel_logs").stream():
        data = d.to_dict() or {}
        vid = data.get("vehicle_id")
        if vid in breakdown:
            breakdown[vid]["fuel_cost"] += data.get("cost", 0) or 0

    for d in db.collection("maintenance_logs").stream():
        data = d.to_dict() or {}
        vid = data.get("vehicle_id")
        if vid in breakdown:
            breakdown[vid]["maintenance_cost"] += data.get("cost", 0) or 0

    for d in db.collection("expenses").stream():
        data = d.to_dict() or {}
        vid = data.get("vehicle_id")
        if vid in breakdown:
            breakdown[vid]["expenses_cost"] += data.get("amount", 0) or 0

    for d in db.collection("trips").where("status", "==", "Completed").stream():
        data = d.to_dict() or {}
        vid = data.get("vehicle_id")
        if vid in breakdown:
            breakdown[vid]["revenue"] += data.get("revenue", 0) or 0

    return breakdown


@router.get("/summary")
def analytics_summary(user: CurrentUser = Depends(require_module_access("analytics", "view"))):
    completed_trips = [doc_to_dict(d) for d in db.collection("trips").where("status", "==", "Completed").stream()]

    total_distance = sum(t.get("planned_distance_km", 0) or 0 for t in completed_trips)
    total_fuel_l = sum(t.get("fuel_consumed_l", 0) or 0 for t in completed_trips)
    fuel_efficiency_km_per_l = (total_distance / total_fuel_l) if total_fuel_l else 0

    vehicles = [doc_to_dict(d) for d in db.collection("vehicles").stream()]
    active_vehicles = [v for v in vehicles if v.get("status") != "Retired"]
    on_trip_vehicles = [v for v in vehicles if v.get("status") == "On Trip"]
    fleet_utilization_pct = (len(on_trip_vehicles) / len(active_vehicles) * 100) if active_vehicles else 0

    breakdown = _vehicle_cost_breakdown()
    total_operational_cost = sum(
        b["fuel_cost"] + b["maintenance_cost"] + b["expenses_cost"] for b in breakdown.values()
    )

    per_vehicle_roi = []
    for vid, b in breakdown.items():
        acquisition_cost = b["vehicle"].get("acquisition_cost", 0) or 0
        cost = b["fuel_cost"] + b["maintenance_cost"] + b["expenses_cost"]
        roi = ((b["revenue"] - cost) / acquisition_cost) if acquisition_cost else 0
        per_vehicle_roi.append(
            {
                "vehicle_id": vid,
                "reg_no": b["vehicle"].get("reg_no"),
                "name": b["vehicle"].get("name"),
                "revenue": b["revenue"],
                "fuel_cost": b["fuel_cost"],
                "maintenance_cost": b["maintenance_cost"],
                "expenses_cost": b["expenses_cost"],
                "total_cost": cost,
                "acquisition_cost": acquisition_cost,
                "roi": round(roi, 4),
            }
        )

    return {
        "fuel_efficiency_km_per_l": round(fuel_efficiency_km_per_l, 2),
        "fleet_utilization_pct": round(fleet_utilization_pct, 2),
        "total_operational_cost": total_operational_cost,
        "per_vehicle_roi": per_vehicle_roi,
    }


@router.get("/top-costliest-vehicles")
def top_costliest_vehicles(
    limit: int = Query(default=5, ge=1, le=50),
    user: CurrentUser = Depends(require_module_access("analytics", "view")),
):
    breakdown = _vehicle_cost_breakdown()
    rows = []
    for vid, b in breakdown.items():
        total_cost = b["fuel_cost"] + b["maintenance_cost"] + b["expenses_cost"]
        rows.append(
            {
                "vehicle_id": vid,
                "reg_no": b["vehicle"].get("reg_no"),
                "name": b["vehicle"].get("name"),
                "fuel_cost": b["fuel_cost"],
                "maintenance_cost": b["maintenance_cost"],
                "expenses_cost": b["expenses_cost"],
                "total_operational_cost": total_cost,
            }
        )
    rows.sort(key=lambda r: r["total_operational_cost"], reverse=True)
    return rows[:limit]


@router.get("/export.csv")
def export_csv(user: CurrentUser = Depends(require_module_access("analytics", "view"))):
    breakdown = _vehicle_cost_breakdown()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "vehicle_id",
            "reg_no",
            "name",
            "type",
            "region",
            "status",
            "acquisition_cost",
            "fuel_cost",
            "maintenance_cost",
            "expenses_cost",
            "total_operational_cost",
            "revenue",
            "roi",
        ]
    )

    for vid, b in breakdown.items():
        vehicle = b["vehicle"]
        total_cost = b["fuel_cost"] + b["maintenance_cost"] + b["expenses_cost"]
        acquisition_cost = vehicle.get("acquisition_cost", 0) or 0
        roi = ((b["revenue"] - total_cost) / acquisition_cost) if acquisition_cost else 0
        writer.writerow(
            [
                vid,
                vehicle.get("reg_no"),
                vehicle.get("name"),
                vehicle.get("type"),
                vehicle.get("region"),
                vehicle.get("status"),
                acquisition_cost,
                b["fuel_cost"],
                b["maintenance_cost"],
                b["expenses_cost"],
                total_cost,
                b["revenue"],
                round(roi, 4),
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vehicle_report.csv"},
    )
