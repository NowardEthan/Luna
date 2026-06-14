from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request

from ..log_buffer import append_log
from .asaas import get_customer, get_subscription
from .config import (
    allow_unauthenticated_webhooks,
    webhook_auth_enabled,
    ASAAS_WEBHOOK_TOKEN,
)
from .plan_mapping import (
    is_credit_pack_reference,
    is_luna_billing_charge,
    parse_external_reference,
    resolve_plan_from_payment,
)
from .plan_updater import find_uid_by_email, set_billing_status, update_user_plan
from .usage_bonus import add_bonus_turns

ACTIVATE_EVENTS = frozenset(
    {
        "PAYMENT_CONFIRMED",
        "PAYMENT_RECEIVED",
    }
)
OVERDUE_EVENTS = frozenset({"PAYMENT_OVERDUE"})
DOWNGRADE_EVENTS = frozenset(
    {
        "PAYMENT_DELETED",
        "SUBSCRIPTION_DELETED",
        "SUBSCRIPTION_INACTIVATED",
    }
)


def verify_webhook_request(request: Request) -> None:
    if not webhook_auth_enabled():
        if allow_unauthenticated_webhooks():
            append_log("warn", "billing", "Webhook Asaas sem ASAAS_WEBHOOK_TOKEN (dev).")
            return
        raise HTTPException(
            status_code=503,
            detail="ASAAS_WEBHOOK_TOKEN não configurado.",
        )
    token = (
        request.headers.get("asaas-access-token")
        or request.headers.get("Asaas-Access-Token")
        or ""
    ).strip()
    if token != ASAAS_WEBHOOK_TOKEN:
        raise HTTPException(status_code=401, detail="Token de webhook inválido.")


async def resolve_uid_from_payload(
    payment: dict[str, Any],
    subscription: dict[str, Any] | None,
) -> str | None:
    for source in (payment, subscription or {}):
        ref = parse_external_reference(
            str(source.get("externalReference") or "") or None
        )
        if ref and ref.get("uid"):
            return ref["uid"]

    customer_id = str(
        payment.get("customer")
        or (subscription or {}).get("customer")
        or ""
    )
    if customer_id:
        customer = await get_customer(customer_id)
        if customer:
            ref = parse_external_reference(
                str(customer.get("externalReference") or "") or None
            )
            if ref and ref.get("uid"):
                return ref["uid"]
            email = str(customer.get("email") or "")
            uid = find_uid_by_email(email)
            if uid:
                return uid
    return None


async def handle_asaas_webhook(body: dict[str, Any]) -> dict[str, Any]:
    event = str(body.get("event") or "").strip()
    payment = body.get("payment") if isinstance(body.get("payment"), dict) else {}
    subscription = (
        body.get("subscription")
        if isinstance(body.get("subscription"), dict)
        else None
    )

    if not event:
        return {"ok": False, "error": "evento ausente"}

    sub_id = str(
        payment.get("subscription")
        or (subscription or {}).get("id")
        or ""
    )
    if sub_id and not subscription:
        subscription = await get_subscription(sub_id)

    if event in ACTIVATE_EVENTS | OVERDUE_EVENTS | DOWNGRADE_EVENTS:
        if not is_luna_billing_charge(payment, subscription=subscription):
            append_log("info", "billing", f"Asaas {event}: ignorado (nao e cobranca Luna)")
            return {
                "ok": True,
                "ignored": True,
                "reason": "not_luna_billing",
                "event": event,
            }

    uid = await resolve_uid_from_payload(payment, subscription)
    if not uid:
        append_log("warn", "billing", f"Asaas {event}: uid não resolvido")
        return {"ok": False, "error": "uid não encontrado", "event": event}

    if event in ACTIVATE_EVENTS:
        ext_ref = str(payment.get("externalReference") or "")
        if is_credit_pack_reference(ext_ref):
            uid_pack = (parse_external_reference(ext_ref) or {}).get("uid")
            if uid_pack:
                result = add_bonus_turns(uid_pack)
                append_log(
                    "ok",
                    "billing",
                    f"{event} credit_pack -> {uid_pack} +{result.get('added')}",
                )
                return {
                    "ok": True,
                    "uid": uid_pack,
                    "event": event,
                    "creditPack": True,
                    "bonusTurns": result.get("bonusTurns"),
                }

        plan_id, period = resolve_plan_from_payment(payment, subscription=subscription)
        if not plan_id:
            append_log(
                "warn",
                "billing",
                f"Asaas {event}: plano não inferido para {uid}",
            )
            return {"ok": False, "error": "plano não identificado", "event": event}

        billing_extra: dict[str, Any] = {
            "status": "active",
            "period": period or "monthly",
            "asaasCustomerId": payment.get("customer")
            or (subscription or {}).get("customer"),
            "asaasSubscriptionId": sub_id or None,
            "value": payment.get("value") or (subscription or {}).get("value"),
            "nextDueDate": (subscription or {}).get("nextDueDate")
            or payment.get("dueDate"),
            "lastEvent": event,
        }
        update_user_plan(uid, plan_id=plan_id, billing_patch=billing_extra)
        append_log("ok", "billing", f"{event} -> {uid} plan={plan_id}")
        return {"ok": True, "uid": uid, "plan": plan_id, "event": event}

    if event in OVERDUE_EVENTS:
        set_billing_status(
            uid,
            status="overdue",
            event=event,
            extra={
                "asaasSubscriptionId": sub_id or None,
                "nextDueDate": payment.get("dueDate"),
            },
        )
        append_log("warn", "billing", f"{event} -> {uid} overdue")
        return {"ok": True, "uid": uid, "status": "overdue", "event": event}

    if event in DOWNGRADE_EVENTS:
        update_user_plan(
            uid,
            plan_id="free",
            billing_patch={
                "status": "cancelled",
                "lastEvent": event,
                "asaasSubscriptionId": sub_id or None,
            },
        )
        append_log("ok", "billing", f"{event} -> {uid} plan=free")
        return {"ok": True, "uid": uid, "plan": "free", "event": event}

    append_log("info", "billing", f"Asaas evento ignorado: {event}")
    return {"ok": True, "ignored": True, "event": event}
