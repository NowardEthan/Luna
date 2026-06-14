from __future__ import annotations

import os
import re
from typing import Any

from ..catalog import (
    list_luna_models,
    parse_llm_selection,
    with_llm_selection,
)
from ..config import env_bool
from ..sse import EmitFn, finalize_stream_result
from . import providers as p

BLOCKED = frozenset(
    s.strip().lower()
    for s in (os.getenv("LUNA_BLOCKED_MODELS", "inclusionai/ring-2.6-1t:free,inclusionai/ring") or "").split(",")
    if s.strip()
)


def _primary_provider() -> str:
    v = (os.getenv("LLM_PRIMARY") or "groq").lower()
    if v in ("ollama", "local"):
        return "ollama"
    if v == "openrouter":
        return "openrouter"
    if v == "groq":
        return "groq"
    if v == "google":
        return "google"
    return "together"


def _provider_order(auth_mode: str = "cloud") -> list[str]:
    if auth_mode in ("offline", "unauthenticated"):
        return ["ollama"]
    primary = _primary_provider()
    if not env_bool("LLM_CLOUD_ENABLED", "1") or env_bool("LLM_LOCAL_ONLY", "0"):
        return ["ollama"]
    chains = {
        "google": ["google", "openrouter", "groq", "together", "ollama"],
        "openrouter": ["openrouter", "google", "groq", "together", "ollama"],
        "ollama": ["ollama", "google", "openrouter", "groq", "together"],
        "groq": ["groq", "google", "openrouter", "together", "ollama"],
        "together": ["together", "google", "openrouter", "groq", "ollama"],
    }
    return chains.get(primary, chains["groq"])


def _should_try_fallback(res: dict) -> bool:
    if res.get("ok"):
        return False
    e = str(res.get("error", "")).lower()
    if re.search(r"pedido inválido|nenhuma mensagem|nenhuma imagem", e):
        return False
    return True


def _tag(res: dict, provider: str, used_fallback: bool) -> dict:
    if not res.get("ok"):
        return res
    out = dict(res)
    out["provider"] = provider
    out["usedFallback"] = used_fallback
    if used_fallback:
        labels = {
            "ollama": "Ollama (local)",
            "groq": "Groq",
            "openrouter": "OpenRouter",
            "together": "Together",
            "google": "Google AI Studio",
        }
        out["fallbackNote"] = f"Resposta via {labels.get(provider, provider)} (fallback)."
    return out


_RUNNERS = {
    "ollama": p.ollama_chat,
    "openrouter": p.openrouter_chat,
    "groq": p.groq_chat,
    "together": p.together_chat,
    "google": p.google_chat,
}

_STREAMERS = {
    "ollama": p.ollama_chat_stream,
    "openrouter": p.openrouter_chat_stream,
    "groq": p.groq_chat_stream,
    "together": p.together_chat_stream,
    "google": p.google_chat_stream,
}


async def _run_chain(raw: dict, auth_mode: str = "cloud") -> dict:
    last: dict = {"ok": False, "error": "Nenhum provedor LLM disponível."}
    for i, pid in enumerate(_provider_order(auth_mode)):
        run = _RUNNERS.get(pid)
        if not run:
            continue
        res = await run(raw if isinstance(raw, dict) else {})
        if res.get("ok"):
            return _tag(res, pid, i > 0)
        last = res
        if not env_bool("LLM_FALLBACK_ENABLED", "1"):
            return res
        if not _should_try_fallback(res):
            return res
    return last


async def llm_chat(raw: dict, auth_mode: str = "cloud") -> dict:
    if not isinstance(raw, dict):
        return {"ok": False, "error": "Pedido inválido."}
    sel = parse_llm_selection(raw)
    if sel and auth_mode != "cloud" and sel["provider"] != "ollama":
        return {
            "ok": False,
            "error": "Conta Lunar necessária para modelos cloud.",
        }
    if sel:
        payload = with_llm_selection(sel, raw)
        run = _RUNNERS.get(sel["provider"])
        if not run:
            return {"ok": False, "error": f"Provedor desconhecido: {sel['provider']}"}
        res = await run(payload)
        if res.get("ok") or not env_bool("LLM_FALLBACK_ENABLED", "1") or not _should_try_fallback(res):
            return _tag(res, sel["provider"], False)
    return await _run_chain(raw, auth_mode)


def _emit_buffered(res: dict, emit: EmitFn) -> None:
    if res.get("ok") and res.get("text"):
        t = str(res["text"])
        emit({"type": "content", "delta": t, "full": t})
    if res.get("ok") and res.get("reasoningContent"):
        r = str(res["reasoningContent"])
        emit({"type": "reasoning", "delta": r, "full": r})


def _models_for_provider(provider: str, skip: str = "") -> list[str]:
    catalog = list_luna_models()
    from_catalog: list[str] = []
    if catalog.get("ok"):
        from_catalog = [m["model"] for m in catalog["models"] if m["provider"] == provider]
    defaults = {
        "openrouter": os.getenv("OPENROUTER_MODEL", ""),
        "groq": os.getenv("GROQ_MODEL", ""),
        "together": os.getenv("TOGETHER_MODEL", ""),
        "ollama": os.getenv("OLLAMA_MODEL", ""),
    }
    seen: set[str] = set()
    if skip:
        seen.add(skip)
    out: list[str] = []
    for m in [*from_catalog, defaults.get(provider, "")]:
        if not m or m in seen or m.lower() in BLOCKED:
            continue
        seen.add(m)
        out.append(m)
    return out


def _build_stream_attempts(sel: dict | None, auth_mode: str = "cloud") -> list[dict]:
    attempts: list[dict] = []
    if sel:
        if auth_mode != "cloud" and sel["provider"] != "ollama":
            return []
        attempts.append(sel)
        for m in _models_for_provider(sel["provider"], skip=sel["model"]):
            attempts.append({"provider": sel["provider"], "model": m})
    for pid in _provider_order(auth_mode):
        for m in _models_for_provider(pid):
            attempts.append({"provider": pid, "model": m})
    # dedupe
    seen: set[str] = set()
    uniq: list[dict] = []
    for a in attempts:
        k = f"{a['provider']}|{a['model']}"
        if k in seen or a["model"].lower() in BLOCKED:
            continue
        seen.add(k)
        uniq.append(a)
    return uniq


async def llm_chat_stream(
    raw: dict, emit: EmitFn, auth_mode: str = "cloud"
) -> dict:
    if not isinstance(raw, dict):
        return {"ok": False, "error": "Pedido inválido."}
    sel = parse_llm_selection(raw)
    if sel and auth_mode != "cloud" and sel["provider"] != "ollama":
        return {
            "ok": False,
            "error": "Conta Lunar necessária para modelos cloud.",
        }

    if not env_bool("LLM_STREAMING_ENABLED", "1"):
        res = await llm_chat(raw, auth_mode)
        _emit_buffered(res, emit)
        return res

    errors: list[str] = []
    for attempt in _build_stream_attempts(sel, auth_mode):
        payload = with_llm_selection(attempt, raw)
        streamer = _STREAMERS.get(attempt["provider"])
        if not streamer:
            continue
        res = await streamer(payload, emit)
        if res.get("ok") or not _should_try_fallback(res):
            return _tag(res, attempt["provider"], attempt != sel if sel else False)
        if res.get("error"):
            errors.append(f"• {attempt['provider']} · {attempt['model']}: {res['error']}")
        if not env_bool("LLM_FALLBACK_ENABLED", "1"):
            return res

    detail = "\n\n".join(errors[:12]) if errors else ""
    return {
        "ok": False,
        "error": "Não foi possível completar o streaming em nenhum provedor." + detail,
        "attemptErrors": errors,
    }


async def llm_embed(texts: list[str], auth_mode: str = "cloud") -> dict:
    if not texts:
        return {"ok": False, "error": "Nenhum texto para embed."}
    order = (
        ["openrouter", "groq", "together", "ollama"]
        if auth_mode == "cloud"
        else ["ollama"]
    )
    embedders = {
        "openrouter": p.openrouter_embed,
        "groq": p.groq_embed,
        "together": p.together_embed,
        "ollama": p.ollama_embed,
    }
    last: dict = {"ok": False, "error": "Embeddings indisponíveis."}
    for pid in order:
        fn = embedders.get(pid)
        if not fn:
            continue
        res = await fn(texts)
        if res.get("ok"):
            return res
        last = res
    return last


async def llm_vision_describe(raw: dict, auth_mode: str = "cloud") -> dict:
    if auth_mode != "cloud":
        return {
            "ok": False,
            "error": "Conta Lunar necessária para visão multimodal.",
        }
    for pid in ["openrouter", "groq", "together"]:
        res = await p.vision_describe(pid, raw)
        if res.get("ok"):
            return res
    return {"ok": False, "error": "Visão indisponível em todos os provedores."}
