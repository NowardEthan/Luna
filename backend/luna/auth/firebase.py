from __future__ import annotations

import os
from pathlib import Path

_app_initialized = False


def _ensure_app() -> bool:
    global _app_initialized
    if _app_initialized:
        return True
    path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip()
    if not path or not Path(path).is_file():
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            cred = credentials.Certificate(path)
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
