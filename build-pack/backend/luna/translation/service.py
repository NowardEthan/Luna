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


import httpx

def _google_target(lang: str) -> str:
    """Luna `pt` → Google `pt-BR` (evita português de Portugal)."""
    m = (lang or "pt").strip().lower()
    if m == "pt":
        return "pt-BR"
    if m == "zh":
        return "zh-CN"
    return m


async def translate_text(text: str, *, to: str = "pt", from_lang: str | None = None) -> dict:
    trimmed = (text or "").strip()
    if not trimmed:
        return {"ok": True, "text": ""}

    engine = (os.getenv("TRANSLATE_ENGINE") or "google").strip().lower()
    if engine != "google":
        return {"ok": False, "error": f"Motor {engine} ainda não portado; use google."}

    api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY")
    if not api_key:
        return {"ok": False, "error": "Chave GOOGLE_TRANSLATE_API_KEY ausente. Configure no seu arquivo .env!"}

    try:
        chunks = _split_chunks(trimmed)
        url = "https://translation.googleapis.com/language/translate/v2"
        target = _google_target(to)
        payload = {
            "q": chunks,
            "target": target,
            "format": "text"
        }
        if from_lang and from_lang != "auto":
            payload["source"] = _google_target(from_lang)

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, params={"key": api_key}, json=payload, timeout=20.0)
            
            if resp.status_code != 200:
                err_msg = resp.text
                try:
                    data_err = resp.json()
                    if "error" in data_err and "message" in data_err["error"]:
                        err_msg = data_err["error"]["message"]
                except Exception:
                    pass
                return {"ok": False, "error": f"Erro do Google (HTTP {resp.status_code}): {err_msg}"}
            
            data = resp.json()
            translations = data.get("data", {}).get("translations", [])
            out = "".join(t.get("translatedText", "") for t in translations)
            return {"ok": True, "text": out}
            
    except Exception as e:
        return {"ok": False, "error": str(e)}
