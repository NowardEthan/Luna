from luna.billing.plan_mapping import (
    get_plan_catalog,
    is_luna_billing_charge,
    parse_external_reference,
    resolve_plan_from_payment,
)


def test_parse_external_reference_luna_format():
    ref = parse_external_reference("luna:uid123:plus:monthly")
    assert ref == {"uid": "uid123", "planId": "plus", "period": "monthly"}


def test_parse_external_reference_uid_only():
    ref = parse_external_reference("abcdefghijklmnopqrstuvwxyz12")
    assert ref == {"uid": "abcdefghijklmnopqrstuvwxyz12"}


def test_parse_external_reference_ignores_other_apps():
    assert parse_external_reference("firebaseUid1234567890:nexus") is None


def test_is_luna_billing_charge_rejects_nexus():
    assert not is_luna_billing_charge(
        {
            "externalReference": "uid123:nexus",
            "description": "Assinatura do plano Nexus - Luna AI",
        }
    )


def test_is_luna_billing_charge_accepts_luna_prefix():
    assert is_luna_billing_charge(
        {"externalReference": "luna:uid123:plus:monthly", "description": ""}
    )


def test_resolve_plan_from_value():
    plan, period = resolve_plan_from_payment({"value": 49.0})
    assert plan == "pro"
    assert period == "monthly"


def test_resolve_plan_from_description():
    plan, period = resolve_plan_from_payment(
        {"description": "Luna BYOK Anual", "value": 120.0}
    )
    assert plan == "byok"
    assert period == "annual"


def test_catalog_plus_monthly():
    cat = get_plan_catalog("plus", "monthly")
    assert cat is not None
    assert cat["value"] == 25.0
