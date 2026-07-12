from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import CurrentUser, require_module_access
from app.core.firebase import db
from app.models.schemas import VehicleCreate, VehicleOut, VehicleUpdate
from app.utils.firestore_helpers import check_unique_reg_no, doc_to_dict, utcnow_iso

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


@router.get("", response_model=list[VehicleOut])
def list_vehicles(
    type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    dispatchable: bool = Query(default=False),
    user: CurrentUser = Depends(require_module_access("fleet", "view")),
):
    query = db.collection("vehicles")
    if type:
        query = query.where("type", "==", type)
    if region:
        query = query.where("region", "==", region)

    if dispatchable:
        query = query.where("status", "==", "Available")
    elif status:
        query = query.where("status", "==", status)

    docs = query.stream()
    return [doc_to_dict(d) for d in docs]


@router.post("", response_model=VehicleOut, status_code=201)
def create_vehicle(body: VehicleCreate, user: CurrentUser = Depends(require_module_access("fleet", "full"))):
    if not check_unique_reg_no(body.reg_no):
        raise HTTPException(status_code=400, detail=f"Vehicle with reg_no '{body.reg_no}' already exists")

    data = body.model_dump()
    data["created_at"] = utcnow_iso()
    _, ref = db.collection("vehicles").add(data)
    return doc_to_dict(ref.get())


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(vehicle_id: str, user: CurrentUser = Depends(require_module_access("fleet", "view"))):
    doc = db.collection("vehicles").document(vehicle_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return doc_to_dict(doc)


@router.patch("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: str, body: VehicleUpdate, user: CurrentUser = Depends(require_module_access("fleet", "full"))
):
    ref = db.collection("vehicles").document(vehicle_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "reg_no" in updates and not check_unique_reg_no(updates["reg_no"], exclude_id=vehicle_id):
        raise HTTPException(status_code=400, detail=f"Vehicle with reg_no '{updates['reg_no']}' already exists")

    if updates:
        ref.update(updates)
    return doc_to_dict(ref.get())


@router.delete("/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: str, user: CurrentUser = Depends(require_module_access("fleet", "full"))):
    ref = db.collection("vehicles").document(vehicle_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    ref.delete()
    return None


@router.get("/{vehicle_id}/operational-cost")
def vehicle_operational_cost(
    vehicle_id: str, user: CurrentUser = Depends(require_module_access("fleet", "view"))
):
    ref = db.collection("vehicles").document(vehicle_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    fuel_cost = sum(
        (d.to_dict() or {}).get("cost", 0) for d in db.collection("fuel_logs").where("vehicle_id", "==", vehicle_id).stream()
    )
    maintenance_cost = sum(
        (d.to_dict() or {}).get("cost", 0)
        for d in db.collection("maintenance_logs").where("vehicle_id", "==", vehicle_id).stream()
    )
    expenses_cost = sum(
        (d.to_dict() or {}).get("amount", 0) for d in db.collection("expenses").where("vehicle_id", "==", vehicle_id).stream()
    )

    total = fuel_cost + maintenance_cost + expenses_cost
    return {
        "vehicle_id": vehicle_id,
        "fuel_cost": fuel_cost,
        "maintenance_cost": maintenance_cost,
        "expenses_cost": expenses_cost,
        "total_operational_cost": total,
    }
