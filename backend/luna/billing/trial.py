from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from .plan_updater import _firestore, update_user_plan

TRIAL_DAYS = 7
_USERS = "users"


def _parse_iso(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw:
        return None
    try:
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        dt = datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def expire_trial_if_needed(uid: str) -> dict[str, Any]:
    db = _firestore()
    ref = db.collection(_USERS).document(uid)
    snap = ref.get()
    if not snap.exists:
        return {"ok": True, "skipped": True, "reason": "no_profile"}

    data = snap.to_dict() or {}
    billing = data.get("billing") or {}
    if billing.get("status") != "trial":
        return {"ok": True, "skipped": True, "reason": "not_on_trial"}

    trial_ends = _parse_iso(str(billing.get("trialEndsAt") or ""))
    if trial_ends and datetime.now(timezone.utc) < trial_ends:
        return {"ok": True, "active": True, "trialEndsAt": billing.get("trialEndsAt")}

    update_user_plan(
        uid,
        plan_id="free",
        billing_patch={
            "status": "expired",
            "trialEndsAt": billing.get("trialEndsAt"),
            "trialUsed": True,
            "lastEvent": "TRIAL_EXPIRED",
        },
    )
    return {"ok": True, "expired": True}


def start_trial_if_eligible(uid: str) -> dict[str, Any]:
    expire_trial_if_needed(uid)

    db = _firestore()
    ref = db.collection(_USERS).document(uid)
    snap = ref.get()
    data = snap.to_dict() if snap.exists else {}

    plan = str(data.get("plan") or "free")
    billing = data.get("billing") or {}

    if billing.get("trialUsed"):
        return {"ok": True, "skipped": True, "reason": "trial_used"}

    if billing.get("asaasSubscriptionId"):
        return {"ok": True, "skipped": True, "reason": "has_subscription"}

    if billing.get("status") == "active":
        return {"ok": True, "skipped": True, "reason": "paid_active"}

    if plan not in ("free",):
        return {"ok": True, "skipped": True, "reason": f"plan_{plan}"}

    if billing.get("status") == "trial":
        return {
            "ok": True,
            "skipped": True,
            "reason": "already_on_trial",
            "trialEndsAt": billing.get("trialEndsAt"),
        }

    ends = datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)
    update_user_plan(
        uid,
        plan_id="pro",
        billing_patch={
            "status": "trial",
            "trialEndsAt": ends.isoformat(),
            "trialUsed": True,
            "lastEvent": "TRIAL_STARTED",
        },
    )
    return {"ok": True, "started": True, "trialEndsAt": ends.isoformat()}


def sync_trial(uid: str) -> dict[str, Any]:
    expired = expire_trial_if_needed(uid)
    if expired.get("expired"):
        return expired
    started = start_trial_if_eligible(uid)
    if started.get("started"):
        return started
    return expired if expired.get("active") else started
