from __future__ import annotations

import base64
import os
from typing import Any

from ..config import env_bool
from ..sse import EmitFn
from .openai_compat import (
    build_messages_body,
    chat_once,
    chat_stream,
    chat_timeout_ms,
    embed_texts,
    post_chat,
)


def _groq_extra(raw: dict, model: str) -> dict:
    extra: dict[str, Any] = {}
    if env_bool("GROQ_REASONING_ENABLED", "0") or raw.get("reasoning_enabled") is True:
        if "gpt-oss" in model.lower() or "qwen" in model.lower():
            extra["reasoning_effort"] = os.getenv("GROQ_REASONING_EFFORT", "medium")
    return extra


async def groq_chat(raw: dict) -> dict:
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        return {"ok": False, "error": "GROQ_API_KEY não configurada."}
    model = str(raw.get("llm_model") or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"))
    body, err = build_messages_body(
        raw, model, sanitize_groq=True, extra_body=_groq_extra(raw, model)
    )
    if err:
        return {"ok": False, "error": err}
    return await chat_once(
        "https://api.groq.com/openai/v1/chat/completions",
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        body,
        chat_timeout_ms("GROQ_CHAT_TIMEOUT_MS"),
    )


async def groq_chat_stream(raw: dict, emit: EmitFn) -> dict:
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        return {"ok": False, "error": "GROQ_API_KEY não configurada."}
    model = str(raw.get("llm_model") or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"))
    body, err = build_messages_body(
        raw, model, sanitize_groq=True, extra_body=_groq_extra(raw, model)
    )
    if err:
        return {"ok": False, "error": err}
    return await chat_stream(
        "https://api.groq.com/openai/v1/chat/completions",
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        body,
        chat_timeout_ms("GROQ_CHAT_TIMEOUT_MS"),
        emit,
    )


async def groq_embed(texts: list[str]) -> dict:
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        return {"ok": False, "error": "GROQ_API_KEY não configurada."}
    model = os.getenv("GROQ_EMBED_MODEL", "nomic-embed-text-v1_5")
    return await embed_texts(
        "https://api.groq.com/openai/v1/embeddings",
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        model,
        texts,
    )


async def openrouter_chat(raw: dict) -> dict:
    key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not key:
        return {"ok": False, "error": "OPENROUTER_API_KEY não configurada."}
    model = str(raw.get("llm_model") or os.getenv("OPENROUTER_MODEL", ""))
    body, err = build_messages_body(raw, model)
    if err:
        return {"ok": False, "error": err}
    base = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", "http://localhost"),
        "X-Title": os.getenv("OPENROUTER_APP_TITLE", "Luna"),
    }
    return await chat_once(
        f"{base}/chat/completions", headers, body, chat_timeout_ms("OPENROUTER_CHAT_TIMEOUT_MS")
    )


async def openrouter_chat_stream(raw: dict, emit: EmitFn) -> dict:
    key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not key:
        return {"ok": False, "error": "OPENROUTER_API_KEY não configurada."}
    model = str(raw.get("llm_model") or os.getenv("OPENROUTER_MODEL", ""))
    body, err = build_messages_body(raw, model)
    if err:
        return {"ok": False, "error": err}
    base = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", "http://localhost"),
        "X-Title": os.getenv("OPENROUTER_APP_TITLE", "Luna"),
    }
    return await chat_stream(
        f"{base}/chat/completions", headers, body, chat_timeout_ms("OPENROUTER_CHAT_TIMEOUT_MS"), emit
    )


async def openrouter_embed(texts: list[str]) -> dict:
    key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not key:
        return {"ok": False, "error": "OPENROUTER_API_KEY não configurada."}
    model = os.getenv("OPENROUTER_EMBED_MODEL", "thenlper/gte-base")
    base = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    return await embed_texts(
        f"{base}/embeddings",
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        model,
        texts,
    )


async def together_chat(raw: dict) -> dict:
    key = os.getenv("TOGETHER_API_KEY", "").strip()
    if not key:
        return {"ok": False, "error": "TOGETHER_API_KEY não configurada."}
    model = str(raw.get("llm_model") or os.getenv("TOGETHER_MODEL", ""))
    body, err = build_messages_body(raw, model)
    if err:
        return {"ok": False, "error": err}
    return await chat_once(
        "https://api.together.xyz/v1/chat/completions",
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        body,
        chat_timeout_ms("TOGETHER_CHAT_TIMEOUT_MS"),
    )


async def together_chat_stream(raw: dict, emit: EmitFn) -> dict:
    key = os.getenv("TOGETHER_API_KEY", "").strip()
    if not key:
        return {"ok": False, "error": "TOGETHER_API_KEY não configurada."}
    model = str(raw.get("llm_model") or os.getenv("TOGETHER_MODEL", ""))
    body, err = build_messages_body(raw, model)
    if err:
        return {"ok": False, "error": err}
    return await chat_stream(
        "https://api.together.xyz/v1/chat/completions",
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        body,
        chat_timeout_ms("TOGETHER_CHAT_TIMEOUT_MS"),
        emit,
    )


async def together_embed(texts: list[str]) -> dict:
    key = os.getenv("TOGETHER_API_KEY", "").strip()
    if not key:
        return {"ok": False, "error": "TOGETHER_API_KEY não configurada."}
    model = os.getenv("TOGETHER_EMBED_MODEL", "intfloat/multilingual-e5-large-instruct")
    return await embed_texts(
        "https://api.together.xyz/v1/embeddings",
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        model,
        texts,
    )


def ollama_enabled() -> bool:
    return env_bool("OLLAMA_ENABLED", "1")


async def ollama_chat(raw: dict) -> dict:
    if not ollama_enabled():
        return {"ok": False, "error": "Ollama desligado (OLLAMA_ENABLED=0)."}
    model = str(raw.get("llm_model") or os.getenv("OLLAMA_MODEL", ""))
    body, err = build_messages_body(raw, model)
    if err:
        return {"ok": False, "error": err}
    base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1").rstrip("/")
    return await chat_once(
        f"{base}/chat/completions",
        {"Content-Type": "application/json"},
        body,
        chat_timeout_ms("OLLAMA_CHAT_TIMEOUT_MS"),
    )


async def ollama_chat_stream(raw: dict, emit: EmitFn) -> dict:
    if not ollama_enabled():
        return {"ok": False, "error": "Ollama desligado (OLLAMA_ENABLED=0)."}
    model = str(raw.get("llm_model") or os.getenv("OLLAMA_MODEL", ""))
    body, err = build_messages_body(raw, model)
    if err:
        return {"ok": False, "error": err}
    base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1").rstrip("/")
    return await chat_stream(
        f"{base}/chat/completions",
        {"Content-Type": "application/json"},
        body,
        chat_timeout_ms("OLLAMA_CHAT_TIMEOUT_MS"),
        emit,
    )


async def ollama_embed(texts: list[str]) -> dict:
    if not ollama_enabled():
        return {"ok": False, "error": "Ollama desligado."}
    model = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
    base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1").rstrip("/")
    return await embed_texts(
        f"{base}/embeddings",
        {"Content-Type": "application/json"},
        model,
        texts,
    )


async def vision_describe(provider: str, raw: dict) -> dict:
    images = raw.get("images") or []
    caption = str(raw.get("userCaption") or raw.get("user_caption") or "")
    if not images:
        return {"ok": False, "error": "Nenhuma imagem válida."}

    content: list[dict] = [{"type": "text", "text": caption or "Descreve esta imagem."}]
    for im in images:
        if not isinstance(im, dict):
            continue
        mime = str(im.get("mime") or "image/jpeg")
        b64 = str(im.get("dataBase64") or im.get("data_base64") or "")
        if not b64:
            continue
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{b64}"},
            }
        )

    if provider == "openrouter":
        key = os.getenv("OPENROUTER_API_KEY", "").strip()
        model = os.getenv("OPENROUTER_VISION_MODEL", os.getenv("OPENROUTER_MODEL", ""))
        base = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    elif provider == "groq":
        key = os.getenv("GROQ_API_KEY", "").strip()
        model = os.getenv("GROQ_VISION_MODEL", os.getenv("GROQ_MODEL", ""))
        base = "https://api.groq.com/openai/v1"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    else:
        key = os.getenv("TOGETHER_API_KEY", "").strip()
        model = os.getenv("TOGETHER_VISION_MODEL", os.getenv("TOGETHER_MODEL", ""))
        base = "https://api.together.xyz/v1"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    body = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "max_completion_tokens": 1024,
    }
    res = await chat_once(
        f"{base}/chat/completions", headers, body, chat_timeout_ms("OPENROUTER_CHAT_TIMEOUT_MS")
    )
    if not res.get("ok"):
        return res
    return {"ok": True, "text": res.get("text", "")}
