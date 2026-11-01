"""Dependencias de autenticación."""

from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .config import ACCESS_COOKIE
from .db import get_db
from .models import User
from .security import decode_token


async def optional_user(
    request: Request, db: AsyncSession = Depends(get_db)
) -> User | None:
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        return None

    subject = decode_token(token, "access")
    if not subject:
        return None

    user = await db.get(User, subject)
    if user is None or not user.is_active:
        return None
    return user


async def current_user(
    user: User | None = Depends(optional_user),
) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "No autenticado", "code": "unauthorized"},
        )
    return user
