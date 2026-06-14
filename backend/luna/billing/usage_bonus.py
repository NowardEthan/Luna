from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .plan_updater import _firestore

CREDIT_PACK_TURNS = 500
_USERS = "users"


def _current_month_key() -> str:
    now = datetime.now(timezone.utc)
    return f"{now.year}-{now.month:02d}"


def add_bonus_turns(uid: str, turns: int = CREDIT_PACK_TURNS) -> dict[str, Any]:
    if turns < 1:
        raise ValueError("turns deve ser positivo")

    from firebase_admin import firestore

    db = _firestore()
    month_key = _current_month_key()
    ref = db.collection(_USERS).document(uid).collection("usage").document(month_key)

    @firestore.transactional
    def _apply(transaction, doc_ref):  # type: ignore[no-untyped-def]
        snap = doc_ref.get(transaction=transaction)
        current = 0
        if snap.exists:
            data = snap.to_dict() or {}
            raw = data.get("bonusTurns")
            if isinstance(raw, int) and raw >= 0:
                current = raw
        new_total = current + turns
        payload: dict[str, Any] = {
            "bonusTurns": new_total,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        if not snap.exists:
            payload["turns"] = 0
        transaction.set(doc_ref, payload, merge=True)
        return new_total

    transaction = db.transaction()
    total = _apply(transaction, ref)
    return {"ok": True, "uid": uid, "monthKey": month_key, "bonusTurns": total, "added": turns}
