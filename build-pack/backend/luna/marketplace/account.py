from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from ..auth.firebase import _ensure_app

_USERS_COLLECTION = "users"
_PUBLICATIONS_SUB = "marketplacePublications"


def _env_bool(key: str) -> bool:
    return os.getenv(key, "").strip().lower() in ("1", "true", "yes")


def _lunarcore_uids() -> set[str]:
    raw = os.getenv("LUNA_MARKETPLACE_PUBLISHER_UIDS", "").strip()
    if not raw:
        return set()
    return {x.strip() for x in raw.split(",") if x.strip()}


def load_lunar_user_profile(uid: str) -> dict[str, Any] | None:
    if not _ensure_app():
        return None
    try:
        from firebase_admin import firestore

        snap = firestore.client().collection(_USERS_COLLECTION).document(uid).get()
        if not snap.exists:
            return None
        data = snap.to_dict()
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def can_publish_with_lunar_account(uid: str) -> bool:
    if _env_bool("LUNA_MARKETPLACE_PUBLISH_OPEN"):
        return True
    if uid in _lunarcore_uids():
        return True
    profile = load_lunar_user_profile(uid)
    if not profile:
        # Conta autenticada sem doc ainda — permite (perfil é criado no login).
        return True
    entitlements = profile.get("entitlements")
    if not isinstance(entitlements, dict):
        return True
    return entitlements.get("marketplacePublish", True) is not False


def require_lunar_publisher(uid: str) -> dict[str, Any]:
    if not can_publish_with_lunar_account(uid):
        raise HTTPException(
            status_code=403,
            detail=(
                "A sua Conta Lunar não tem permissão para publicar na loja. "
                "Contacte o suporte Luna."
            ),
        )
    profile = load_lunar_user_profile(uid) or {}
    return profile


def publisher_from_lunar_profile(
    profile: dict[str, Any], uid: str
) -> dict[str, str | None]:
    display = str(profile.get("displayName") or "").strip()
    email = str(profile.get("email") or "").strip()
    photo = profile.get("photoURL")
    photo_url = str(photo).strip() if isinstance(photo, str) and photo.strip() else None

    if display:
        name = display
    elif email:
        name = email.split("@", 1)[0]
    else:
        name = "Comunidade Luna"

    if email and "@" in email:
        handle = f"@{email.split('@', 1)[0]}"
    else:
        handle = f"@{uid[:8]}"

    return {"name": name, "handle": handle, "avatarUrl": photo_url}


def apply_account_to_listing(
    listing: dict[str, Any],
    profile_block: dict[str, Any] | None,
    lunar_profile: dict[str, Any],
    uid: str,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    pub = publisher_from_lunar_profile(lunar_profile, uid)
    author_default = pub["name"] or "Comunidade Luna"

    author = str(listing.get("author") or "").strip()
    if not author or author == "Comunidade Luna":
        listing["author"] = author_default

    listing["publishedByUid"] = uid
    listing["publishedByEmail"] = str(lunar_profile.get("email") or "").strip() or None

    profile_out = dict(profile_block) if profile_block else {}
    existing_pub = profile_out.get("publisher")
    if not isinstance(existing_pub, dict):
        existing_pub = {}

    merged_pub = {
        "name": str(existing_pub.get("name") or "").strip() or pub["name"],
        "handle": str(existing_pub.get("handle") or "").strip() or pub["handle"],
        "url": existing_pub.get("url"),
        "avatarUrl": existing_pub.get("avatarUrl") or pub.get("avatarUrl"),
    }
    profile_out["publisher"] = {k: v for k, v in merged_pub.items() if v}
    return listing, profile_out if profile_out else None


def save_publication_for_user(
    uid: str,
    *,
    plugin_id: str,
    version: str,
    name: str,
    install_url: str,
    catalog_url: str,
    listing: dict[str, Any],
) -> None:
    if not _ensure_app():
        return
    try:
        from firebase_admin import firestore

        now = datetime.now(timezone.utc).isoformat()
        ref = (
            firestore.client()
            .collection(_USERS_COLLECTION)
            .document(uid)
            .collection(_PUBLICATIONS_SUB)
            .document(plugin_id)
        )
        ref.set(
            {
                "pluginId": plugin_id,
                "version": version,
                "name": name,
                "installUrl": install_url,
                "catalogUrl": catalog_url,
                "publishedAt": now,
                "updatedAt": now,
                "listingSnapshot": {
                    "description": listing.get("description"),
                    "category": listing.get("category"),
                    "tags": listing.get("tags"),
                    "trusted": listing.get("trusted"),
                    "featured": listing.get("featured"),
                },
            },
            merge=True,
        )
    except Exception:
        pass


def list_user_publications(uid: str) -> list[dict[str, Any]]:
    if not _ensure_app():
        return []
    try:
        from firebase_admin import firestore

        snaps = (
            firestore.client()
            .collection(_USERS_COLLECTION)
            .document(uid)
            .collection(_PUBLICATIONS_SUB)
            .stream()
        )
        out: list[dict[str, Any]] = []
        for snap in snaps:
            data = snap.to_dict()
            if isinstance(data, dict):
                out.append({"id": snap.id, **data})
        out.sort(key=lambda x: str(x.get("updatedAt") or ""), reverse=True)
        return out
    except Exception:
        return []
