from __future__ import annotations

import os

MAX_CHUNK = 4500


def _split_chunks(text: str) -> list[str]:
    if len(text) <= MAX_CHUNK:
        return [text]
    parts: list[str] = []
    rest = text
    while len(rest) > MAX_CHUNK:
        cut = rest.rfind("\n\n", 0, MAX_CHUNK)
        if cut < MAX_CHUNK * 0.4:
            cut = rest.rfind("\n", 0, MAX_CHUNK)
        if cut < MAX_CHUNK * 0.4:
            cut = rest.rfind(" ", 0, MAX_CHUNK)
        if cut < 1:
            cut = MAX_CHUNK
        parts.append(rest[:cut])
        rest = rest[cut:].lstrip()
    if rest:
        parts.append(rest)
    return parts


async def translate_text(text: str, *, to: str = "pt", from_lang: str | None = None) -> dict:
    trimmed = (text or "").strip()
    if not trimmed:
        return {"ok": True, "text": ""}
    try:
        from deep_translator import GoogleTranslator
    except ImportError:
        return {"ok": False, "error": "deep-translator não instalado."}

    engine = (os.getenv("TRANSLATE_ENGINE") or "google").strip().lower()
    if engine != "google":
        return {"ok": False, "error": f"Motor {engine} ainda não portado; use google."}

    try:
        translator = GoogleTranslator(source=from_lang or "auto", target=to)
        chunks = _split_chunks(trimmed)
        out: list[str] = []
        for ch in chunks:
            out.append(translator.translate(ch))
        return {"ok": True, "text": "".join(out)}
    except Exception as e:
        return {"ok": False, "error": str(e)}
