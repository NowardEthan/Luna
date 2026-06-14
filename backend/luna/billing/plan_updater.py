from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ..auth.firebase import _ensure_app
from .plan_mapping import entitlements_for_plan, is_valid_plan_id

_USERS = "users"


def _firestore():
    if not _ensure_app():
        raise RuntimeError("Firebase Admin não configurado (FIREBASE_SERVICE_ACCOUNT_PATH).")
    from firebase_admin import firestore

    return firestore.client()


def find_uid_by_email(email: str) -> str | None:
    if not email or "@" not in email:
        return None
    db = _firestore()
    snaps = (
        db.collection(_USERS)
        .where("email", "==", email.strip().lower())
        .limit(1)
        .stream()
    )
    for snap in snaps:
        return snap.id
    snaps = (
        db.collection(_USERS)
        .where("email", "==", email.strip())
        .limit(1)
        .stream()
    )
    for snap in snaps:
        return snap.id
    return None


def update_user_plan(
    uid: str,
    *,
    plan_id: str,
    billing_patch: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not is_valid_plan_id(plan_id):
        raise ValueError(f"Plano inválido: {plan_id}")

    from firebase_admin import firestore

    db = _firestore()
    ref = db.collection(_USERS).document(uid)
    now = datetime.now(timezone.utc).isoformat()

    payload: dict[str, Any] = {
        "plan": plan_id,
        "entitlements": entitlements_for_plan(plan_id),
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    if billing_patch:
        merged = {**billing_patch, "updatedAt": now}
        payload["billing"] = merged

    ref.set(payload, merge=True)
    return {"ok": True, "uid": uid, "plan": plan_id}


def set_billing_status(
    uid: str,
    *,
    status: str,
    event: str,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from firebase_admin import firestore

    db = _firestore()
    ref = db.collection(_USERS).document(uid)
    now = datetime.now(timezone.utc).isoformat()
    billing: dict[str, Any] = {
        "status": status,
        "lastEvent": event,
        "lastEventAt": now,
        "updatedAt": now,
    }
    if extra:
        billing.update(extra)
    ref.set(
        {
            "billing": billing,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    return {"ok": True, "uid": uid, "status": status}
