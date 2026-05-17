from __future__ import annotations

import json
from typing import Any, Callable

import httpx

EmitFn = Callable[[dict[str, Any]], None]


def _merge_tool_delta(acc: dict[int, dict], delta_calls: list) -> None:
    for tc in delta_calls or []:
        if not isinstance(tc, dict):
            continue
        idx = int(tc.get("index", 0))
        if idx not in acc:
            acc[idx] = {
                "id": "",
                "type": "function",
                "function": {"name": "", "arguments": ""},
            }
        row = acc[idx]
        if tc.get("id"):
            row["id"] = str(tc["id"])
        fn = tc.get("function") or {}
        if isinstance(fn, dict):
            if fn.get("name"):
                row["function"]["name"] = str(fn["name"])
            if fn.get("arguments"):
                row["function"]["arguments"] += str(fn["arguments"])


def _finalize_tools(acc: dict[int, dict]) -> list[dict]:
    out = []
    for idx in sorted(acc.keys()):
        row = acc[idx]
        if row.get("id") and row["function"].get("name"):
            out.append(row)
    return out


def parse_assistant_message(msg: dict) -> dict[str, Any]:
    text = "" if msg.get("content") is None else str(msg.get("content"))
    reasoning = str(
        msg.get("reasoning")
        or msg.get("reasoning_content")
        or ""
    )
    tool_calls: list[dict] = []
    for tc in msg.get("tool_calls") or []:
        if not isinstance(tc, dict):
            continue
        fn = tc.get("function") or {}
        tid = str(tc.get("id") or "")
        name = str(fn.get("name") or "")
        args = str(fn.get("arguments") or "{}")
        if tid and name:
            tool_calls.append(
                {
                    "id": tid,
                    "type": "function",
                    "function": {"name": name, "arguments": args},
                }
            )
    return {
        "text": text,
        "reasoningContent": reasoning,
        "toolCalls": tool_calls,
    }


async def consume_chat_completion_sse(
    response: httpx.Response,
    emit: EmitFn,
    parse_message: Callable[[dict], dict] | None = None,
) -> dict[str, Any]:
    content = ""
    reasoning = ""
    tool_acc: dict[int, dict] = {}
    saw_tools = False

    async for line in response.aiter_lines():
        trimmed = line.strip()
        if not trimmed.startswith("data:"):
            continue
        data_str = trimmed[5:].strip()
        if not data_str or data_str == "[DONE]":
            continue
        try:
            chunk = json.loads(data_str)
        except json.JSONDecodeError:
            continue
        delta = (chunk.get("choices") or [{}])[0].get("delta") or {}
        if not isinstance(delta, dict):
            continue

        tcalls = delta.get("tool_calls")
        if isinstance(tcalls, list) and tcalls:
            if not saw_tools:
                saw_tools = True
                emit({"type": "tools_pending"})
            _merge_tool_delta(tool_acc, tcalls)

        think = (
            delta.get("reasoning")
            or delta.get("reasoning_content")
            or delta.get("thinking")
        )
        if not think and isinstance(delta.get("reasoning_details"), list):
            parts = []
            for rd in delta["reasoning_details"]:
                if isinstance(rd, dict):
                    parts.append(
                        str(
                            rd.get("text")
                            or rd.get("content")
                            or rd.get("summary")
                            or ""
                        )
                    )
            think = "".join(parts) if parts else None
        if think:
            t = str(think)
            reasoning += t
            emit({"type": "reasoning", "delta": t, "full": reasoning})

        if delta.get("content") and not saw_tools:
            c = str(delta["content"])
            content += c
            emit({"type": "content", "delta": c, "full": content})

    tools = _finalize_tools(tool_acc)
    return {
        "text": content.strip(),
        "reasoningContent": reasoning.strip() or None,
        "toolCalls": tools or None,
    }


def finalize_stream_result(
    text: str,
    reasoning_content: str | None,
    tool_calls: list | None,
    provider: str,
    used_fallback: bool,
) -> dict[str, Any]:
    label_map = {
        "ollama": "Ollama (local)",
        "groq": "Groq",
        "openrouter": "OpenRouter",
        "together": "Together",
    }
    out: dict[str, Any] = {
        "ok": True,
        "text": text,
        "provider": provider,
        "usedFallback": used_fallback,
    }
    if reasoning_content:
        out["reasoningContent"] = reasoning_content
    if tool_calls:
        out["toolCalls"] = tool_calls
    if used_fallback:
        out["fallbackNote"] = f"Resposta via {label_map.get(provider, provider)} (fallback)."
    return out
