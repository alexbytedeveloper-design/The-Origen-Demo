from __future__ import annotations

from fastapi.testclient import TestClient

from app.security import create_token, decode_token

DEMO = {"email": "demo@theorigen.cu", "password": "Origen2026!"}


def _login(client: TestClient, csrf: dict[str, str], **overrides):
    payload = {**DEMO, **overrides}
    return client.post("/api/v1/auth/login", json=payload, headers=csrf)


def _csrf(client: TestClient) -> dict[str, str]:
    token = client.cookies.get("origen_csrf")
    assert token
    return {"X-CSRF-Token": token}


def test_decode_token_rejects_expired_wrong_type_and_tampering() -> None:
    expired = create_token("user-1", "access", ttl=-1)
    assert decode_token(expired, "access") is None

    refresh = create_token("user-1", "refresh", ttl=60)
    assert decode_token(refresh, "access") is None
    assert decode_token(refresh, "refresh") == "user-1"

    access = create_token("user-1", "access", ttl=60)
    header, payload, signature = access.split(".")
    # Cambiar el primer carácter de la firma garantiza otra firma: tocar el
    # último puede caer en los bits de relleno base64 y decodificar igual.
    flipped = ("A" if signature[0] != "A" else "B") + signature[1:]
    tampered = f"{header}.{payload}.{flipped}"
    assert decode_token(tampered, "access") is None


def test_tampered_access_token_without_refresh_is_rejected(
    client: TestClient, csrf: dict[str, str]
) -> None:
    assert _login(client, csrf).status_code == 200
    access = client.cookies.get("origen_access")
    assert access

    client.cookies.set("origen_access", access[:-1] + "x")
    client.cookies.delete("origen_refresh")
    assert client.get("/api/v1/auth/me").status_code == 401


def test_expired_access_token_is_refreshed_transparently(
    client: TestClient, csrf: dict[str, str]
) -> None:
    login = _login(client, csrf)
    assert login.status_code == 200

    user_id = login.json()["id"]
    client.cookies.set("origen_access", create_token(user_id, "access", ttl=-1))
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["id"] == user_id


def test_refresh_reuse_revokes_the_rotated_session(
    client: TestClient, csrf: dict[str, str]
) -> None:
    assert _login(client, csrf).status_code == 200
    first_refresh = client.cookies.get("origen_refresh")
    assert first_refresh

    rotated = client.post("/api/v1/auth/refresh", headers=_csrf(client))
    assert rotated.status_code == 200
    second_refresh = client.cookies.get("origen_refresh")
    assert second_refresh and second_refresh != first_refresh

    # Un refresh viejo (robado o de una pestaña anterior) revoca la sesión.
    client.cookies.set("origen_refresh", first_refresh)
    client.cookies.delete("origen_access")
    reused = client.post("/api/v1/auth/refresh", headers=_csrf(client))
    assert reused.status_code == 401
    assert reused.json()["code"] == "session_expired"

    # El refresh que acababa de emitirse tampoco sirve después de la revocación.
    client.cookies.set("origen_refresh", second_refresh)
    client.cookies.delete("origen_access")
    assert (
        client.post("/api/v1/auth/refresh", headers=_csrf(client)).status_code
        == 401
    )


def test_access_token_cannot_act_as_refresh(
    client: TestClient, csrf: dict[str, str]
) -> None:
    assert _login(client, csrf).status_code == 200
    access = client.cookies.get("origen_access")
    assert access

    client.cookies.set("origen_refresh", access)
    client.cookies.delete("origen_access")
    response = client.post("/api/v1/auth/refresh", headers=_csrf(client))
    assert response.status_code == 401


def test_refresh_token_cannot_act_as_access(
    client: TestClient, csrf: dict[str, str]
) -> None:
    assert _login(client, csrf).status_code == 200
    refresh = client.cookies.get("origen_refresh")
    assert refresh

    client.cookies.set("origen_access", refresh)
    client.cookies.delete("origen_refresh")
    assert client.get("/api/v1/auth/me").status_code == 401


def test_logout_works_with_an_expired_access_token(
    client: TestClient, csrf: dict[str, str]
) -> None:
    login = _login(client, csrf)
    assert login.status_code == 200
    user_id = login.json()["id"]

    client.cookies.set("origen_access", create_token(user_id, "access", ttl=-1))
    response = client.post(
        "/api/v1/auth/logout", headers=_csrf(client)
    )
    assert response.status_code == 204

    client.cookies.clear()
    assert client.get("/api/v1/auth/me").status_code == 401


def test_login_email_is_case_insensitive(
    client: TestClient, csrf: dict[str, str]
) -> None:
    response = _login(client, csrf, email="DEMO@THEORIGEN.CU")
    assert response.status_code == 200
    assert response.json()["email"] == "demo@theorigen.cu"


def test_register_duplicate_is_case_insensitive(
    client: TestClient, csrf: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Otra Mesa",
            "email": "Demo@TheOrigen.CU",
            "password": "ClaveSegura2026!",
        },
        headers=csrf,
    )
    assert response.status_code == 409
    assert response.json()["code"] == "email_taken"


def test_unknown_email_and_wrong_password_look_the_same(
    client: TestClient, csrf: dict[str, str]
) -> None:
    unknown = _login(client, csrf, email="nadie@example.com")
    wrong = _login(client, csrf, password="no-es-esta-clave")
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json() == wrong.json()


def test_password_limits_and_whitespace(
    client: TestClient, csrf: dict[str, str], unique_email: str
) -> None:
    too_long = client.post(
        "/api/v1/auth/register",
        json={"name": "Larga", "email": unique_email, "password": "x" * 129},
        headers=csrf,
    )
    assert too_long.status_code == 422

    with_spaces = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Espacios",
            "email": f"spaces-{unique_email}",
            "password": " clave-segura ",
        },
        headers=csrf,
    )
    assert with_spaces.status_code == 422


def test_name_is_normalized(
    client: TestClient, csrf: dict[str, str], unique_email: str
) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "  Ana   María  ",
            "email": unique_email,
            "password": "ClaveSegura2026!",
        },
        headers=csrf,
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Ana María"


def test_csrf_rotates_on_login(
    client: TestClient, csrf: dict[str, str]
) -> None:
    before = client.cookies.get("origen_csrf")
    assert before
    assert _login(client, csrf).status_code == 200
    after = client.cookies.get("origen_csrf")
    assert after and after != before


def test_register_response_does_not_expose_secrets(
    client: TestClient, csrf: dict[str, str], unique_email: str
) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Sin Secretos",
            "email": unique_email,
            "password": "ClaveSegura2026!",
        },
        headers=csrf,
    )
    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "name", "email", "role"}
    assert body["role"] == "guest"
    assert "password" not in response.text.lower()


def test_me_and_refresh_without_cookies(
    client: TestClient, csrf: dict[str, str]
) -> None:
    client.cookies.delete("origen_access")
    client.cookies.delete("origen_refresh")
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.post("/api/v1/auth/refresh", headers=csrf).status_code == 401
