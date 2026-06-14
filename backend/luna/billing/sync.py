from __future__ import annotations

from typing import Any

from .asaas import (
    find_customer_by_email,
    get_payment,
    get_subscription,
    list_recent_payments,
)
from .plan_mapping import is_luna_billing_charge
from .webhook import handle_asaas_webhook

_PAID_STATUSES = frozenset({"RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"})


def _event_for_paid_status(status: str) -> str:
    if status == "CONFIRMED":
        return "PAYMENT_CONFIRMED"
    return "PAYMENT_RECEIVED"


async def _sync_payment(payment: dict[str, Any]) -> dict[str, Any]:
    status = str(payment.get("status") or "").upper()
    event = _event_for_paid_status(status)
    sub_id = str(payment.get("subscription") or "")
    subscription = await get_subscription(sub_id) if sub_id else None
    body: dict[str, Any] = {"event": event, "payment": payment}
    if subscription:
        body["subscription"] = subscription
    return await handle_asaas_webhook(body)


async def sync_user_billing_from_asaas(*, uid: str, email: str) -> dict[str, Any]:
    """Reconcilia plano no Firestore com cobranças pagas no Asaas do utilizador."""
    customer = await find_customer_by_email(email)
    if not customer:
        return {"ok": False, "error": "Cliente Asaas não encontrado para este email."}

    customer_id = str(customer.get("id") or "")
    payments = await list_recent_payments(customer_id=customer_id, limit=30)
    paid = [p for p in payments if str(p.get("status") or "").upper() in _PAID_STATUSES]
    if not paid:
        return {"ok": False, "error": "Nenhuma cobrança paga encontrada no Asaas."}

    last_result: dict[str, Any] | None = None
    for payment in paid:
        sub_id = str(payment.get("subscription") or "")
        subscription = await get_subscription(sub_id) if sub_id else None
        if not is_luna_billing_charge(payment, subscription=subscription):
            continue
        last_result = await _sync_payment(payment)
        if last_result.get("ok") and (
            last_result.get("plan") or last_result.get("creditPack")
        ):
            return last_result

    return last_result or {"ok": False, "error": "Não foi possível inferir o plano."}


async def sync_payment_by_id(payment_id: str) -> dict[str, Any]:
    payment = await get_payment(payment_id)
    if not payment:
        return {"ok": False, "error": f"Cobrança {payment_id} não encontrada."}
    status = str(payment.get("status") or "").upper()
    if status not in _PAID_STATUSES:
        return {
            "ok": False,
            "error": f"Cobrança com status {status or '?'} — aguarda RECEIVED/CONFIRMED.",
        }
    return await _sync_payment(payment)


async def sync_all_recent_paid() -> list[dict[str, Any]]:
    """Dev: sincroniza cobranças pagas recentes (útil quando o webhook falhou)."""
    results: list[dict[str, Any]] = []
    for status in ("RECEIVED", "CONFIRMED"):
        payments = await list_recent_payments(status=status, limit=20)
        for payment in payments:
            sub_id = str(payment.get("subscription") or "")
            subscription = await get_subscription(sub_id) if sub_id else None
            if not is_luna_billing_charge(payment, subscription=subscription):
                continue
            result = await _sync_payment(payment)
            result["paymentId"] = payment.get("id")
            results.append(result)
    return results
