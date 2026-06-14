from __future__ import annotations

import os
import re
from typing import Any

REASONING_EFFORTS = frozenset(
    {"xhigh", "high", "medium", "low", "minimal", "none"}
)


def _is_free_model(model: str) -> bool:
    return str(model or "").lower().endswith(":free")


def _has_native_reasoning(model: str) -> bool:
    m = str(model or "").lower()
    if _is_free_model(m):
        return False
    if re.search(r"ring|inclusionai/ring|mai-ds-r|/thinking|deepseek.*r1", m):
        return True
    extra = os.getenv("OPENROUTER_NATIVE_REASONING_MODELS", "")
    patterns = [p.strip().lower() for p in re.split(r"[,;\n]+", extra) if p.strip()]
    return any(p in m or m in p for p in patterns)


def _read_effort(env_key: str, fallback: str) -> str:
    effort = os.getenv(env_key, fallback).strip().lower()
    return effort if effort in REASONING_EFFORTS else fallback


def apply_openrouter_request_extras(raw: dict, body: dict[str, Any], model: str) -> None:
    """
  Reasoning para POST /v1/chat/completions (não confundir com /v1/responses).
  Ver docs/openrouter-reasoning.md
    """
    if _is_free_model(model):
        body.pop("reasoning", None)
        return

    native = _has_native_reasoning(model)
    enabled = raw.get("reasoning_enabled") is True
    disabled = raw.get("reasoning_enabled") is False

    if enabled:
        effort = _read_effort("OPENROUTER_REASONING_EFFORT", "medium")
        if effort == "none":
            effort = "medium"
        reasoning: dict[str, Any] = {"effort": effort, "exclude": False}
        summary = os.getenv("OPENROUTER_REASONING_SUMMARY", "").strip().lower()
        if summary in ("auto", "concise", "detailed"):
            reasoning["summary"] = summary
        body["reasoning"] = reasoning
        return

    if disabled:
        if native:
            off = _read_effort(
                "OPENROUTER_REASONING_EFFORT_OFF",
                _read_effort("OPENROUTER_REASONING_EFFORT", "low"),
            )
            if off == "none":
                off = "low"
            body["reasoning"] = {"effort": off, "exclude": True}
        else:
            body["reasoning"] = {"effort": "none"}
        return

    if native:
        effort = _read_effort("OPENROUTER_REASONING_EFFORT", "low")
        if effort == "none":
            effort = "low"
        body["reasoning"] = {"effort": effort, "exclude": False}
