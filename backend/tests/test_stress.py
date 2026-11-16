from __future__ import annotations

import asyncio
from datetime import timedelta

import httpx
from fastapi.testclient import TestClient

from app.clock import restaurant_today
from app.main import app

ORIGIN = "http://localhost:3000"


def _payload(index: int) -> dict:
    return {
        "date": (restaurant_today() + timedelta(days=1)).isoformat(),
        "time": "20:00",
        "partySize": 2,
        "name": f"Cliente {index}",
        "email": f"stress-{index}@example.com",
        "phone": "+53 50667554",
        "notes": "Prueba de carga",
    }


def _run(coro):
    return asyncio.run(coro)


def test_many_health_requests_in_parallel() -> None:
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            return await asyncio.gather(
                *(client.get("/api/v1/health") for _ in range(50))
            )

    responses = _run(scenario())
    assert all(response.status_code == 200 for response in responses)
    assert all(response.json() == {"status": "ok"} for response in responses)


def test_content_requests_in_parallel() -> None:
    locales = ("es", "en", "fr", "ru") * 10

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            return await asyncio.gather(
                *(client.get(f"/api/v1/content/{locale}") for locale in locales)
            )

    responses = _run(scenario())
    assert all(response.status_code == 200 for response in responses)
    for locale, response in zip(locales, responses, strict=True):
        assert response.json()["locale"] == locale


def test_reservations_in_parallel(client: TestClient) -> None:
    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as async_client:
            await async_client.get("/api/v1/auth/csrf")
            token = async_client.cookies.get("origen_csrf")
            assert token
            headers = {
                "Origin": ORIGIN,
                "X-CSRF-Token": token,
                "Content-Type": "application/json",
            }
            return await asyncio.gather(
                *(
                    async_client.post(
                        "/api/v1/reservations",
                        json=_payload(index),
                        headers=headers,
                    )
                    for index in range(8)
                )
            )

    responses = _run(scenario())
    assert [response.status_code for response in responses] == [201] * 8
    assert len({response.json()["id"] for response in responses}) == 8


def test_concurrent_login_failures_still_lock_the_ip() -> None:
    async def hammer() -> list[httpx.Response]:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as async_client:
            await async_client.get("/api/v1/auth/csrf")
            token = async_client.cookies.get("origen_csrf")
            assert token
            headers = {"Origin": ORIGIN, "X-CSRF-Token": token}
            return await asyncio.gather(
                *(
                    async_client.post(
                        "/api/v1/auth/login",
                        json={
                            "email": f"concurrent-{index}@example.com",
                            "password": "no-es-esta-clave",
                        },
                        headers=headers,
                    )
                    for index in range(6)
                )
            )

    responses = _run(hammer())
    assert all(response.status_code in {401, 429} for response in responses)
    # Cinco fallos cierran la IP; el sexto, aunque ya estaba en vuelo, también
    # recibe la negativa en lugar de un 401 engañoso.
    assert sum(response.status_code == 429 for response in responses) >= 2

    async def retry_valid() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as async_client:
            await async_client.get("/api/v1/auth/csrf")
            token = async_client.cookies.get("origen_csrf")
            assert token
            return await async_client.post(
                "/api/v1/auth/login",
                json={"email": "demo@theorigen.cu", "password": "Origen2026!"},
                headers={"Origin": ORIGIN, "X-CSRF-Token": token},
            )

    # Ni siquiera las credenciales correctas pasan mientras la IP está cerrada.
    blocked = _run(retry_valid())
    assert blocked.status_code == 429
    assert blocked.json()["code"] == "too_many_attempts"
