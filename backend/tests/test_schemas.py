from __future__ import annotations

from datetime import timedelta

import pytest
from pydantic import ValidationError

from app.clock import restaurant_today
from app.schemas import (
    BOOKING_SLOTS,
    MAX_DAYS_AHEAD,
    LoginIn,
    RegisterIn,
    ReservationIn,
)


def _reservation(**overrides):
    base = {
        "date": (restaurant_today() + timedelta(days=1)).isoformat(),
        "time": "20:00",
        "partySize": 2,
        "name": "Cliente Prueba",
        "email": "cliente@example.com",
        "phone": "+53 50667554",
        "notes": "Mesa en el patio",
    }
    base.update(overrides)
    return base


def test_booking_slots_cover_service_hours() -> None:
    assert len(BOOKING_SLOTS) == 23
    assert BOOKING_SLOTS[0] == "12:00"
    assert BOOKING_SLOTS[-1] == "23:00"
    assert "23:30" not in BOOKING_SLOTS


def test_reservation_accepts_boundaries() -> None:
    today = restaurant_today()
    first = ReservationIn(
        **_reservation(
            date=today.isoformat(),
            time="12:00",
            partySize=1,
            notes=None,
        )
    )
    assert first.notes == ""

    last = ReservationIn(
        **_reservation(
            date=(today + timedelta(days=MAX_DAYS_AHEAD)).isoformat(),
            time="23:00",
            partySize=8,
        )
    )
    assert last.partySize == 8


@pytest.mark.parametrize("days", [-1, MAX_DAYS_AHEAD + 1])
def test_reservation_rejects_dates_outside_the_window(days: int) -> None:
    with pytest.raises(ValidationError):
        ReservationIn(
            **_reservation(
                date=(restaurant_today() + timedelta(days=days)).isoformat()
            )
        )


def test_reservation_extra_fields_are_forbidden() -> None:
    with pytest.raises(ValidationError):
        ReservationIn(**_reservation(role="admin"))


def test_reservation_name_is_normalized() -> None:
    reservation = ReservationIn(**_reservation(name="  Ana   María  "))
    assert reservation.name == "Ana María"


@pytest.mark.parametrize("phone", ["123", "abc-def", "+" * 33])
def test_invalid_phone_is_rejected(phone: str) -> None:
    with pytest.raises(ValidationError):
        ReservationIn(**_reservation(phone=phone))


def test_register_rejects_surrounding_spaces_in_password() -> None:
    with pytest.raises(ValidationError):
        RegisterIn(name="Ana", email="ana@example.com", password=" clave-segura ")


def test_login_does_not_require_the_register_minimum() -> None:
    # No se revela la política de contraseñas en el acceso.
    assert LoginIn(email="ana@example.com", password="corta").password == "corta"
