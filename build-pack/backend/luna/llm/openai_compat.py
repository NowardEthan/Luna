from __future__ import annotations

import json
import os
from typing import Any

import httpx

from ..config import env_int
from ..sse import EmitFn, consume_chat_completion_sse, parse_assistant_message
from .openrouter_errors import format_openrouter_http_error

DEFAULT_TIMEOUT = 180_000


def chat_timeout_ms(env_key: str) -> int:
    return env_int(env_key, DEFAULT_TIMEOUT, 15_000, 600_000)


async def post_chat(
    url: str,
    headers: dict[str, str],
    body: dict[str, Any],
    timeout_ms: int,
    stream: bool = False,
) -> httpx.Response:
    timeout = httpx.Timeout(timeout_ms / 1000.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        return await client.post(url, headers=headers, json=body)


def build_messages_body(
    raw: dict,
    model: str,
    *,
    sanitize_groq: bool = False,
    extra_body: dict | None = None,
) -> tuple[dict[str, Any] | None, str | None]:
    messages = raw.get("messages")
    if not isinstance(messages, list) or not messages:
        return None, "Nenhuma mensagem enviada ao modelo."

    msgs = []
    for m in messages:
        if not isinstance(m, dict):
            continue
        msg = dict(m)
        if sanitize_groq and msg.get("role") == "assistant":
            msg.pop("reasoning_content", None)
            msg.pop("reasoning", None)
        msgs.append(msg)

    temperature = 0.6
    if isinstance(raw.get("temperature"), (int, float)):
        temperature = float(raw["temperature"])

    body: dict[str, Any] = {
        "model": model,
        "messages": msgs,
        "temperature": temperature,
    }
    if isinstance(raw.get("max_completion_tokens"), (int, float)):
        body["max_completion_tokens"] = int(raw["max_completion_tokens"])
    if raw.get("tools"):
        body["tools"] = raw["tools"]
    if raw.get("tool_choice") is not None:
        body["tool_choice"] = raw["tool_choice"]
    if extra_body:
        body.update(extra_body)
    return body, None


def _format_http_error(url: str, status: int, message: str) -> str:
    if "openrouter.ai" in url.lower():
        return format_openrouter_http_error(status, message)
    msg = str(message or "").strip() or "Provider returned error"
    return f"HTTP {status}: {msg}"


async def chat_once(
    url: str,
    headers: dict[str, str],
    body: dict[str, Any],
    timeout_ms: int,
) -> dict[str, Any]:
    try:
        res = await post_chat(url, headers, body, timeout_ms, stream=False)
    except httpx.HTTPError as e:
        return {"ok": False, "error": str(e)}
    text = res.text
    if not res.is_success:
        try:
            err = json.loads(text).get("error", {})
            msg = err.get("message") if isinstance(err, dict) else text
        except json.JSONDecodeError:
            msg = text[:500]
        return {
            "ok": False,
            "error": _format_http_error(url, res.status_code, str(msg)),
        }
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"ok": False, "error": "Resposta JSON inválida."}
    msg = (data.get("choices") or [{}])[0].get("message") or {}
    parsed = parse_assistant_message(msg)
    if not parsed["text"] and not parsed.get("toolCalls"):
        return {"ok": False, "error": "Resposta vazia do modelo."}
    out: dict[str, Any] = {"ok": True, "text": parsed["text"]}
    if parsed.get("reasoningContent"):
        out["reasoningContent"] = parsed["reasoningContent"]
    if parsed.get("toolCalls"):
        out["toolCalls"] = parsed["toolCalls"]
    return out


async def chat_stream(
    url: str,
    headers: dict[str, str],
    body: dict[str, Any],
    timeout_ms: int,
    emit: EmitFn,
) -> dict[str, Any]:
    body = {**body, "stream": True}
    try:
        timeout = httpx.Timeout(timeout_ms / 1000.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST", url, headers=headers, json=body
            ) as res:
                if not res.is_success:
                    raw = await res.aread()
                    try:
                        err = json.loads(raw).get("error", {})
                        msg = err.get("message") if isinstance(err, dict) else raw.decode()
                    except Exception:
                        msg = raw.decode()[:500]
                    return {
                        "ok": False,
                        "error": _format_http_error(url, res.status_code, str(msg)),
                    }
                parsed = await consume_chat_completion_sse(res, emit)
    except httpx.HTTPError as e:
        return {"ok": False, "error": str(e)}

    if not parsed.get("text") and not parsed.get("toolCalls"):
        return {"ok": False, "error": "Stream sem conteúdo."}
    out: dict[str, Any] = {"ok": True, "text": parsed["text"]}
    if parsed.get("reasoningContent"):
        out["reasoningContent"] = parsed["reasoningContent"]
    if parsed.get("toolCalls"):
        out["toolCalls"] = parsed["toolCalls"]
    return out


async def embed_texts(
    url: str,
    headers: dict[str, str],
    model: str,
    texts: list[str],
    timeout_ms: int = 60_000,
) -> dict[str, Any]:
    try:
        timeout = httpx.Timeout(timeout_ms / 1000.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            res = await client.post(
                url,
                headers=headers,
                json={"model": model, "input": texts},
            )
    except httpx.HTTPError as e:
        return {"ok": False, "error": str(e)}
    if not res.is_success:
        return {"ok": False, "error": f"HTTP {res.status_code}: {res.text[:300]}"}
    data = res.json()
    items = data.get("data") or []
    vectors = [item.get("embedding") for item in sorted(items, key=lambda x: x.get("index", 0))]
    if len(vectors) != len(texts):
        return {"ok": False, "error": "Número de embeddings incorreto."}
    return {"ok": True, "vectors": vectors}
