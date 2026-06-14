from __future__ import annotations

import json
from datetime import date
from typing import Any

import httpx

from .storage_urls import storage_public_url

CATALOG_OBJECT_PATH = "marketplace/marketplace-catalog.json"


def _parse_catalog(raw: Any) -> dict:
    if not isinstance(raw, dict):
        return {"version": 2, "updatedAt": date.today().isoformat(), "items": []}
    items = raw.get("items")
    if not isinstance(items, list):
        items = []
    return {
        "version": int(raw.get("version") or 2),
        "updatedAt": str(raw.get("updatedAt") or date.today().isoformat()),
        "items": items,
    }


def load_catalog_from_storage(bucket, storage_module) -> dict:
    blob = bucket.blob(CATALOG_OBJECT_PATH)
    if not blob.exists():
        return {"version": 2, "updatedAt": date.today().isoformat(), "items": []}
    text = blob.download_as_text(encoding="utf-8")
    return _parse_catalog(json.loads(text))


def load_catalog_from_hosting(project_id: str) -> dict:
    url = f"https://{project_id}.web.app/marketplace-catalog.json"
    try:
        res = httpx.get(url, timeout=15.0, follow_redirects=True)
        if res.status_code == 200:
            return _parse_catalog(res.json())
    except Exception:
        pass
    return {"version": 2, "updatedAt": date.today().isoformat(), "items": []}


def merge_listing(catalog: dict, listing: dict) -> dict:
    plugin_id = listing.get("pluginId") or listing.get("id")
    items = [
        item
        for item in catalog.get("items", [])
        if isinstance(item, dict)
        and item.get("pluginId") != plugin_id
        and item.get("id") != plugin_id
    ]
    items.append(listing)
    return {
        "version": 2,
        "updatedAt": date.today().isoformat(),
        "items": items,
    }


def save_catalog_to_storage(bucket, catalog: dict, storage_module) -> str:
    blob = bucket.blob(CATALOG_OBJECT_PATH)
    payload = json.dumps(catalog, ensure_ascii=False, indent=2).encode("utf-8")
    blob.upload_from_string(payload, content_type="application/json; charset=utf-8")
    return storage_public_url(bucket.name, CATALOG_OBJECT_PATH)
