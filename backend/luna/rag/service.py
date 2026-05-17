from __future__ import annotations

import json
import math
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from ..config import env_int
from ..llm.router import llm_embed

IGNORE_DIRS = frozenset(
    {"node_modules", ".git", "dist", "build", ".next", "coverage", "__pycache__", ".venv", "venv"}
)
EXTENSIONS = frozenset(
    {
        ".md", ".txt", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json",
        ".html", ".htm", ".css", ".scss", ".less", ".csv", ".log", ".py", ".rs",
        ".go", ".yaml", ".yml", ".xml", ".sql", ".sh", ".env",
    }
)

CHUNK_SIZE = 800
CHUNK_OVERLAP = 120
EMBED_BATCH = env_int("RAG_EMBED_BATCH", 32, 1, 128)
TOP_K = env_int("RAG_TOP_K", 6, 1, 50)
MAX_CONTEXT = env_int("RAG_MAX_CONTEXT_CHARS", 4500, 500, 50_000)


def _cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0


def _chunk_text(text: str) -> list[str]:
    chunks: list[str] = []
    step = CHUNK_SIZE - CHUNK_OVERLAP
    norm = text.replace("\r\n", "\n")
    i = 0
    while i < len(norm):
        piece = norm[i : i + CHUNK_SIZE].strip()
        if piece:
            chunks.append(piece)
        if i + CHUNK_SIZE >= len(norm):
            break
        i += step
    return chunks


class RagService:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.db_path = data_dir / "rag.sqlite"
        self._conn: sqlite3.Connection | None = None

    def init(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path)
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chunks (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              source_path TEXT NOT NULL,
              chunk_index INTEGER NOT NULL,
              text TEXT NOT NULL,
              embedding TEXT NOT NULL
            )
            """
        )
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rag_meta (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            )
            """
        )
        self._conn.commit()

    def _set_meta(self, key: str, value: str) -> None:
        assert self._conn
        self._conn.execute("DELETE FROM rag_meta WHERE key = ?", (key,))
        self._conn.execute("INSERT INTO rag_meta (key, value) VALUES (?, ?)", (key, value))
        self._conn.commit()

    def get_status(self) -> dict:
        if not self._conn:
            return {"ok": False, "error": "Índice não inicializado.", "chunkCount": 0}
        row = self._conn.execute("SELECT COUNT(*) FROM chunks").fetchone()
        count = int(row[0]) if row else 0
        folder = ""
        indexed_at = ""
        r = self._conn.execute("SELECT value FROM rag_meta WHERE key = 'indexed_folder'").fetchone()
        if r:
            folder = str(r[0])
        r2 = self._conn.execute("SELECT value FROM rag_meta WHERE key = 'indexed_at'").fetchone()
        if r2:
            indexed_at = str(r2[0])
        return {"ok": True, "chunkCount": count, "indexedFolder": folder, "indexedAt": indexed_at}

    def clear_index(self) -> dict:
        if not self._conn:
            return {"ok": False, "error": "Índice não inicializado."}
        self._conn.execute("DELETE FROM chunks")
        self._conn.execute("DELETE FROM rag_meta")
        self._conn.commit()
        return {"ok": True}

    def _collect_files(self, root: Path) -> list[Path]:
        out: list[Path] = []
        if not root.is_dir():
            return out
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
            for name in filenames:
                p = Path(dirpath) / name
                if p.suffix.lower() in EXTENSIONS:
                    out.append(p)
        return out

    async def _embed_and_persist(self, flat: list[dict], meta_folder: str, files_scanned: int) -> dict:
        assert self._conn
        self._conn.execute("DELETE FROM chunks")
        for i in range(0, len(flat), EMBED_BATCH):
            batch = flat[i : i + EMBED_BATCH]
            texts = [b["text"] for b in batch]
            emb = await llm_embed(texts)
            if not emb.get("ok"):
                return {"ok": False, "error": emb.get("error"), "indexed": i}
            vectors = emb.get("vectors") or []
            if len(vectors) != len(batch):
                return {"ok": False, "error": "Embeddings inconsistentes.", "indexed": i}
            for row, vec in zip(batch, vectors):
                self._conn.execute(
                    "INSERT INTO chunks (source_path, chunk_index, text, embedding) VALUES (?, ?, ?, ?)",
                    (row["source_path"], row["chunk_index"], row["text"], json.dumps(vec)),
                )
        self._set_meta("indexed_folder", meta_folder)
        self._set_meta("indexed_at", datetime.now(timezone.utc).isoformat())
        self._conn.commit()
        return {
            "ok": True,
            "filesScanned": files_scanned,
            "chunksIndexed": len(flat),
            "folder": meta_folder,
        }

    async def index_folder(self, folder_path: str) -> dict:
        folder = Path(folder_path).resolve()
        if not folder.is_dir():
            return {"ok": False, "error": "Pasta inválida."}
        files = self._collect_files(folder)
        flat: list[dict] = []
        for fp in files:
            try:
                text = fp.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            for idx, ch in enumerate(_chunk_text(text)):
                flat.append({"source_path": str(fp), "chunk_index": idx, "text": ch})
        return await self._embed_and_persist(flat, str(folder), len(files))

    async def index_file_paths(self, paths: list[str]) -> dict:
        flat: list[dict] = []
        scanned = 0
        for p in paths:
            fp = Path(p).resolve()
            if not fp.is_file() or fp.suffix.lower() not in EXTENSIONS:
                continue
            scanned += 1
            try:
                text = fp.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            for idx, ch in enumerate(_chunk_text(text)):
                flat.append({"source_path": str(fp), "chunk_index": idx, "text": ch})
        return await self._embed_and_persist(flat, "", scanned)

    async def retrieve(self, query: str) -> dict:
        q = query.strip()
        if not q:
            return {"ok": False, "error": "Consulta vazia."}
        if not self._conn:
            return {"ok": False, "error": "Índice não inicializado."}
        emb = await llm_embed([q])
        if not emb.get("ok"):
            return {"ok": False, "error": emb.get("error")}
        qvec = emb["vectors"][0]
        rows = self._conn.execute("SELECT source_path, text, embedding FROM chunks").fetchall()
        scored: list[tuple[float, str, str]] = []
        for path, text, emb_json in rows:
            vec = json.loads(emb_json)
            scored.append((_cosine(qvec, vec), path, text))
        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:TOP_K]
        citations = []
        context_parts = []
        total = 0
        for score, path, text in top:
            if score <= 0:
                continue
            preview = text[:400]
            citations.append({"path": path, "preview": preview})
            block = f"[{path}]\n{text}\n"
            if total + len(block) > MAX_CONTEXT:
                break
            context_parts.append(block)
            total += len(block)
        return {
            "ok": True,
            "context": "\n---\n".join(context_parts),
            "citations": citations,
        }
