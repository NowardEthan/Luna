from __future__ import annotations

from urllib.parse import quote


def storage_public_url(bucket: str, object_path: str) -> str:
    encoded = quote(object_path, safe="")
    return (
        f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded}?alt=media"
    )


def plugin_zip_object_path(plugin_id: str, version: str) -> str:
    return f"marketplace/plugins/{plugin_id}/{plugin_id}-{version}.zip"


def banner_object_path(plugin_id: str, ext: str = "png") -> str:
    return f"marketplace/assets/{plugin_id}/banner.{ext.lstrip('.')}"


def screenshot_object_path(plugin_id: str, index: int, ext: str = "png") -> str:
    return f"marketplace/assets/{plugin_id}/screenshot-{index}.{ext.lstrip('.')}"
