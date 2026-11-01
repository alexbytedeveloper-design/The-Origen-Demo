from __future__ import annotations

from datetime import date, timedelta

from fastapi.testclient import TestClient


def _payload(**overrides):
    tomorrow = date.today() + timedelta(days=1)
    base = {
        "date": tomorrow.isoformat(),
        "time": "20:30",
        "partySize": 2,
        "name": "Cliente Prueba",
        "email": "cliente@example.com",
        "phone": "+53 50667554",
        "notes": "Mesa en el patio",
    }
    base.update(overrides)
    return base


def test_create_reservation(client: TestClient, csrf: dict[str, str]) -> None:
    response = client.post("/api/v1/reservations", json=_payload(), headers=csrf)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["partySize"] == 2
    assert body["date"] == (date.today() + timedelta(days=1)).isoformat()
    assert body["time"] == "20:30"


def test_reservation_requires_csrf(client: TestClient) -> None:
    response = client.post("/api/v1/reservations", json=_payload())
    assert response.status_code == 403


def test_past_date_rejected(client: TestClient, csrf: dict[str, str]) -> None:
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    response = client.post(
        "/api/v1/reservations", json=_payload(date=yesterday), headers=csrf
    )
    assert response.status_code == 422


def test_bad_time_rejected(client: TestClient, csrf: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/reservations", json=_payload(time="03:00"), headers=csrf
    )
    assert response.status_code == 422


def test_party_size_rejected(client: TestClient, csrf: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/reservations", json=_payload(partySize=12), headers=csrf
    )
    assert response.status_code == 422
