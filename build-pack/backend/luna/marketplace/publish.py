from __future__ import annotations

import json
import os
import re
import zipfile
from io import BytesIO
from typing import Any

from fastapi import HTTPException

from ..auth.firebase import _ensure_app
from .account import (
    apply_account_to_listing,
    require_lunar_publisher,
    save_publication_for_user,
)
from .catalog import (
    CATALOG_OBJECT_PATH,
    load_catalog_from_hosting,
    load_catalog_from_storage,
    merge_listing,
    save_catalog_to_storage,
)
from .limits import MARKETPLACE_ZIP_MAX_BYTES, MARKETPLACE_ZIP_MAX_MB
from .storage_urls import (
    banner_object_path,
    plugin_zip_object_path,
    screenshot_object_path,
    storage_public_url,
)

_PLUGIN_ID_RE = re.compile(r"^[a-z][a-z0-9-]{1,48}$")
_VALID_CATEGORIES = {
    "starter",
    "demo",
    "productivity",
    "integration",
    "utility",
    "community",
}
_VALID_PERMISSIONS = {
    "tools",
    "commands",
    "hooks",
    "storage",
    "settings",
    "ui",
}


def _env_bool(key: str) -> bool:
    return os.getenv(key, "").strip().lower() in ("1", "true", "yes")


def _storage_bucket():
    if not _ensure_app():
        raise HTTPException(
            status_code=503,
            detail="Firebase Admin não configurado (FIREBASE_SERVICE_ACCOUNT_PATH).",
        )
    from firebase_admin import storage

    bucket_name = (
        os.getenv("FIREBASE_STORAGE_BUCKET", "").strip()
        or os.getenv("VITE_FIREBASE_STORAGE_BUCKET", "").strip()
    )
    project_id = os.getenv("VITE_FIREBASE_PROJECT_ID", "").strip()
    if not bucket_name and project_id:
        bucket_name = f"{project_id}.appspot.com"
    if not bucket_name:
        raise HTTPException(
            status_code=503,
            detail="Defina FIREBASE_STORAGE_BUCKET ou VITE_FIREBASE_STORAGE_BUCKET.",
        )
    return storage.bucket(bucket_name)


def _find_plugin_manifest(zf: zipfile.ZipFile) -> dict:
    names = [n.replace("\\", "/") for n in zf.namelist() if not n.endswith("/")]
    candidates: list[str] = []
    for name in names:
        base = name.rsplit("/", 1)[-1]
        if base == "plugin.json":
            candidates.append(name)
    if not candidates:
        raise HTTPException(
            status_code=400,
            detail="O zip deve conter plugin.json na raiz ou numa pasta.",
        )
    candidates.sort(key=lambda p: (p.count("/"), len(p)))
    try:
        raw = zf.read(candidates[0]).decode("utf-8")
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="plugin.json inválido.") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="plugin.json deve ser um objeto.")
    return data


def inspect_addon_zip(zip_bytes: bytes) -> dict:
    if len(zip_bytes) > MARKETPLACE_ZIP_MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Zip muito grande (máx. {MARKETPLACE_ZIP_MAX_MB} MB).",
        )
    try:
        zf = zipfile.ZipFile(BytesIO(zip_bytes))
    except zipfile.BadZipFile as exc:
        raise HTTPException(status_code=400, detail="Arquivo zip inválido.") from exc

    manifest = _find_plugin_manifest(zf)
    plugin_id = str(manifest.get("id") or "").strip()
    if not plugin_id or not _PLUGIN_ID_RE.match(plugin_id):
        raise HTTPException(
            status_code=400,
            detail="plugin.json: id inválido (minúsculas, hífens, ex.: meu-addon).",
        )
    return {
        "manifest": manifest,
        "pluginId": plugin_id,
        "name": str(manifest.get("name") or plugin_id),
        "version": str(manifest.get("version") or "1.0.0"),
        "description": str(manifest.get("description") or ""),
        "permissions": manifest.get("permissions") if isinstance(manifest.get("permissions"), list) else [],
        "trusted": bool(manifest.get("trusted")),
    }


def _parse_json_field(raw: str | None, fallback: Any) -> Any:
    if raw is None or not str(raw).strip():
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="JSON inválido no formulário.") from exc


def _parse_tags(raw: str | None) -> list[str]:
    if not raw or not raw.strip():
        return []
    if raw.strip().startswith("["):
        parsed = _parse_json_field(raw, [])
        if isinstance(parsed, list):
            return [str(t).strip() for t in parsed if str(t).strip()]
    return [t.strip() for t in raw.split(",") if t.strip()]


def _ext_from_content_type(content_type: str | None, default: str = "png") -> str:
    if not content_type:
        return default
    ct = content_type.lower()
    if "jpeg" in ct or "jpg" in ct:
        return "jpg"
    if "webp" in ct:
        return "webp"
    if "gif" in ct:
        return "gif"
    return default


def _upload_bytes(bucket, object_path: str, data: bytes, content_type: str) -> str:
    blob = bucket.blob(object_path)
    blob.upload_from_string(data, content_type=content_type)
    return storage_public_url(bucket.name, object_path)


async def publish_marketplace_addon(
    uid: str,
    *,
    zip_bytes: bytes,
    listing_json: str,
    profile_json: str | None,
    banner_bytes: bytes | None,
    banner_content_type: str | None,
    screenshot_files: list[tuple[bytes, str | None, str | None]],
) -> dict:
    lunar_profile = require_lunar_publisher(uid)

    inspected = inspect_addon_zip(zip_bytes)
    listing_data = _parse_json_field(listing_json, {})
    if not isinstance(listing_data, dict):
        raise HTTPException(status_code=400, detail="listing inválido.")

    plugin_id = inspected["pluginId"]
    version = str(listing_data.get("version") or inspected["version"]).strip()
    if not version:
        raise HTTPException(status_code=400, detail="Versão obrigatória.")

    name = str(listing_data.get("name") or inspected["name"]).strip()
    description = str(listing_data.get("description") or inspected["description"]).strip()
    if not name or not description:
        raise HTTPException(status_code=400, detail="Nome e descrição curta são obrigatórios.")

    category = str(listing_data.get("category") or "utility").strip()
    if category not in _VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Categoria inválida: {category}")

    author = str(listing_data.get("author") or "Comunidade Luna").strip()
    tags = listing_data.get("tags")
    if isinstance(tags, list):
        tag_list = [str(t).strip() for t in tags if str(t).strip()]
    else:
        tag_list = _parse_tags(str(listing_data.get("tags") or ""))

    perms = listing_data.get("permissions")
    if isinstance(perms, list):
        perm_list = [str(p).strip() for p in perms if str(p).strip()]
    else:
        perm_list = [str(p) for p in inspected.get("permissions") or []]
    for p in perm_list:
        if p not in _VALID_PERMISSIONS:
            raise HTTPException(status_code=400, detail=f"Permissão inválida: {p}")

    repository_url = listing_data.get("repositoryUrl")
    homepage_url = listing_data.get("homepageUrl")

    profile = _parse_json_field(profile_json, None) if profile_json else None
    if profile is not None and not isinstance(profile, dict):
        raise HTTPException(status_code=400, detail="profile inválido.")

    bucket = _storage_bucket()

    zip_path = plugin_zip_object_path(plugin_id, version)
    install_url = _upload_bytes(bucket, zip_path, zip_bytes, "application/zip")

    banner_url = None
    if banner_bytes:
        ext = _ext_from_content_type(banner_content_type)
        banner_path = banner_object_path(plugin_id, ext)
        ct = banner_content_type or f"image/{ext}"
        banner_url = _upload_bytes(bucket, banner_path, banner_bytes, ct)

    if profile and isinstance(profile.get("screenshots"), list):
        shots = profile["screenshots"]
        for i, shot in enumerate(shots):
            if not isinstance(shot, dict):
                continue
            url = shot.get("url")
            if isinstance(url, str) and url.startswith("__UPLOAD_SCREENSHOT_"):
                idx = int(url.replace("__UPLOAD_SCREENSHOT_", "").replace("__", "") or "0")
                if idx < len(screenshot_files):
                    data, ct, _caption = screenshot_files[idx]
                    ext = _ext_from_content_type(ct)
                    path = screenshot_object_path(plugin_id, i + 1, ext)
                    shot["url"] = _upload_bytes(
                        bucket, path, data, ct or f"image/{ext}"
                    )
        profile["screenshots"] = [
            s for s in shots if isinstance(s, dict) and s.get("url")
        ]

    listing: dict[str, Any] = {
        "id": plugin_id,
        "pluginId": plugin_id,
        "name": name,
        "description": description,
        "version": version,
        "author": author,
        "category": category,
        "tags": tag_list,
        "install": {"type": "url", "url": install_url},
        "permissions": perm_list,
    }
    if banner_url:
        listing["bannerUrl"] = banner_url
        listing["iconUrl"] = banner_url
    if isinstance(repository_url, str) and repository_url.strip():
        listing["repositoryUrl"] = repository_url.strip()
    if isinstance(homepage_url, str) and homepage_url.strip():
        listing["homepageUrl"] = homepage_url.strip()
    listing, profile = apply_account_to_listing(
        listing, profile, lunar_profile, uid
    )
    if profile:
        listing["profile"] = profile

    project_id = os.getenv("VITE_FIREBASE_PROJECT_ID", "").strip()
    catalog = load_catalog_from_storage(bucket, None)
    if not catalog.get("items") and project_id:
        catalog = load_catalog_from_hosting(project_id)
    existing = next(
        (
            item
            for item in catalog.get("items", [])
            if isinstance(item, dict)
            and (item.get("pluginId") == plugin_id or item.get("id") == plugin_id)
        ),
        None,
    )
    # Destaques e selo verificado são definidos pela LunarCore — preserva ou false em novos.
    listing["featured"] = bool(existing.get("featured")) if existing else False
    listing["trusted"] = bool(existing.get("trusted")) if existing else False
    merged = merge_listing(catalog, listing)
    catalog_url = save_catalog_to_storage(bucket, merged, None)

    profile_blob_path = f"marketplace/listings/{plugin_id}.profile.json"
    if profile:
        bucket.blob(profile_blob_path).upload_from_string(
            json.dumps(profile, ensure_ascii=False, indent=2).encode("utf-8"),
            content_type="application/json; charset=utf-8",
        )

    save_publication_for_user(
        uid,
        plugin_id=plugin_id,
        version=version,
        name=name,
        install_url=install_url,
        catalog_url=catalog_url,
        listing=listing,
    )

    return {
        "ok": True,
        "pluginId": plugin_id,
        "version": version,
        "installUrl": install_url,
        "bannerUrl": banner_url,
        "catalogUrl": catalog_url,
        "catalogObjectPath": CATALOG_OBJECT_PATH,
        "publishedByUid": uid,
        "listing": listing,
    }
