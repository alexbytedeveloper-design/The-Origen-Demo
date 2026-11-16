"""Configuración por variables de entorno, sin dependencias de más.

Reglas de seguridad que no se negocian en producción:

* ``JWT_SECRET`` es obligatorio y debe tener al menos 32 caracteres.
* ``SEED_DEMO`` no puede estar activo: el usuario de demostración tiene una
  contraseña conocida y serviría una puerta abierta.
* Las cookies de sesión viajan siempre con ``Secure``.
* El origen del frontend debe ser HTTPS.
* ``ALLOWED_HOSTS`` no puede quedar en el comodín de desarrollo.
"""

from __future__ import annotations

import base64
import binascii
import os
import secrets
import warnings
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

ACCESS_COOKIE = "origen_access"
REFRESH_COOKIE = "origen_refresh"
CSRF_COOKIE = "origen_csrf"
CSRF_HEADER = "X-CSRF-Token"

MIN_SECRET_LENGTH = 32
DEFAULT_ALLOWED_HOSTS = "localhost,127.0.0.1,testserver"
DEV_KEY_FILE = Path(__file__).resolve().parent.parent / ".origen-data-key"


def _flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} debe ser un número entero") from exc
    if not minimum <= value <= maximum:
        raise RuntimeError(f"{name} debe estar entre {minimum} y {maximum}")
    return value


def _validate_origin(origin: str, production: bool) -> str:
    origin = origin.strip().rstrip("/")
    if not origin.startswith(("http://", "https://")):
        raise RuntimeError("FRONTEND_ORIGIN debe incluir http:// o https://")
    if production and not origin.startswith("https://"):
        raise RuntimeError("FRONTEND_ORIGIN debe usar HTTPS en producción")
    return origin


def _parse_key(raw: str, name: str) -> bytes:
    """Acepta 32 bytes en base64, hex o texto crudo."""
    value = raw.strip()
    candidates = [value]
    try:
        candidates.append(base64.urlsafe_b64decode(value + "=" * (-len(value) % 4)).decode("latin-1"))
    except (binascii.Error, ValueError):
        pass
    try:
        candidates.append(bytes.fromhex(value).decode("latin-1"))
    except ValueError:
        pass

    for candidate in candidates:
        if len(candidate) == 32:
            return candidate.encode("latin-1")

    raise RuntimeError(
        f"{name} debe contener exactamente 32 bytes (base64, hex o texto)"
    )


def _dev_data_key() -> bytes:
    """Clave local del demo, persistida fuera de git para no perder datos."""
    if DEV_KEY_FILE.exists():
        raw = DEV_KEY_FILE.read_text(encoding="ascii").strip()
        return _parse_key(raw, "DATA_ENCRYPTION_KEY")

    key = secrets.token_bytes(32)
    DEV_KEY_FILE.write_text(base64.urlsafe_b64encode(key).decode("ascii"), encoding="ascii")
    try:
        DEV_KEY_FILE.chmod(0o600)
    except OSError:
        pass
    warnings.warn(
        "DATA_ENCRYPTION_KEY no está definido: se creó una clave local en "
        f"{DEV_KEY_FILE.name}. Define la variable en producción.",
        RuntimeWarning,
        stacklevel=2,
    )
    return key


def _data_key(production: bool) -> bytes:
    raw = os.getenv("DATA_ENCRYPTION_KEY", "").strip()
    if raw:
        return _parse_key(raw, "DATA_ENCRYPTION_KEY")
    if production:
        raise RuntimeError("DATA_ENCRYPTION_KEY es obligatorio en producción")
    return _dev_data_key()


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
    data_key: bytes
    allowed_hosts: tuple[str, ...]
    max_body_bytes: int
    trust_proxy: bool
    restaurant_tz: str
    restaurant_utc_offset: int
    db_pool_size: int
    db_max_overflow: int
    db_pool_timeout: int
    db_pool_recycle: int
    login_attempt_limit: int
    login_window_seconds: int
    login_lock_base_seconds: int
    login_lock_factor: int
    login_lock_max_seconds: int
    login_max_strikes: int

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origins(self) -> tuple[str, ...]:
        origins = [self.frontend_origin]
        if not self.is_production:
            origin = self.frontend_origin
            if "://localhost" in origin:
                origins.append(origin.replace("://localhost", "://127.0.0.1"))
                origins.append(origin.replace("://localhost", "://[::1]"))
        return tuple(origins)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    environment = os.getenv("APP_ENV", "development").strip().lower()
    production = environment == "production"

    secret = os.getenv("JWT_SECRET", "").strip()
    if not secret:
        if production:
            raise RuntimeError("JWT_SECRET es obligatorio en producción")
        secret = secrets.token_hex(32)
        warnings.warn(
            "JWT_SECRET no está definido: se usa un secreto efímero. "
            "Las sesiones se invalidan al reiniciar. Define JWT_SECRET en .env.",
            RuntimeWarning,
            stacklevel=2,
        )
    elif len(secret) < MIN_SECRET_LENGTH:
        raise RuntimeError(
            f"JWT_SECRET debe tener al menos {MIN_SECRET_LENGTH} caracteres"
        )

    seed_demo = _flag("SEED_DEMO", not production)
    if production and seed_demo:
        raise RuntimeError("SEED_DEMO debe estar desactivado en producción")

    cookie_secure = _flag("COOKIE_SECURE", production)
    if production and not cookie_secure:
        raise RuntimeError("COOKIE_SECURE debe estar activo en producción")

    frontend_origin = _validate_origin(
        os.getenv("FRONTEND_ORIGIN", "http://localhost:3000"), production
    )

    hosts = tuple(
        host.strip()
        for host in os.getenv("ALLOWED_HOSTS", DEFAULT_ALLOWED_HOSTS).split(",")
        if host.strip()
    )
    if not hosts:
        raise RuntimeError("ALLOWED_HOSTS no puede estar vacío")
    if production and "*" in hosts:
        raise RuntimeError("ALLOWED_HOSTS no puede contener '*' en producción")

    access_ttl = _int("ACCESS_TTL", 900, 60, 3600)
    refresh_ttl = _int("REFRESH_TTL", 604800, 3600, 2_592_000)
    if refresh_ttl <= access_ttl:
        raise RuntimeError("REFRESH_TTL debe ser mayor que ACCESS_TTL")

    login_attempt_limit = _int("LOGIN_ATTEMPT_LIMIT", 5, 1, 50)
    login_window_seconds = _int("LOGIN_WINDOW_SECONDS", 86_400, 300, 604_800)
    login_lock_base_seconds = _int(
        "LOGIN_LOCK_BASE_SECONDS", 86_400, 60, 2_592_000
    )
    login_lock_factor = _int("LOGIN_LOCK_FACTOR", 3, 2, 10)
    login_lock_max_seconds = _int(
        "LOGIN_LOCK_MAX_SECONDS", 2_592_000, login_lock_base_seconds, 31_536_000
    )
    login_max_strikes = _int("LOGIN_MAX_STRIKES", 5, 1, 20)

    return Settings(
        database_url=os.getenv(
            "DATABASE_URL", "sqlite+aiosqlite:///./origen.db"
        ).strip(),
        jwt_secret=secret,
        jwt_issuer="the-origen",
        access_ttl=access_ttl,
        refresh_ttl=refresh_ttl,
        cookie_secure=cookie_secure,
        frontend_origin=frontend_origin,
        seed_demo=seed_demo,
        environment=environment,
        data_key=_data_key(production),
        allowed_hosts=hosts,
        max_body_bytes=_int("MAX_BODY_BYTES", 65_536, 1_024, 1_048_576),
        trust_proxy=_flag("TRUST_PROXY", False),
        restaurant_tz=os.getenv("RESTAURANT_TZ", "America/Havana").strip(),
        restaurant_utc_offset=_int("RESTAURANT_UTC_OFFSET", -5, -12, 14),
        db_pool_size=_int("DB_POOL_SIZE", 5, 1, 50),
        db_max_overflow=_int("DB_MAX_OVERFLOW", 10, 0, 100),
        db_pool_timeout=_int("DB_POOL_TIMEOUT", 30, 1, 120),
        db_pool_recycle=_int("DB_POOL_RECYCLE", 1_800, 60, 86_400),
        login_attempt_limit=login_attempt_limit,
        login_window_seconds=login_window_seconds,
        login_lock_base_seconds=login_lock_base_seconds,
        login_lock_factor=login_lock_factor,
        login_lock_max_seconds=login_lock_max_seconds,
        login_max_strikes=login_max_strikes,
    )
