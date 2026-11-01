"""Contenido editorial servido desde JSON, con caché corta en el navegador."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/content", tags=["content"])

LOCALES = ("es", "en", "fr", "ru")
CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"


def _load(locale: str) -> tuple[dict, datetime]:
    path = CONTENT_DIR / f"{locale}.json"
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    updated = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    payload["locale"] = locale
    payload["updatedAt"] = updated.isoformat()
    return payload, updated


@router.get("/{locale}")
async def content(locale: str) -> JSONResponse:
    if locale not in LOCALES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Idioma no disponible", "code": "unknown_locale"},
        )

    try:
        payload, _ = _load(locale)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Contenido no disponible", "code": "no_content"},
        ) from None

    return JSONResponse(
        payload,
        headers={
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
    )
