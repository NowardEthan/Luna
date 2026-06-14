from __future__ import annotations

import time
from collections import defaultdict

_WINDOW_SEC = 60
_MAX_PER_WINDOW = 120

_buckets: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(uid: str) -> None:
    now = time.time()
    window_start = now - _WINDOW_SEC
    hits = _buckets[uid]
    _buckets[uid] = [t for t in hits if t >= window_start]
    if len(_buckets[uid]) >= _MAX_PER_WINDOW:
        from fastapi import HTTPException

        raise HTTPException(status_code=429, detail="Limite de pedidos excedido.")
    _buckets[uid].append(now)
