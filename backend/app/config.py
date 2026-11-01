"""Configuración por variables de entorno, sin dependencias de más."""

from __future__ import annotations

import os
import secrets
import warnings
from dataclasses import dataclass
from functools import lru_cache

ACCESS_COOKIE = "origen_access"
REFRESH_COOKIE = "origen_refresh"
CSRF_COOKIE = "origen_csrf"
CSRF_HEADER = "X-CSRF-Token"


def _flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str
    jwt_secret: str
    jwt_issuer: str
    access_ttl: int
    refresh_ttl: int
    cookie_secure: bool
    frontend_origin: str
    seed_demo: bool
    environment: str
    max_failed_attempts: int
    lockout_seconds: int


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    secret = os.getenv("JWT_SECRET", "").strip()
    if not secret:
        secret = secrets.token_hex(32)
        warnings.warn(
            "JWT_SECRET no está definido: se usa un secreto efímero. "
            "Las sesiones se invalidan al reiniciar. Define JWT_SECRET en .env.",
            RuntimeWarning,
            stacklevel=2,
        )

    environment = os.getenv("APP_ENV", "development").strip().lower()

    return Settings(
        database_url=os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./origen.db").strip(),
        jwt_secret=secret,
        jwt_issuer="the-origen",
        access_ttl=int(os.getenv("ACCESS_TTL", "900")),
        refresh_ttl=int(os.getenv("REFRESH_TTL", "604800")),
        cookie_secure=_flag("COOKIE_SECURE", environment == "production"),
        frontend_origin=os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").strip(),
        seed_demo=_flag("SEED_DEMO", True),
        environment=environment,
        max_failed_attempts=int(os.getenv("MAX_FAILED_ATTEMPTS", "5")),
        lockout_seconds=int(os.getenv("LOCKOUT_SECONDS", "600")),
    )
