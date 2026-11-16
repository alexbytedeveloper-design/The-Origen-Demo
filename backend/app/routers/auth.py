"""Registro, acceso, refresco y salida."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import ACCESS_COOKIE, REFRESH_COOKIE
from ..db import get_db
from ..deps import optional_user
from ..login_guard import check_guards, guard_keys, register_failure, reset_guards
from ..models import User
from ..net import client_host
from ..rate_limit import limiter
from ..schemas import LoginIn, RegisterIn, UserOut
from ..security import (
    DUMMY_HASH,
    create_token,
    decode_token,
    hash_password,
    needs_rehash,
    token_fingerprint,
    verify_password,
)
from ..session import clear_session, issue_session

router = APIRouter(prefix="/auth", tags=["auth"])

LOCKOUT_MESSAGE = {
    "detail": "Demasiados intentos. Espera antes de volver a probar.",
    "code": "too_many_attempts",
}

BLOCKED_MESSAGE = {
    "detail": "Esta dirección quedó bloqueada. Contacta con el restaurante.",
    "code": "ip_blocked",
}


def _client_key(request: Request, bucket: str) -> str:
    return f"{bucket}:{client_host(request)}"


def _too_many(retry_after: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=LOCKOUT_MESSAGE,
        headers={"Retry-After": str(max(retry_after, 1))},
    )


def _blocked() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=BLOCKED_MESSAGE,
    )


@router.get("/csrf", status_code=status.HTTP_204_NO_CONTENT)
async def csrf() -> Response:
    """El middleware deja la cookie CSRF; esta ruta solo la fuerza."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    wait = limiter.hit(_client_key(request, "register"), limit=5, window=3600)
    if wait:
        raise _too_many(wait)

    email = payload.email.lower().strip()
    existing = await db.scalar(select(User.id).where(User.email == email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"detail": "Ese correo ya tiene una cuenta.", "code": "email_taken"},
        )

    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role="guest",
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"detail": "Ese correo ya tiene una cuenta.", "code": "email_taken"},
        ) from None

    await issue_session(response, user, db)
    return user


@router.post("/login", response_model=UserOut)
async def login(
    payload: LoginIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    wait = limiter.hit(_client_key(request, "login"), limit=10, window=60)
    if wait:
        raise _too_many(wait)

    email = payload.email.lower().strip()
    wait = limiter.hit(f"login-email:{email}", limit=10, window=60)
    if wait:
        raise _too_many(wait)

    keys = guard_keys(client_host(request), email)
    locked = await check_guards(db, keys)
    if locked is not None:
        if locked.blocked:
            raise _blocked()
        raise _too_many(locked.retry_after)

    async def failed() -> HTTPException:
        state = await register_failure(db, keys)
        if state is not None:
            if state.blocked:
                return _blocked()
            return _too_many(state.retry_after)
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "detail": "Correo o contraseña incorrectos.",
                "code": "invalid_credentials",
            },
        )

    user = await db.scalar(select(User).where(User.email == email))

    if user is None:
        verify_password(payload.password, DUMMY_HASH)
        raise await failed()

    if not user.is_active or not verify_password(payload.password, user.password_hash):
        raise await failed()

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(payload.password)

    await reset_guards(db, keys)
    await issue_session(response, user, db)
    return user


async def _rotate_refresh(
    request: Request, response: Response, db: AsyncSession
) -> User | None:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        return None

    subject = decode_token(token, "refresh")
    if not subject:
        return None

    user = await db.get(User, subject)
    if user is None or not user.is_active or not user.refresh_hash:
        return None

    if not secrets.compare_digest(user.refresh_hash, token_fingerprint(token)):
        # Un refresh que no coincide puede ser un token robado o una pestaña
        # vieja: se revoca la sesión y la persona vuelve a entrar.
        user.refresh_hash = None
        await db.commit()
        return None

    await issue_session(response, user, db)
    return user


@router.post("/refresh", response_model=UserOut)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await _rotate_refresh(request, response, db)
    if user is None:
        clear_session(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Sesión caducada", "code": "session_expired"},
        )
    return user


@router.get("/me", response_model=UserOut)
async def me(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = request.cookies.get(ACCESS_COOKIE)
    if token:
        subject = decode_token(token, "access")
        if subject:
            user = await db.get(User, subject)
            if user is not None and user.is_active:
                return user

    rotated = await _rotate_refresh(request, response, db)
    if rotated is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "No autenticado", "code": "unauthorized"},
        )
    return rotated


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    _: User | None = Depends(optional_user),
) -> Response:
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        subject = decode_token(token, "refresh")
        if subject:
            user = await db.get(User, subject)
            if user is not None:
                user.refresh_hash = None
                await db.commit()

    clear_session(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
