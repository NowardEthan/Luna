from __future__ import annotations

import json
import os
from pathlib import Path

_app_initialized = False


def _resolve_service_account_path() -> Path | None:
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip()
    if not raw:
        return None
    p = Path(raw)
    if not p.is_absolute():
        root = Path(__file__).resolve().parents[3]
        p = (root / p).resolve()
    return p if p.is_file() else None


def _load_service_account_credentials():
    import firebase_admin
    from firebase_admin import credentials

    json_raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if json_raw:
        return credentials.Certificate(json.loads(json_raw))

    sa_path = _resolve_service_account_path()
    if sa_path:
        return credentials.Certificate(str(sa_path))

    return None


def _ensure_app() -> bool:
    global _app_initialized
    if _app_initialized:
        return True
    try:
        import firebase_admin

        if not firebase_admin._apps:
            cred = _load_service_account_credentials()
            if not cred:
                return False
            firebase_admin.initialize_app(cred)
        _app_initialized = True
        return True
    except Exception:
        return False


def verify_bearer_token(authorization: str | None) -> str | None:
    """Valida Bearer Firebase ID token. Rejeita utilizadores anónimos."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    if not token:
        return None
    if not _ensure_app():
        return None
    try:
        from firebase_admin import auth

        decoded = auth.verify_id_token(token)
        provider = (
            decoded.get("firebase", {}) or {}
        ).get("sign_in_provider", "")
        if provider == "anonymous":
            return None
        uid = decoded.get("uid")
        return str(uid) if uid else None
    except Exception:
        return None


def is_offline_request(headers: dict, body: dict | None) -> bool:
    mode = str(headers.get("x-luna-mode") or headers.get("X-Luna-Mode") or "").lower()
    if mode == "offline":
        return True
    if not body:
        return False
    provider = str(body.get("llm_provider") or "").strip().lower()
    return provider == "ollama"
