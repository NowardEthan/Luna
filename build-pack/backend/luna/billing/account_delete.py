from __future__ import annotations

from typing import Any

from ..auth.firebase import _ensure_app
from .plan_updater import _firestore

_USERS = "users"

# Subcoleções conhecidas em users/{uid} (firestore.rules)
_USER_SUBCOLLECTIONS = (
    "conversations",
    "memoryNotes",
    "settings",
    "usage",
    "pluginInstalls",
    "marketplacePublications",
    "byok",
    "financeAccounts",
    "financeCategories",
    "financeTransactions",
    "financeBudgets",
    "financeGoals",
    "financeRecurring",
    "financeBills",
    "financeCreditCards",
    "financePiggyBanks",
    "financePiggyBankTx",
    "financeTags",
    "financeNotifications",
    "financeMeta",
)


def _delete_document_tree(doc_ref) -> None:  # type: ignore[no-untyped-def]
    for sub in doc_ref.collections():
        _delete_collection(sub)
    doc_ref.delete()


def _delete_collection(coll_ref, *, batch_size: int = 80) -> None:  # type: ignore[no-untyped-def]
    while True:
        docs = list(coll_ref.limit(batch_size).stream())
        if not docs:
            break
        for snap in docs:
            _delete_document_tree(snap.reference)


def delete_lunar_account(uid: str) -> dict[str, Any]:
    if not uid:
        raise ValueError("uid obrigatório")
    if not _ensure_app():
        raise RuntimeError("Firebase Admin não configurado.")

    from firebase_admin import auth

    db = _firestore()
    user_ref = db.collection(_USERS).document(uid)

    for name in _USER_SUBCOLLECTIONS:
        _delete_collection(user_ref.collection(name))

    user_ref.delete()

    try:
        auth.delete_user(uid)
    except auth.UserNotFoundError:
        pass

    return {"ok": True, "uid": uid, "deleted": True}
