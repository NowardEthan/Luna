from __future__ import annotations

import json
import math
import sqlite3
from pathlib import Path

from ..config import env_int
from ..llm.router import llm_embed

EMBED_BATCH = env_int("CHAT_MEMORY_EMBED_BATCH", 24, 1, 128)
TOP_K = env_int("CHAT_MEMORY_TOP_K", 8, 1, 50)
MAX_BLOCK = env_int("CHAT_MEMORY_MAX_CHARS", 2800, 200, 50_000)
MSG_CHUNK = 1000


def _cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0


class ConversationMemoryService:
    def __init__(self, data_dir: Path) -> None:
        self.db_path = data_dir / "conversation-memory.sqlite"
        self._conn: sqlite3.Connection | None = None

    def init(self) -> None:
        data_dir = self.db_path.parent
        data_dir.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path)
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS conv_chunks (
              chunk_key TEXT PRIMARY KEY,
              conv_id TEXT NOT NULL,
              conv_title TEXT NOT NULL,
              kind TEXT NOT NULL,
              message_id TEXT,
              text TEXT NOT NULL,
              embedding TEXT NOT NULL
            )
            """
        )
        self._conn.commit()

    def get_status(self) -> dict:
        if not self._conn:
            return {"ok": False, "error": "Índice não inicializado.", "chunkCount": 0}
        row = self._conn.execute("SELECT COUNT(*) FROM conv_chunks").fetchone()
        return {"ok": True, "chunkCount": int(row[0]) if row else 0}

    def clear_index(self) -> dict:
        if not self._conn:
            return {"ok": False, "error": "Índice não inicializado."}
        self._conn.execute("DELETE FROM conv_chunks")
        self._conn.commit()
        return {"ok": True}

    def _message_text(self, m: dict) -> str:
        t = str(m.get("text") or "")
        vd = str(m.get("visionDescription") or m.get("vision_description") or "").strip()
        if vd:
            t = f"{t}\n\n[Descrição visual]\n{vd}"
        return " ".join(t.split())

    def _build_chunks(self, payload: dict) -> list[dict]:
        convs = payload.get("conversations") or []
        out: list[dict] = []
        for c in convs:
            if not isinstance(c, dict):
                continue
            cid = str(c.get("id") or "")
            title = str(c.get("title") or "Conversa")
            for m in c.get("messages") or []:
                if not isinstance(m, dict):
                    continue
                role = m.get("role")
                if role not in ("user", "assistant"):
                    continue
                plain = self._message_text(m)
                if not plain:
                    continue
                mid = str(m.get("id") or "")
                parts = [plain[i : i + MSG_CHUNK] for i in range(0, len(plain), MSG_CHUNK)] or [plain]
                for i, part in enumerate(parts):
                    key = f"{cid}|msg|{mid}|{i}"
                    out.append(
                        {
                            "chunk_key": key,
                            "conv_id": cid,
                            "conv_title": title,
                            "kind": "message",
                            "message_id": mid,
                            "text": part,
                        }
                    )
        return out

    async def sync_from_payload(self, payload: dict) -> dict:
        if not self._conn:
            return {"ok": False, "error": "Índice não inicializado."}
        desired = self._build_chunks(payload)
        desired_keys = {d["chunk_key"] for d in desired}
        existing = {r[0] for r in self._conn.execute("SELECT chunk_key FROM conv_chunks").fetchall()}
        to_delete = existing - desired_keys
        to_add = [d for d in desired if d["chunk_key"] not in existing]

        for key in to_delete:
            self._conn.execute("DELETE FROM conv_chunks WHERE chunk_key = ?", (key,))

        for i in range(0, len(to_add), EMBED_BATCH):
            batch = to_add[i : i + EMBED_BATCH]
            texts = [b["text"] for b in batch]
            emb = await llm_embed(texts)
            if not emb.get("ok"):
                return {"ok": False, "error": emb.get("error", "embed falhou"), "partial": True}
            for row, vec in zip(batch, emb["vectors"]):
                self._conn.execute(
                    """INSERT OR REPLACE INTO conv_chunks
                       (chunk_key, conv_id, conv_title, kind, message_id, text, embedding)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        row["chunk_key"],
                        row["conv_id"],
                        row["conv_title"],
                        row["kind"],
                        row["message_id"],
                        row["text"],
                        json.dumps(vec),
                    ),
                )
        self._conn.commit()
        return {"ok": True, "synced": len(desired), "added": len(to_add), "removed": len(to_delete)}

    async def retrieve(self, query: str) -> dict:
        q = (query or "").strip()
        if not q or not self._conn:
            return {"ok": True, "block": "", "hits": []}
        emb = await llm_embed([q])
        if not emb.get("ok"):
            return {"ok": False, "error": emb.get("error")}
        qvec = emb["vectors"][0]
        rows = self._conn.execute(
            "SELECT conv_id, conv_title, text, embedding FROM conv_chunks"
        ).fetchall()
        scored = []
        for cid, title, text, emb_json in rows:
            scored.append((_cosine(qvec, json.loads(emb_json)), cid, title, text))
        scored.sort(reverse=True)
        hits = []
        parts = []
        total = 0
        for score, cid, title, text in scored[:TOP_K]:
            if score <= 0:
                continue
            line = f"• [{title}] {text[:300]}"
            hits.append({"conversationId": cid, "title": title, "score": score})
            if total + len(line) < MAX_BLOCK:
                parts.append(line)
                total += len(line)
        return {"ok": True, "block": "\n".join(parts), "hits": hits}
