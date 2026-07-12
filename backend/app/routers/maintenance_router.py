from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from firebase_admin import firestore

from app.core.auth import CurrentUser, require_module_access
from app.core.firebase import db
from app.models.schemas import MaintenanceCreate, MaintenanceOut
from app.utils.firestore_helpers import doc_to_dict, get_all_cached, invalidate_cache, utcnow_iso

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


@router.get("", response_model=list[MaintenanceOut])
def list_maintenance(
    vehicle_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    user: CurrentUser = Depends(require_module_access("fleet", "view")),
):
    docs = get_all_cached("maintenance_logs")
    if vehicle_id:
        docs = [d for d in docs if d.get("vehicle_id") == vehicle_id]
    if status:
        docs = [d for d in docs if d.get("status") == status]
    return docs


@router.post("", response_model=MaintenanceOut, status_code=201)
def create_maintenance(body: MaintenanceCreate, user: CurrentUser = Depends(require_module_access("fleet", "full"))):
    vehicle_ref = db.collection("vehicles").document(body.vehicle_id)
    vehicle_doc = vehicle_ref.get()
    if not vehicle_doc.exists:
        raise HTTPException(status_code=404, detail=f"Vehicle '{body.vehicle_id}' not found")

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

        run(txn)
        invalidate_cache("vehicles")
    else:
        maintenance_ref.set(data)

    invalidate_cache("maintenance_logs")
    return doc_to_dict(maintenance_ref.get())


@router.post("/{maintenance_id}/complete", response_model=MaintenanceOut)
def complete_maintenance(maintenance_id: str, user: CurrentUser = Depends(require_module_access("fleet", "full"))):
    maintenance_ref = db.collection("maintenance_logs").document(maintenance_id)
    maintenance_doc = maintenance_ref.get()
    if not maintenance_doc.exists:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    maintenance = doc_to_dict(maintenance_doc)

    if maintenance["status"] != "Active":
        raise HTTPException(status_code=400, detail=f"Only Active maintenance records can be completed (current status: {maintenance['status']})")

    vehicle_ref = db.collection("vehicles").document(maintenance["vehicle_id"])

    txn = db.transaction()

    @firestore.transactional
    def run(t):
        m_data = maintenance_ref.get(transaction=t).to_dict() or {}
        if m_data.get("status") != "Active":
            raise HTTPException(status_code=400, detail="Maintenance record is no longer Active")

        v_data = vehicle_ref.get(transaction=t).to_dict() or {}
        t.update(maintenance_ref, {"status": "Completed"})

        if v_data.get("status") != "Retired":
            t.update(vehicle_ref, {"status": "Available"})

    run(txn)
    invalidate_cache("maintenance_logs")
    invalidate_cache("vehicles")
    return doc_to_dict(maintenance_ref.get())
