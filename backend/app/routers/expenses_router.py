from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import CurrentUser, require_module_access
from app.core.firebase import db
from app.models.schemas import ExpenseCreate, ExpenseOut
from app.utils.firestore_helpers import doc_to_dict, get_all_cached, invalidate_cache, utcnow_iso

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    vehicle_id: Optional[str] = Query(default=None),
    trip_id: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    user: CurrentUser = Depends(require_module_access("fuel_expenses", "view")),
):
    docs = get_all_cached("expenses")
    if vehicle_id:
        docs = [d for d in docs if d.get("vehicle_id") == vehicle_id]
    if trip_id:
        docs = [d for d in docs if d.get("trip_id") == trip_id]
    if category:
        docs = [d for d in docs if d.get("category") == category]
    return docs


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(body: ExpenseCreate, user: CurrentUser = Depends(require_module_access("fuel_expenses", "full"))):
    vehicle_doc = db.collection("vehicles").document(body.vehicle_id).get()
    if not vehicle_doc.exists:
        raise HTTPException(status_code=404, detail=f"Vehicle '{body.vehicle_id}' not found")

    data = body.model_dump()
    data["created_at"] = utcnow_iso()
    _, ref = db.collection("expenses").add(data)
    invalidate_cache("expenses")
    return doc_to_dict(ref.get())
