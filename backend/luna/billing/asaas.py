from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import httpx

from .config import ASAAS_API_BASE, ASAAS_API_KEY, asaas_configured
from .plan_mapping import get_plan_catalog

_TIMEOUT = 30.0


def normalize_cpf_cnpj(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = "".join(c for c in str(raw) if c.isdigit())
    if len(digits) in (11, 14):
        return digits
    return None


class AsaasError(Exception):
    def __init__(self, message: str, *, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


def _headers() -> dict[str, str]:
    return {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json",
        "User-Agent": "Luna-Orbit/1.0",
    }


async def _request(method: str, path: str, *, json_body: dict | None = None) -> Any:
    if not asaas_configured():
        raise AsaasError("ASAAS_API_KEY não configurada.")
    url = f"{ASAAS_API_BASE}{path}"
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        res = await client.request(method, url, headers=_headers(), json=json_body)
    try:
        data = res.json()
    except Exception:
        data = {"raw": res.text}
    if res.status_code >= 400:
        errors = data.get("errors") if isinstance(data, dict) else None
        detail = errors[0].get("description") if errors else res.text
        raise AsaasError(str(detail or res.text), status=res.status_code)
    return data


async def find_customer_by_email(email: str) -> dict[str, Any] | None:
    data = await _request("GET", f"/customers?email={email}&limit=1")
    items = data.get("data") if isinstance(data, dict) else None
    if isinstance(items, list) and items:
        return items[0]
    return None


async def create_customer(
    *,
    name: str,
    email: str,
    external_reference: str,
    cpf_cnpj: str,
) -> dict[str, Any]:
    payload = {
        "name": name or email,
        "email": email,
        "cpfCnpj": cpf_cnpj,
        "externalReference": external_reference,
        "notificationDisabled": False,
    }
    return await _request("POST", "/customers", json_body=payload)


async def ensure_customer_cpf(customer: dict[str, Any], cpf_cnpj: str) -> dict[str, Any]:
    existing = normalize_cpf_cnpj(str(customer.get("cpfCnpj") or ""))
    if existing:
        return customer
    customer_id = str(customer.get("id") or "")
    if not customer_id:
        raise AsaasError("Cliente Asaas sem id.")
    return await _request(
        "PUT",
        f"/customers/{customer_id}",
        json_body={"cpfCnpj": cpf_cnpj},
    )


async def find_or_create_customer(
    *,
    uid: str,
    email: str,
    name: str | None,
    cpf_cnpj: str,
) -> dict[str, Any]:
    existing = await find_customer_by_email(email)
    if existing:
        return await ensure_customer_cpf(existing, cpf_cnpj)
    return await create_customer(
        name=name or email.split("@")[0],
        email=email,
        external_reference=uid,
        cpf_cnpj=cpf_cnpj,
    )


def _next_due_date() -> str:
    return (date.today() + timedelta(days=1)).isoformat()


async def create_subscription_checkout(
    *,
    uid: str,
    email: str,
    name: str | None,
    plan_id: str,
    period: str,
    cpf_cnpj: str,
) -> dict[str, Any]:
    catalog = get_plan_catalog(plan_id, period)
    if not catalog:
        raise AsaasError(f"Plano inválido: {plan_id}/{period}")

    doc = normalize_cpf_cnpj(cpf_cnpj)
    if not doc:
        raise AsaasError("CPF ou CNPJ inválido.")

    customer = await find_or_create_customer(
        uid=uid, email=email, name=name, cpf_cnpj=doc
    )
    customer_id = str(customer.get("id") or "")
    if not customer_id:
        raise AsaasError("Cliente Asaas sem id.")

    external_ref = f"luna:{uid}:{plan_id}:{period}"
    payload = {
        "customer": customer_id,
        "billingType": "UNDEFINED",
        "value": catalog["value"],
        "nextDueDate": _next_due_date(),
        "cycle": catalog["cycle"],
        "description": catalog["label"],
        "externalReference": external_ref,
    }
    subscription = await _request("POST", "/subscriptions", json_body=payload)
    sub_id = str(subscription.get("id") or "")

    invoice_url = await _resolve_subscription_payment_url(sub_id)
    return {
        "customerId": customer_id,
        "subscriptionId": sub_id,
        "invoiceUrl": invoice_url,
        "externalReference": external_ref,
        "value": catalog["value"],
        "cycle": catalog["cycle"],
    }


async def _resolve_subscription_payment_url(subscription_id: str) -> str | None:
    if not subscription_id:
        return None
    data = await _request(
        "GET",
        f"/subscriptions/{subscription_id}/payments?limit=1",
    )
    items = data.get("data") if isinstance(data, dict) else None
    if not isinstance(items, list) or not items:
        return None
    payment = items[0]
    for key in ("invoiceUrl", "bankSlipUrl", "transactionReceiptUrl"):
        url = payment.get(key)
        if isinstance(url, str) and url.strip():
            return url.strip()
    return None


async def get_customer(customer_id: str) -> dict[str, Any] | None:
    if not customer_id:
        return None
    try:
        return await _request("GET", f"/customers/{customer_id}")
    except AsaasError:
        return None


async def get_subscription(subscription_id: str) -> dict[str, Any] | None:
    if not subscription_id:
        return None
    try:
        return await _request("GET", f"/subscriptions/{subscription_id}")
    except AsaasError:
        return None


async def get_payment(payment_id: str) -> dict[str, Any] | None:
    if not payment_id:
        return None
    try:
        return await _request("GET", f"/payments/{payment_id}")
    except AsaasError:
        return None


CREDIT_PACK_VALUE = 9.0


async def create_credit_pack_checkout(
    *,
    uid: str,
    email: str,
    name: str | None,
    cpf_cnpj: str,
) -> dict[str, Any]:
    doc = normalize_cpf_cnpj(cpf_cnpj)
    if not doc:
        raise AsaasError("CPF ou CNPJ inválido.")

    customer = await find_or_create_customer(
        uid=uid, email=email, name=name, cpf_cnpj=doc
    )
    customer_id = str(customer.get("id") or "")
    if not customer_id:
        raise AsaasError("Cliente Asaas sem id.")

    external_ref = f"luna:{uid}:credit_pack"
    payload = {
        "customer": customer_id,
        "billingType": "UNDEFINED",
        "value": CREDIT_PACK_VALUE,
        "dueDate": _next_due_date(),
        "description": "Luna Pack +500 créditos",
        "externalReference": external_ref,
    }
    payment = await _request("POST", "/payments", json_body=payload)
    invoice_url = None
    for key in ("invoiceUrl", "bankSlipUrl", "transactionReceiptUrl"):
        url = payment.get(key)
        if isinstance(url, str) and url.strip():
            invoice_url = url.strip()
            break
    return {
        "customerId": customer_id,
        "paymentId": payment.get("id"),
        "invoiceUrl": invoice_url,
        "externalReference": external_ref,
        "value": CREDIT_PACK_VALUE,
    }


async def list_recent_payments(
    *,
    status: str | None = None,
    customer_id: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    params: list[str] = [f"limit={limit}"]
    if status:
        params.append(f"status={status}")
    if customer_id:
        params.append(f"customer={customer_id}")
    data = await _request("GET", f"/payments?{'&'.join(params)}")
    items = data.get("data") if isinstance(data, dict) else None
    return items if isinstance(items, list) else []
