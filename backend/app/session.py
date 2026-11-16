"""Emisión, rotación y borrado de las cookies de sesión."""

from __future__ import annotations

from fastapi import Response
from sqlalchemy.ext.asyncio import AsyncSession

from .config import (
    ACCESS_COOKIE,
    CSRF_COOKIE,
    REFRESH_COOKIE,
    get_settings,
)
from .models import User
from .security import create_token, new_csrf_token, token_fingerprint


def _cookie(response: Response, name: str, value: str, max_age: int, http_only: bool) -> None:
    settings = get_settings()
    response.set_cookie(
        key=name,
        value=value,
        max_age=max_age,
        expires=max_age,
        path="/",
        httponly=http_only,
        secure=settings.cookie_secure,
        samesite="lax",
    )


async def issue_session(response: Response, user: User, db: AsyncSession) -> None:
    """Crea access + refresh, guarda la huella del refresh y rota el CSRF."""
    settings = get_settings()
    access = create_token(user.id, "access", settings.access_ttl)
    refresh = create_token(user.id, "refresh", settings.refresh_ttl)

    user.refresh_hash = token_fingerprint(refresh)
    await db.commit()

    _cookie(response, ACCESS_COOKIE, access, settings.access_ttl, True)
    _cookie(response, REFRESH_COOKIE, refresh, settings.refresh_ttl, True)
    _cookie(response, CSRF_COOKIE, new_csrf_token(), settings.refresh_ttl, False)


def clear_session(response: Response) -> None:
    settings = get_settings()
    for name in (ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE):
        response.delete_cookie(
            key=name,
            path="/",
            secure=settings.cookie_secure,
            samesite="lax",
        )
    # Un CSRF nuevo tras salir, por si el navegador conserva la página abierta.
    _cookie(response, CSRF_COOKIE, new_csrf_token(), 3600, False)


__all__ = ["issue_session", "clear_session"]
