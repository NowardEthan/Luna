from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_ROOT / ".env")

_CLOUD_DEPLOY = bool(
    os.getenv("RAILWAY_ENVIRONMENT")
    or os.getenv("RAILWAY_PROJECT_ID")
    or os.getenv("LUNA_DEPLOY_MODE", "").strip().lower() in ("cloud", "railway", "production")
)

# Railway injeta PORT; local dev usa LUNA_SERVER_PORT.
PORT = int(os.getenv("PORT") or os.getenv("LUNA_SERVER_PORT", "39281"))
HOST = os.getenv(
    "LUNA_SERVER_HOST",
    "0.0.0.0" if _CLOUD_DEPLOY else "127.0.0.1",
)


def resolve_data_dir() -> Path:
    raw = os.getenv("LUNA_DATA_DIR", "").strip()
    if raw:
        return Path(raw).resolve()
    appdata = os.getenv("APPDATA")
    if appdata:
        return Path(appdata) / "Luna" / "userData"
    return Path.home() / ".luna" / "userData"


def env_bool(key: str, default: str = "1") -> bool:
    v = os.getenv(key, default).strip().lower()
    return v not in ("0", "false", "no")


def env_int(key: str, default: int, min_v: int, max_v: int) -> int:
    try:
        n = int(os.getenv(key, str(default)))
    except ValueError:
        return default
    return max(min_v, min(max_v, n))
