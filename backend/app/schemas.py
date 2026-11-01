"""Contratos de entrada y salida de la API."""

from __future__ import annotations

import re
from datetime import date as Date
from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

BOOKING_SLOTS = tuple(
    f"{hour:02d}:{minute:02d}"
    for hour in range(12, 23)
    for minute in (0, 30)
) + ("23:00",)

MAX_DAYS_AHEAD = 90
PHONE_RE = re.compile(r"^[0-9+()\-\s.]{7,32}$")


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    role: str


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Nombre demasiado corto")
        return value

    @field_validator("password")
    @classmethod
    def clean_password(cls, value: str) -> str:
        if value.strip() != value:
            raise ValueError("La contraseña no puede empezar ni acabar en espacio")
        return value


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ReservationIn(BaseModel):
    date: Date
    time: str
    partySize: int = Field(ge=1, le=8)
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=32)
    notes: str | None = Field(default=None, max_length=400)

    @field_validator("time")
    @classmethod
    def valid_time(cls, value: str) -> str:
        if value not in BOOKING_SLOTS:
            raise ValueError("Hora fuera de servicio")
        return value

    @field_validator("date")
    @classmethod
    def valid_date(cls, value: Date) -> Date:
        today = Date.today()
        if value < today or value > today + timedelta(days=MAX_DAYS_AHEAD):
            raise ValueError("Fecha fuera de plazo")
        return value

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        if not PHONE_RE.match(value):
            raise ValueError("Teléfono no válido")
        return value

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("notes")
    @classmethod
    def clean_notes(cls, value: str | None) -> str:
        return (value or "").strip()


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    date: Date = Field(validation_alias="booking_date", serialization_alias="date")
    time: str = Field(validation_alias="booking_time", serialization_alias="time")
    partySize: int = Field(validation_alias="party_size", serialization_alias="partySize")
    name: str
    email: EmailStr
    phone: str
    notes: str = ""
    status: str
    createdAt: datetime = Field(validation_alias="created_at", serialization_alias="createdAt")
