from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import CurrentUser, require_module_access
from app.core.firebase import db
from app.models.schemas import DriverCreate, DriverOut, DriverUpdate
from app.utils.firestore_helpers import doc_to_dict, get_all_cached, invalidate_cache, utcnow_iso

router = APIRouter(prefix="/api/drivers", tags=["drivers"])


def license_ok(license_expiry: Optional[str]) -> bool:
    if not license_expiry:
        return False
    try:
        return date.fromisoformat(license_expiry) >= date.today()
    except ValueError:
        return False


@router.get("", response_model=list[DriverOut])
def list_drivers(
    status: Optional[str] = Query(default=None),
    dispatchable: bool = Query(default=False),
    user: CurrentUser = Depends(require_module_access("drivers", "view")),
):
    docs = get_all_cached("drivers")
    if not dispatchable and status:
        docs = [d for d in docs if d.get("status") == status]

    if dispatchable:
        docs = [d for d in docs if d.get("status") == "Available" and license_ok(d.get("license_expiry"))]

    return docs


@router.post("", response_model=DriverOut, status_code=201)
def create_driver(body: DriverCreate, user: CurrentUser = Depends(require_module_access("drivers", "full"))):
    data = body.model_dump()
    data["created_at"] = utcnow_iso()
    _, ref = db.collection("drivers").add(data)
    invalidate_cache("drivers")
    return doc_to_dict(ref.get())


@router.get("/{driver_id}", response_model=DriverOut)
def get_driver(driver_id: str, user: CurrentUser = Depends(require_module_access("drivers", "view"))):
    doc = db.collection("drivers").document(driver_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Driver not found")
    return doc_to_dict(doc)


@router.patch("/{driver_id}", response_model=DriverOut)
def update_driver(
    driver_id: str, body: DriverUpdate, user: CurrentUser = Depends(require_module_access("drivers", "full"))
):
    ref = db.collection("drivers").document(driver_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Driver not found")

    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        ref.update(updates)
        invalidate_cache("drivers")
    return doc_to_dict(ref.get())


@router.delete("/{driver_id}", status_code=204)
def delete_driver(driver_id: str, user: CurrentUser = Depends(require_module_access("drivers", "full"))):
    ref = db.collection("drivers").document(driver_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Driver not found")
    ref.delete()
    invalidate_cache("drivers")
    return None
