from __future__ import annotations

import os
import re
from dataclasses import dataclass

VALID_PROVIDERS = frozenset({"openrouter", "groq", "together", "ollama"})


@dataclass
class LunaModelEntry:
    id: str
    provider: str
    model: str
    label: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "provider": self.provider,
            "model": self.model,
            "label": self.label,
        }


def _is_provider_available(entry: LunaModelEntry) -> bool:
    p = entry.provider
    if p == "openrouter":
        return bool(os.getenv("OPENROUTER_API_KEY", "").strip())
    if p == "groq":
        return bool(os.getenv("GROQ_API_KEY", "").strip())
    if p == "together":
        return bool(os.getenv("TOGETHER_API_KEY", "").strip())
    if p == "ollama":
        v = os.getenv("OLLAMA_ENABLED", "1").lower()
        return v not in ("0", "false")
    return False


def parse_luna_models_chunk(chunk: str) -> list[LunaModelEntry]:
    parts = [p.strip() for p in chunk.split("|")]
    entries: list[LunaModelEntry] = []
    i = 0
    while i < len(parts):
        provider = parts[i].lower()
        if provider not in VALID_PROVIDERS:
            i += 1
            continue
        if i + 1 >= len(parts):
            break
        model = parts[i + 1]
        nxt = parts[i + 2] if i + 2 < len(parts) else None
        has_label = nxt is not None and nxt.lower() not in VALID_PROVIDERS
        label = (nxt if has_label else model).strip() or model
        entries.append(
            LunaModelEntry(
                id=f"{provider}|{model}",
                provider=provider,
                model=model,
                label=label,
            )
        )
        i += 3 if has_label else 2
    return entries


def parse_luna_models_env(raw: str) -> list[LunaModelEntry]:
    if not raw or not raw.strip():
        return []
    chunks = [c.strip() for c in re.split(r"\n|;;", raw) if c.strip()]
    out: list[LunaModelEntry] = []
    seen: set[str] = set()
    for chunk in chunks:
        for entry in parse_luna_models_chunk(chunk):
            if entry.id in seen:
                continue
            seen.add(entry.id)
            out.append(entry)
    return out


def build_auto_catalog() -> list[LunaModelEntry]:
    out: list[LunaModelEntry] = []
    or_model = os.getenv("OPENROUTER_MODEL", "").strip()
    if os.getenv("OPENROUTER_API_KEY", "").strip() and or_model:
        out.append(
            LunaModelEntry(
                f"openrouter|{or_model}",
                "openrouter",
                or_model,
                f"OpenRouter · {or_model}",
            )
        )
    groq_model = os.getenv("GROQ_MODEL", "").strip()
    if os.getenv("GROQ_API_KEY", "").strip() and groq_model:
        out.append(
            LunaModelEntry(f"groq|{groq_model}", "groq", groq_model, f"Groq · {groq_model}")
        )
    together_model = os.getenv("TOGETHER_MODEL", "").strip()
    if os.getenv("TOGETHER_API_KEY", "").strip() and together_model:
        out.append(
            LunaModelEntry(
                f"together|{together_model}",
                "together",
                together_model,
                f"Together · {together_model}",
            )
        )
    ollama_model = os.getenv("OLLAMA_MODEL", "").strip()
    ollama_entry = LunaModelEntry(
        f"ollama|{ollama_model}" if ollama_model else "ollama|",
        "ollama",
        ollama_model,
        f"Ollama · {ollama_model}" if ollama_model else "Ollama",
    )
    if ollama_model and _is_provider_available(ollama_entry):
        out.append(ollama_entry)
    return out


def list_luna_models() -> dict:
    configured = parse_luna_models_env(os.getenv("LUNA_MODELS", ""))
    source = configured if configured else build_auto_catalog()
    models = [e.to_dict() for e in source if _is_provider_available(e)]
    if not models:
        return {
            "ok": False,
            "error": "Nenhum modelo disponível. Defina LUNA_MODELS no `.env` ou chaves API.",
        }
    return {"ok": True, "models": models}


def parse_llm_selection(raw: dict | None) -> dict | None:
    if not raw or not isinstance(raw, dict):
        return None
    provider = str(raw.get("llm_provider", "")).strip().lower()
    model = str(raw.get("llm_model", "")).strip()
    if not provider or not model or provider not in VALID_PROVIDERS:
        return None
    return {"provider": provider, "model": model}


def with_llm_selection(selection: dict, raw: dict) -> dict:
    out = dict(raw)
    out["llm_provider"] = selection["provider"]
    out["llm_model"] = selection["model"]
    return out
