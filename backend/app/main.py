"""The Origen — API.

Un solo proceso FastAPI: sesiones con JWT en cookies httpOnly, CSRF de doble
envío, límite de peticiones y cabeceras de seguridad en todas las respuestas.
"""

from __future__ import annotations

import logging
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from .config import CSRF_COOKIE, CSRF_HEADER, get_settings
from .db import dispose_db, get_session_factory, init_db
from .models import User
from .routers import auth, content, reservations
from .security import hash_password

logger = logging.getLogger("origen")
logging.basicConfig(level=logging.INFO)

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

DEMO_EMAIL = "demo@theorigen.cu"
DEMO_PASSWORD = "Origen2026!"


async def seed_demo_user() -> None:
    settings = get_settings()
    if not settings.seed_demo:
        return

    async with get_session_factory()() as session:
        existing = await session.scalar(select(User.id).where(User.email == DEMO_EMAIL))
        if existing:
            return
        session.add(
            User(
                name="Mesa de pruebas",
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
                role="guest",
            )
        )
        await session.commit()
        logger.info("Usuario demo creado: %s", DEMO_EMAIL)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    await seed_demo_user()
    yield
    await dispose_db()


app = FastAPI(
    title="The Origen API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", CSRF_HEADER],
    max_age=600,
)


@app.middleware("http")
async def harden(request: Request, call_next):
    """CSRF de doble envío + cabeceras de seguridad en cada respuesta."""
    csrf_cookie = request.cookies.get(CSRF_COOKIE)
    new_csrf = None if csrf_cookie else secrets.token_urlsafe(32)

    if request.method not in SAFE_METHODS:
        header = request.headers.get(CSRF_HEADER)
        if not csrf_cookie or not header or not secrets.compare_digest(header, csrf_cookie):
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "Falta el token CSRF o no coincide.",
                    "code": "csrf_failed",
                },
            )

    response: Response = await call_next(request)

    if new_csrf:
        response.set_cookie(
            key=CSRF_COOKIE,
            value=new_csrf,
            max_age=3600,
            path="/",
            httponly=False,
            secure=settings.cookie_secure,
            samesite="lax",
        )

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    response.headers["X-Robots-Tag"] = "noindex"

    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"

    if request.url.path.startswith(("/api/v1/auth", "/api/v1/reservations")):
        response.headers["Cache-Control"] = "no-store"

    return response


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    code = "error"
    message: str | dict = detail

    if isinstance(detail, dict):
        code = str(detail.get("code", "error"))
        message = detail.get("detail", code)

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": message, "code": code},
        headers=exc.headers,
    )


@app.get("/api/v1/health")
async def health() -> dict:
    async with get_session_factory()() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "ok", "environment": settings.environment}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(content.router, prefix="/api/v1")
app.include_router(reservations.router, prefix="/api/v1")
