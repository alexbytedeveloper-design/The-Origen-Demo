from __future__ import annotations

import sqlite3
from datetime import timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from app.clock import restaurant_today
from app.crypto import PREFIX, decrypt_text


def _payload(**overrides):
    base = {
        "date": (restaurant_today() + timedelta(days=1)).isoformat(),
        "time": "20:30",
        "partySize": 2,
        "name": "Cliente Prueba",
        "email": "cliente@example.com",
        "phone": "+53 50667554",
        "notes": "Mesa en el patio",
    }
    base.update(overrides)
    return base


def _csrf(client: TestClient) -> dict[str, str]:
    token = client.cookies.get("origen_csrf")
    assert token
    return {"X-CSRF-Token": token}


def _login(client: TestClient, csrf: dict[str, str]) -> dict:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@theorigen.cu", "password": "Origen2026!"},
        headers=csrf,
    )
    assert response.status_code == 200
    return response.json()


def test_empty_notes_are_supported_and_encrypted(
    client: TestClient, csrf: dict[str, str], db_file: Path
) -> None:
    response = client.post(
        "/api/v1/reservations", json=_payload(notes=""), headers=csrf
    )
    assert response.status_code == 201
    body = response.json()
    assert body["notes"] == ""

    with sqlite3.connect(db_file) as connection:
        row = connection.execute(
            "SELECT notes FROM reservations WHERE id = ?", (body["id"],)
        ).fetchone()
    assert row and row[0].startswith(PREFIX)
    assert decrypt_text(row[0]) == ""


def test_notes_are_trimmed_and_limited(
    client: TestClient, csrf: dict[str, str]
) -> None:
    trimmed = client.post(
        "/api/v1/reservations", json=_payload(notes="  junto a la ventana  "), headers=csrf
    )
    assert trimmed.status_code == 201
    assert trimmed.json()["notes"] == "junto a la ventana"

    too_long = client.post(
        "/api/v1/reservations", json=_payload(notes="x" * 401), headers=csrf
    )
    assert too_long.status_code == 422


def test_date_boundaries(
    client: TestClient, csrf: dict[str, str]
) -> None:
    today = restaurant_today()
    for offset, expected in ((0, 201), (90, 201), (91, 422), (-1, 422)):
        response = client.post(
            "/api/v1/reservations",
            json=_payload(date=(today + timedelta(days=offset)).isoformat()),
            headers=csrf,
        )
        assert response.status_code == expected, f"offset {offset}"


def test_time_and_party_boundaries(
    client: TestClient, csrf: dict[str, str]
) -> None:
    for time, expected in (("12:00", 201), ("23:00", 201), ("11:30", 422), ("23:30", 422)):
        response = client.post(
            "/api/v1/reservations", json=_payload(time=time), headers=csrf
        )
        assert response.status_code == expected, time

    for party, expected in ((1, 201), (8, 201), (0, 422), (9, 422)):
        response = client.post(
            "/api/v1/reservations", json=_payload(partySize=party), headers=csrf
        )
        assert response.status_code == expected, party


def test_authenticated_reservation_links_the_user(
    client: TestClient, csrf: dict[str, str], db_file: Path
) -> None:
    user = _login(client, csrf)
    response = client.post(
        "/api/v1/reservations", json=_payload(), headers=_csrf(client)
    )
    assert response.status_code == 201

    with sqlite3.connect(db_file) as connection:
        row = connection.execute(
            "SELECT user_id FROM reservations WHERE id = ?",
            (response.json()["id"],),
        ).fetchone()
    assert row == (user["id"],)


def test_anonymous_reservation_has_no_user(
    client: TestClient, csrf: dict[str, str], db_file: Path
) -> None:
    client.cookies.delete("origen_access")
    client.cookies.delete("origen_refresh")
    response = client.post(
        "/api/v1/reservations", json=_payload(), headers=csrf
    )
    assert response.status_code == 201

    with sqlite3.connect(db_file) as connection:
        row = connection.execute(
            "SELECT user_id FROM reservations WHERE id = ?",
            (response.json()["id"],),
        ).fetchone()
    assert row == (None,)


def test_email_is_normalized_and_unicode_is_preserved(
    client: TestClient, csrf: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/reservations",
        json=_payload(
            name="María Núñez",
            email="Maria.Nunez@Example.COM",
            notes="Cerca de la ventana · 日本語",
        ),
        headers=csrf,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "maria.nunez@example.com"
    assert body["name"] == "María Núñez"
    assert body["notes"] == "Cerca de la ventana · 日本語"


def test_invalid_phone_is_rejected(
    client: TestClient, csrf: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/reservations", json=_payload(phone="llamame"), headers=csrf
    )
    assert response.status_code == 422


def test_reservation_rate_limit(
    client: TestClient, csrf: dict[str, str]
) -> None:
    for index in range(10):
        response = client.post(
            "/api/v1/reservations",
            json=_payload(email=f"rate-{index}@example.com"),
            headers=csrf,
        )
        assert response.status_code == 201, f"intento {index}"

    blocked = client.post(
        "/api/v1/reservations",
        json=_payload(email="rate-final@example.com"),
        headers=csrf,
    )
    assert blocked.status_code == 429
    assert blocked.json()["code"] == "too_many_requests"
    assert int(blocked.headers["Retry-After"]) > 0


def test_response_does_not_expose_the_user_id(
    client: TestClient, csrf: dict[str, str]
) -> None:
    user = _login(client, csrf)
    response = client.post(
        "/api/v1/reservations", json=_payload(), headers=_csrf(client)
    )
    assert response.status_code == 201
    body = response.json()
    assert "userId" not in body
    assert body["id"] != user["id"]
