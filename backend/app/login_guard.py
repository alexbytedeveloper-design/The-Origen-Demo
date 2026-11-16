"""Bloqueo progresivo del acceso, por IP y por cuenta.

Regla del restaurante: cinco intentos fallidos en 24 h. Al quinto, la puerta
se cierra 24 h. Cuando el contador se reinicia y se vuelve a fallar cinco
veces, el castigo es de 72 h; después 216 h, y así de forma exponencial hasta
que la IP queda bloqueada de forma permanente.

El estado se guarda en la tabla ``login_guards`` para que sobreviva a un
reinicio del proceso. Los intentos por minuto siguen en ``rate_limit`` como
protección de ráfaga.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from weakref import WeakKeyDictionary

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .models import LoginGuard

# Si una cuenta no vuelve a fallar en tres meses, sus strikes caducan.
STRIKE_DECAY = timedelta(days=90)

# Serializa las escrituras del guardia dentro de un proceso. Sin esto, dos
# intentos simultáneos pueden leer el mismo contador y perder un fallo. Con
# varias réplicas hace falta un lock de base de datos o Redis.
_LOCKS: WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Lock] = WeakKeyDictionary()


def _write_lock() -> asyncio.Lock:
    loop = asyncio.get_running_loop()
    lock = _LOCKS.get(loop)
    if lock is None:
        lock = asyncio.Lock()
        _LOCKS[loop] = lock
    return lock


@dataclass(frozen=True)
class LockState:
    retry_after: int
    blocked: bool = False


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def lock_seconds_for_strike(strike: int) -> int:
    """24 h, 72 h, 216 h… con un techo configurable de 30 días."""
    settings = get_settings()
    exponent = max(strike - 1, 0)
    seconds = settings.login_lock_base_seconds * (
        settings.login_lock_factor**exponent
    )
    return min(seconds, settings.login_lock_max_seconds)


def _key(scope: str, value: str) -> str:
    return f"{scope}:{value}"


def guard_keys(ip: str, email: str) -> list[tuple[str, str]]:
    """La IP frena la fuerza bruta distribuida; la cuenta, la dirigida."""
    keys = [("ip", ip)]
    email = email.strip().lower()
    if email:
        keys.append(("account", email))
    return keys


async def _load(db: AsyncSession, scope: str, value: str) -> LoginGuard | None:
    return await db.get(LoginGuard, _key(scope, value))


async def check_guards(
    db: AsyncSession, keys: list[tuple[str, str]]
) -> LockState | None:
    """Devuelve el bloqueo activo más restrictivo, o ``None`` si hay paso."""
    async with _write_lock():
        return await _check_guards(db, keys)


async def _check_guards(
    db: AsyncSession, keys: list[tuple[str, str]]
) -> LockState | None:
    settings = get_settings()
    now = _now()
    worst: LockState | None = None

    for scope, value in keys:
        guard = await _load(db, scope, value)
        if guard is None:
            continue

        if guard.blocked:
            return LockState(retry_after=settings.login_lock_max_seconds, blocked=True)

        locked_until = _aware(guard.locked_until)
        if locked_until and locked_until > now:
            retry = int((locked_until - now).total_seconds()) + 1
            if worst is None or retry > worst.retry_after:
                worst = LockState(retry_after=retry)

    return worst


async def register_failure(
    db: AsyncSession, keys: list[tuple[str, str]]
) -> LockState | None:
    """Suma un fallo a cada clave y aplica el castigo que corresponda."""
    async with _write_lock():
        return await _register_failure(db, keys)


async def _register_failure(
    db: AsyncSession, keys: list[tuple[str, str]]
) -> LockState | None:
    settings = get_settings()
    now = _now()
    triggered: LockState | None = None

    for scope, value in keys:
        key = _key(scope, value)
        guard = await db.get(LoginGuard, key)
        if guard is None:
            guard = LoginGuard(
                key=key,
                scope=scope,
                failures=0,
                window_started=now,
                strikes=0,
                blocked=False,
                updated_at=now,
            )
            db.add(guard)

        if guard.blocked:
            if scope == "ip":
                triggered = LockState(
                    retry_after=settings.login_lock_max_seconds, blocked=True
                )
            continue

        locked_until = _aware(guard.locked_until)
        if locked_until and locked_until > now:
            # Ya está cerrada: no se acumulan fallos mientras espera, pero la
            # respuesta debe ser 429 aunque el bloqueo lo haya puesto otra
            # petición simultánea después de comprobar el guardia.
            retry = int((locked_until - now).total_seconds()) + 1
            if triggered is None or retry > triggered.retry_after:
                triggered = LockState(retry_after=retry)
            continue

        if locked_until is not None:
            # El castigo terminó: empieza un contador nuevo.
            guard.locked_until = None
            guard.failures = 0
            guard.window_started = now

        last_strike = _aware(guard.last_strike_at)
        if last_strike and now - last_strike > STRIKE_DECAY:
            guard.strikes = 0

        window_started = _aware(guard.window_started) or now
        if now - window_started >= timedelta(seconds=settings.login_window_seconds):
            guard.failures = 0
            guard.window_started = now

        guard.failures += 1
        guard.updated_at = now

        if guard.failures >= settings.login_attempt_limit:
            guard.strikes += 1
            guard.failures = 0
            guard.window_started = now
            guard.last_strike_at = now
            seconds = lock_seconds_for_strike(guard.strikes)
            guard.locked_until = now + timedelta(seconds=seconds)
            if scope == "ip" and guard.strikes >= settings.login_max_strikes:
                guard.blocked = True

            state = LockState(
                retry_after=seconds, blocked=scope == "ip" and guard.blocked
            )
            if triggered is None or state.blocked or state.retry_after > triggered.retry_after:
                triggered = state

    # El commit ocurre dentro del lock: si se dejara al llamador, otra
    # petición podría leer el contador viejo antes de que se guarde.
    await db.commit()
    return triggered


async def reset_guards(
    db: AsyncSession, keys: list[tuple[str, str]]
) -> None:
    """Un acceso correcto limpia fallos y bloqueos, pero no los strikes."""
    async with _write_lock():
        await _reset_guards(db, keys)


async def _reset_guards(
    db: AsyncSession, keys: list[tuple[str, str]]
) -> None:
    now = _now()
    for scope, value in keys:
        guard = await db.scalar(
            select(LoginGuard).where(LoginGuard.key == _key(scope, value))
        )
        if guard is None or guard.blocked:
            continue
        guard.failures = 0
        guard.locked_until = None
        guard.window_started = now
        guard.updated_at = now

    await db.commit()
