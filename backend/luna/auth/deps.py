from __future__ import annotations

from fastapi import HTTPException, Request

from .firebase import is_offline_request, verify_bearer_token
from .rate_limit import check_rate_limit


def require_lunar_account(request: Request, body: dict | None = None) -> str:
    """Exige Conta Lunar (token válido, não anónimo) para rotas cloud."""
    if is_offline_request(dict(request.headers), body):
        raise HTTPException(
            status_code=401,
            detail="Modo offline: só Ollama/local sem Conta Lunar.",
        )
    uid = verify_bearer_token(request.headers.get("authorization"))
    if not uid:
        raise HTTPException(
            status_code=401,
            detail="Conta Lunar necessária. Inicie sessão na app.",
        )
    check_rate_limit(uid)
    return uid


def optional_lunar_account(request: Request) -> str | None:
    uid = verify_bearer_token(request.headers.get("authorization"))
    if uid:
        check_rate_limit(uid)
    return uid


def lunar_auth_context(request: Request, body: dict | None = None) -> dict:
    """
    Retorna contexto de auth para o router LLM.
    - offline: sem uid, só Ollama
    - cloud: uid obrigatório
    """
    if is_offline_request(dict(request.headers), body):
        return {"mode": "offline", "uid": None}
    uid = verify_bearer_token(request.headers.get("authorization"))
    if not uid:
        return {"mode": "unauthenticated", "uid": None}
    check_rate_limit(uid)
    return {"mode": "cloud", "uid": uid}
