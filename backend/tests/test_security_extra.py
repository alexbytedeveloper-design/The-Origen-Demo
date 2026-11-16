from __future__ import annotations

import asyncio
import json
from datetime import date, timedelta

import httpx
from fastapi.testclient import TestClient

from app.main import app

ORIGIN = "http://localhost:3000"


def _reservation_payload(**overrides):
    base = {
        "date": (date.today() + timedelta(days=1)).isoformat(),
        "time": "20:00",
        "partySize": 2,
        "name": "Cliente Prueba",
        "email": "prueba@example.com",
        "phone": "+53 50667554",
        "notes": "Mesa en el patio",
    }
    base.update(overrides)
    return base


def test_chunked_body_without_content_length_is_rejected(
    client: TestClient, csrf: dict[str, str]
) -> None:
    token = client.cookies.get("origen_csrf")
    assert token

    payload = json.dumps(_reservation_payload(notes="x" * 70_000)).encode("utf-8")

    async def chunks():
        for start in range(0, len(payload), 8_192):
            yield payload[start : start + 8_192]

    async def run() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as async_client:
            return await async_client.post(
                "/api/v1/reservations",
                content=chunks(),
                headers={
                    "Content-Type": "application/json",
                    "Origin": ORIGIN,
                    "X-CSRF-Token": token,
                },
                cookies={"origen_csrf": token},
            )

    response = asyncio.run(run())
    assert response.status_code == 413
    assert response.json()["code"] == "payload_too_large"
    assert "content-length" not in {
        key.lower() for key in response.request.headers
    }, "la petición debe ir por trozos, sin Content-Length"
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_non_ascii_csrf_header_is_forbidden_not_500(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        content=b"{}",
        headers={
            b"Content-Type": b"application/json",
            b"X-CSRF-Token": b"caf\xe9",
        },
        cookies={"origen_csrf": "abc"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "csrf_failed"


def test_malformed_origin_is_forbidden_not_500(
    client: TestClient, csrf: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@theorigen.cu", "password": "Origen2026!"},
        headers={**csrf, "Origin": "http://[::1"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "origin_failed"


def test_invalid_content_length_is_rejected(client: TestClient) -> None:
    for value in ("-5", "abc"):
        response = client.post(
            "/api/v1/health", content=b"", headers={"Content-Length": value}
        )
        assert response.status_code == 400
        assert response.json()["code"] == "bad_content_length"


def test_request_id_is_preserved_when_valid(client: TestClient) -> None:
    response = client.get("/api/v1/health", headers={"X-Request-ID": "abc-123_XY.9"})
    assert response.headers["X-Request-ID"] == "abc-123_XY.9"


def test_request_id_is_replaced_when_invalid(client: TestClient) -> None:
    response = client.get("/api/v1/health", headers={"X-Request-ID": "no vale!"})
    request_id = response.headers["X-Request-ID"]
    assert request_id != "no vale!"
    assert len(request_id) == 16


def test_oversized_body_keeps_security_headers(
    client: TestClient, csrf: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/reservations",
        json=_reservation_payload(notes="x" * 70_000),
        headers=csrf,
    )
    assert response.status_code == 413
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Request-ID"]


def test_unknown_host_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/health", headers={"Host": "evil.example"})
    assert response.status_code == 400


def test_cors_preflight_for_the_site_origin(client: TestClient) -> None:
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, X-CSRF-Token",
        },
    )
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == ORIGIN
    assert "x-csrf-token" in response.headers["Access-Control-Allow-Headers"].lower()


def test_hsts_is_not_sent_in_development(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert "Strict-Transport-Security" not in response.headers


def test_csrf_cookie_is_readable_by_the_browser(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    cookie = response.cookies.get("origen_csrf")
    assert cookie
    assert "HttpOnly" not in response.headers.get("set-cookie", "")
    assert "SameSite=lax" in response.headers.get("set-cookie", "")


def test_auth_responses_are_not_cached(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.headers["Cache-Control"] == "no-store"
