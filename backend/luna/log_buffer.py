from __future__ import annotations

import threading
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone

_MAX = 500
_lock = threading.Lock()
_entries: deque[dict] = deque(maxlen=_MAX)


@dataclass
class LogEntry:
    ts: str
    level: str
    tag: str
    message: str

    def to_dict(self) -> dict:
        return {
            "ts": self.ts,
            "level": self.level,
            "tag": self.tag,
            "message": self.message,
        }


def append_log(level: str, tag: str, message: str) -> None:
    entry = LogEntry(
        ts=datetime.now(timezone.utc).isoformat(),
        level=level,
        tag=tag,
        message=message,
    )
    with _lock:
        _entries.append(entry.to_dict())
    print(f"[{level}] [{tag}] {message}")


def get_recent_logs(limit: int = 120) -> list[dict]:
    with _lock:
        items = list(_entries)
    return items[-limit:]


def get_recent_logs_text(limit: int = 120) -> str:
    lines = []
    for e in get_recent_logs(limit):
        lines.append(f"{e.get('ts', '')} [{e.get('level', '')}] {e.get('tag', '')}: {e.get('message', '')}")
    return "\n".join(lines)
