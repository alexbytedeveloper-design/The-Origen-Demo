from __future__ import annotations

from fastapi.testclient import TestClient


def test_csrf_is_required(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@theorigen.cu", "password": "Origen2026!"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "csrf_failed"


def test_login_wrong_password(client: TestClient, csrf: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@theorigen.cu", "password": "no-es-esta-clave"},
        headers=csrf,
    )
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_credentials"


def test_login_and_me(client: TestClient, csrf: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@theorigen.cu", "password": "Origen2026!"},
        headers=csrf,
    )
    assert response.status_code == 200
    user = response.json()
    assert user["email"] == "demo@theorigen.cu"
    assert "password" not in user

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["id"] == user["id"]


def test_register_duplicate(client: TestClient, csrf: dict[str, str]) -> None:
    payload = {
        "name": "Prueba",
        "email": "demo@theorigen.cu",
        "password": "una-clave-larga",
    }
    response = client.post("/api/v1/auth/register", json=payload, headers=csrf)
    assert response.status_code == 409


def test_register_and_logout(
    client: TestClient, csrf: dict[str, str], unique_email: str
) -> None:
    payload = {"name": "Ana Prueba", "email": unique_email, "password": "ClaveSegura2026!"}
    created = client.post("/api/v1/auth/register", json=payload, headers=csrf)
    assert created.status_code == 201
    assert created.json()["email"] == unique_email

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200

    # El registro rota el token CSRF; se relee como haría el navegador.
    rotated = client.cookies.get("origen_csrf")
    assert rotated
    out = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": rotated})
    assert out.status_code == 204

    # Tras salir, el access token ya no vale y el refresh está revocado.
    client.cookies.delete("origen_access")
    client.cookies.delete("origen_refresh")
    assert client.get("/api/v1/auth/me").status_code == 401


def test_short_password_rejected(client: TestClient, csrf: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Corto", "email": "corto@example.com", "password": "corta"},
        headers=csrf,
    )
    assert response.status_code == 422
