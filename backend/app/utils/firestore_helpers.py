from datetime import datetime, timezone
from typing import Any, Dict, Optional

from firebase_admin import firestore
from google.cloud.firestore_v1 import DocumentSnapshot

from app.core.firebase import db


def doc_to_dict(doc: DocumentSnapshot) -> Dict[str, Any]:
    data = doc.to_dict() or {}
    data["id"] = doc.id
    return data


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def next_trip_no() -> str:
    counter_ref = db.collection("meta").document("counters")

    @firestore.transactional
    def _bump(transaction):
        snapshot = counter_ref.get(transaction=transaction)
        current = 0
        if snapshot.exists:
            current = (snapshot.to_dict() or {}).get("trip_seq", 0)
        new_val = current + 1
        transaction.set(counter_ref, {"trip_seq": new_val}, merge=True)
        return new_val

    transaction = db.transaction()
    seq = _bump(transaction)
    return f"TR{seq:03d}"


def check_unique_reg_no(reg_no: str, exclude_id: Optional[str] = None) -> bool:
    query = db.collection("vehicles").where("reg_no", "==", reg_no).stream()
    for doc in query:
        if exclude_id is None or doc.id != exclude_id:
            return False
    return True
