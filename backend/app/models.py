"""Tablas: usuarios y reservas. Nada más de lo necesario."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .encrypted import EncryptedText


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(16), default="guest", nullable=False)

    # Seguridad de la sesión: revocación del refresh. El bloqueo por intentos
    # vive en LoginGuard para poder limitar también por IP.
    refresh_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)


class LoginGuard(Base):
    """Intentos fallidos y bloqueos, por IP y por cuenta.

    ``strikes`` cuenta cuántas veces se ha completado un bloqueo. El castigo
    crece de forma exponencial (24 h, 72 h, 216 h…) hasta que la IP queda
    bloqueada de forma permanente.
    """

    __tablename__ = "login_guards"

    key: Mapped[str] = mapped_column(String(320), primary_key=True)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    failures: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    window_started: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )
    strikes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_strike_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    booking_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    booking_time: Mapped[str] = mapped_column(String(5), nullable=False)
    party_size: Mapped[int] = mapped_column(Integer, nullable=False)

    name: Mapped[str] = mapped_column(EncryptedText, nullable=False)
    email: Mapped[str] = mapped_column(EncryptedText, nullable=False)
    phone: Mapped[str] = mapped_column(EncryptedText, nullable=False)
    notes: Mapped[str] = mapped_column(EncryptedText, default="", nullable=False)

    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
