from __future__ import annotations

import os

from ..config import env_bool

ASAAS_API_KEY = os.getenv("ASAAS_API_KEY", "").strip()
ASAAS_ENV = os.getenv("ASAAS_ENV", "sandbox").strip().lower()
ASAAS_WEBHOOK_TOKEN = os.getenv("ASAAS_WEBHOOK_TOKEN", "").strip()

ASAAS_API_BASE = (
    "https://api.asaas.com/v3"
    if ASAAS_ENV == "production"
    else "https://sandbox.asaas.com/api/v3"
)


def asaas_configured() -> bool:
    return bool(ASAAS_API_KEY)


def webhook_auth_enabled() -> bool:
    return bool(ASAAS_WEBHOOK_TOKEN)


def allow_unauthenticated_webhooks() -> bool:
    """Dev local sem token — só se explicitamente permitido."""
    return env_bool("ASAAS_WEBHOOK_ALLOW_OPEN", "0")
