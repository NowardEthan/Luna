from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

_CATALOG_PATH = Path(__file__).resolve().parents[3] / "shared" / "tool-catalog.json"


def _load_allowlist() -> dict[str, str]:
    try:
        raw = json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))
        names = raw.get("tools") if isinstance(raw, dict) else []
        if not isinstance(names, list):
            return _fallback_allowlist()
        out: dict[str, str] = {}
        for name in names:
            if not isinstance(name, str) or not name.strip():
                continue
            key = name.strip()
            method = "run_command" if key == "run_terminal_command" else key
            out[key] = method
        return out or _fallback_allowlist()
    except OSError:
        return _fallback_allowlist()


def _fallback_allowlist() -> dict[str, str]:
    return {
        "list_directory": "list_directory",
        "read_file": "read_file",
        "web_search": "web_search",
        "write_file": "write_file",
        "grep": "grep",
        "glob": "glob",
        "run_terminal_command": "run_command",
        "git_status": "git_status",
        "git_diff": "git_diff",
        "git_commit": "git_commit",
    }


TOOL_ALLOWLIST: dict[str, str] = _load_allowlist()


def invoke_tool(
    agent_tools: Any,
    name: str,
    body: dict[str, Any],
) -> dict[str, Any]:
    if name not in TOOL_ALLOWLIST:
        return {"ok": False, "error": f"Ferramenta não permitida: {name}"}

    method_name = TOOL_ALLOWLIST[name]
    method: Callable[..., Any] | None = getattr(agent_tools, method_name, None)
    if method is None:
        return {"ok": False, "error": f"Método em falta: {method_name}"}

    if name == "list_directory":
        return method(str(body.get("path") or ""))
    if name == "read_file":
        return method(str(body.get("path") or ""), body.get("max_chars"))
    if name == "web_search":
        return method(str(body.get("query") or ""))
    if name == "write_file":
        return method(
            str(body.get("path") or ""),
            str(body.get("content") or ""),
        )
    if name == "grep":
        return method(
            str(body.get("pattern") or body.get("query") or ""),
            str(body["path"]) if body.get("path") else None,
            case_sensitive=body.get("case_sensitive") is True,
        )
    if name == "glob":
        return method(
            str(body.get("pattern") or ""),
            str(body["path"]) if body.get("path") else None,
        )
    if name == "run_terminal_command":
        return method(
            str(body.get("command") or ""),
            str(body["cwd"]) if body.get("cwd") else None,
            gui=body.get("gui") is True,
        )
    if name == "git_status":
        return method(str(body["path"]) if body.get("path") else None)
    if name == "git_diff":
        return method(
            str(body["path"]) if body.get("path") else None,
            staged=body.get("staged") is True,
        )
    if name == "git_commit":
        return method(
            str(body["path"]) if body.get("path") else None,
            str(body.get("message") or ""),
        )

    return {"ok": False, "error": "Handler não implementado"}
