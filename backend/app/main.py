"""The Origen — API.

Un solo proceso FastAPI: sesiones con JWT en cookies httpOnly, CSRF de doble
envío, límite de peticiones y cabeceras de seguridad en todas las respuestas.
"""

from __future__ import annotations

import logging
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .body_limit import BodyLimitMiddleware
from .config import CSRF_COOKIE, CSRF_HEADER, Settings, get_settings
from .db import dispose_db, get_session_factory, init_db
from .models import User
from .net import origin_allowed
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


settings = get_settings()

app = FastAPI(
    title="The Origen API",
    version="1.0.0",
    docs_url=None if settings.is_production else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=list(settings.allowed_hosts),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", CSRF_HEADER, "X-Request-ID"],
    expose_headers=["Retry-After", "X-Request-ID"],
    max_age=600,
)
# Dentro de ``harden`` para que el 413 también salga con sus cabeceras.
app.add_middleware(BodyLimitMiddleware, max_bytes=settings.max_body_bytes)


def _error(
    status_code: int,
    code: str,
    detail: str,
    *,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"detail": detail, "code": code},
        headers=headers,
    )


def _apply_security_headers(
    response: Response, settings: Settings, request_id: str
) -> None:
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=()"
    )
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    )
    response.headers["X-Robots-Tag"] = "noindex"
    response.headers["X-DNS-Prefetch-Control"] = "off"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["X-Request-ID"] = request_id

    if settings.is_production:
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains"
        )


def _sets_cookie(response: Response, name: str) -> bool:
    prefix = name.encode("ascii") + b"="
    return any(
        key.lower() == b"set-cookie" and value.startswith(prefix)
        for key, value in response.raw_headers
    )


@app.middleware("http")
async def harden(request: Request, call_next):
    """CSRF de doble envío + cabeceras de seguridad en cada respuesta."""
    request_id = request.headers.get("x-request-id", "")
    if (
        not request_id
        or len(request_id) > 64
        or not all(char.isalnum() or char in "-_." for char in request_id)
    ):
        request_id = secrets.token_hex(8)

    def blocked(status_code: int, code: str, detail: str) -> JSONResponse:
        response = _error(status_code, code, detail)
        _apply_security_headers(response, settings, request_id)
        return response

    # Límite de cuerpo antes de que FastAPI lo deserialice.
    declared = request.headers.get("content-length")
    if declared:
        try:
            length = int(declared)
        except ValueError:
            return blocked(
                400, "bad_content_length", "Longitud de contenido no válida."
            )
        if length < 0:
            return blocked(
                400, "bad_content_length", "Longitud de contenido no válida."
            )
        if length > settings.max_body_bytes:
            return blocked(
                413,
                "payload_too_large",
                "La petición es demasiado grande.",
            )

    if request.method not in SAFE_METHODS:
        origin = request.headers.get("origin")
        if not origin_allowed(origin, settings.frontend_origin):
            return blocked(
                status.HTTP_403_FORBIDDEN,
                "origin_failed",
                "Origen no permitido.",
            )

        if request.headers.get("sec-fetch-site", "").lower() == "cross-site":
            return blocked(
                status.HTTP_403_FORBIDDEN,
                "origin_failed",
                "Origen no permitido.",
            )

        csrf_cookie = request.cookies.get(CSRF_COOKIE)
        header = request.headers.get(CSRF_HEADER)
        if (
            not csrf_cookie
            or not header
            or not secrets.compare_digest(
                header.encode("utf-8"), csrf_cookie.encode("utf-8")
            )
        ):
            return blocked(
                status.HTTP_403_FORBIDDEN,
                "csrf_failed",
                "Falta el token CSRF o no coincide.",
            )

    response: Response = await call_next(request)

    csrf_cookie = request.cookies.get(CSRF_COOKIE)
    if (
        request.method in SAFE_METHODS
        and not csrf_cookie
        and not _sets_cookie(response, CSRF_COOKIE)
    ):
        response.set_cookie(
            key=CSRF_COOKIE,
            value=secrets.token_urlsafe(32),
            max_age=3600,
            path="/",
            httponly=False,
            secure=settings.cookie_secure,
            samesite="lax",
        )

    _apply_security_headers(response, settings, request_id)

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


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    """No devolver al cliente los valores enviados (podrían ser contraseñas)."""
    fields = []
    for item in exc.errors():
        location = [str(part) for part in item.get("loc", ()) if part != "body"]
        fields.append(
            {
                "field": ".".join(location) or "body",
                "type": str(item.get("type", "invalid")),
                "message": str(item.get("msg", "Valor no válido")),
            }
        )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Revisa los datos enviados.",
            "code": "invalid_input",
            "fields": fields,
        },
    )


@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Error no controlado", exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error interno.", "code": "internal_error"},
    )


@app.get("/api/v1/health")
async def health() -> dict:
    async with get_session_factory()() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(content.router, prefix="/api/v1")
app.include_router(reservations.router, prefix="/api/v1")
