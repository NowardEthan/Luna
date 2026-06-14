from __future__ import annotations

from typing import Any, Literal

PlanId = Literal["free", "plus", "pro", "byok"]
BillingPeriod = Literal["monthly", "annual"]

# Valores oficiais (R$) — alinhados com src/features/billing/plans.ts
PLAN_CATALOG: dict[tuple[PlanId, BillingPeriod], dict[str, Any]] = {
    ("plus", "monthly"): {"value": 25.0, "cycle": "MONTHLY", "label": "Luna Plus Mensal"},
    ("plus", "annual"): {"value": 250.0, "cycle": "YEARLY", "label": "Luna Plus Anual"},
    ("pro", "monthly"): {"value": 49.0, "cycle": "MONTHLY", "label": "Luna Pro Mensal"},
    ("pro", "annual"): {"value": 490.0, "cycle": "YEARLY", "label": "Luna Pro Anual"},
    ("byok", "monthly"): {"value": 12.0, "cycle": "MONTHLY", "label": "Luna BYOK Mensal"},
    ("byok", "annual"): {"value": 120.0, "cycle": "YEARLY", "label": "Luna BYOK Anual"},
}

VALID_PLAN_IDS = frozenset({"free", "plus", "pro", "byok", "team"})


def is_valid_plan_id(plan_id: str) -> bool:
    return plan_id in VALID_PLAN_IDS


def get_plan_catalog(plan_id: str, period: str) -> dict[str, Any] | None:
    if plan_id not in ("plus", "pro", "byok"):
        return None
    per: BillingPeriod = "annual" if period == "annual" else "monthly"
    return PLAN_CATALOG.get((plan_id, per))


def entitlements_for_plan(plan_id: str) -> dict[str, bool]:
    """Espelha a intenção comercial — quotas vêm de lunarPlanQuotas no cliente."""
    base = {
        "hostedLlm": True,
        "marketplaceRemote": True,
        "marketplacePublish": plan_id != "free",
        "webSearch": True,
        "sync": plan_id != "free",
    }
    return base


def parse_external_reference(ref: str | None) -> dict[str, str] | None:
    if not ref or not isinstance(ref, str):
        return None
    raw = ref.strip()
    if not raw:
        return None
    if raw.startswith("luna:"):
        parts = raw.split(":")
        if len(parts) >= 3 and parts[1] and parts[2] == "credit_pack":
            return {"uid": parts[1], "kind": "credit_pack"}
        if len(parts) >= 4 and parts[1] and parts[2] and parts[3]:
            return {
                "uid": parts[1],
                "planId": parts[2],
                "period": parts[3],
            }
        if len(parts) == 2 and parts[1]:
            return {"uid": parts[1]}
    # Cliente Luna (checkout): externalReference = firebase uid, sem prefixo luna:
    if len(raw) >= 20 and " " not in raw and ":" not in raw:
        return {"uid": raw}
    return None


def is_luna_billing_charge(
    payment: dict[str, Any],
    *,
    subscription: dict[str, Any] | None = None,
) -> bool:
    """Ignora cobranças de outros apps na mesma conta Asaas (ex.: uid:nexus)."""
    for source in (payment, subscription or {}):
        ref = str(source.get("externalReference") or "").strip()
        if ref.startswith("luna:"):
            return True
        desc = str(source.get("description") or "").lower()
        if any(token in desc for token in ("luna plus", "luna pro", "luna byok")):
            return True
        if "credit_pack" in ref or ("pack" in desc and "crédit" in desc):
            return True
    return False


def is_credit_pack_reference(ref: str | None) -> bool:
    parsed = parse_external_reference(ref)
    return bool(parsed and parsed.get("kind") == "credit_pack")


def resolve_plan_from_payment(
    payment: dict[str, Any],
    *,
    subscription: dict[str, Any] | None = None,
) -> tuple[PlanId | None, BillingPeriod | None]:
    """Infere plano a partir de externalReference, descrição ou valor."""
    for source in (payment, subscription or {}):
        ref = parse_external_reference(
            str(source.get("externalReference") or "") or None
        )
        if ref and ref.get("planId") in ("plus", "pro", "byok"):
            period: BillingPeriod = (
                "annual" if ref.get("period") == "annual" else "monthly"
            )
            return ref["planId"], period  # type: ignore[return-value]

    text = " ".join(
        str(x or "")
        for x in (
            payment.get("description"),
            (subscription or {}).get("description"),
        )
    ).lower()
    if "byok" in text:
        return "byok", _period_from_text(text)
    if " pro" in text or text.startswith("pro") or "luna pro" in text:
        return "pro", _period_from_text(text)
    if "plus" in text or "luna plus" in text:
        return "plus", _period_from_text(text)

    value = _coerce_value(payment.get("value"))
    if value is None and subscription:
        value = _coerce_value(subscription.get("value"))
    if value is not None:
        for (plan_id, period), meta in PLAN_CATALOG.items():
            if abs(meta["value"] - value) < 0.02:
                return plan_id, period
    return None, None


def _period_from_text(text: str) -> BillingPeriod:
    return "annual" if "anual" in text or "annual" in text or "year" in text else "monthly"


def _coerce_value(raw: Any) -> float | None:
    try:
        if raw is None:
            return None
        return float(raw)
    except (TypeError, ValueError):
        return None
