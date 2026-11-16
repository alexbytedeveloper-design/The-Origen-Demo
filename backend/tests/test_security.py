from __future__ import annotations

from fastapi.testclient import TestClient


def test_oversized_body_is_rejected_before_parsing(
    client: TestClient, csrf: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/reservations",
        json={"notes": "x" * 70_000},
        headers=csrf,
    )
    assert response.status_code == 413
    assert response.json()["code"] == "payload_too_large"


def test_cross_origin_post_is_rejected(
    client: TestClient, csrf: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@theorigen.cu", "password": "Origen2026!"},
        headers={**csrf, "Origin": "https://sitio-malicioso.example"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "origin_failed"


def test_cross_site_fetch_metadata_is_rejected(
    client: TestClient, csrf: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@theorigen.cu", "password": "Origen2026!"},
        headers={**csrf, "Sec-Fetch-Site": "cross-site"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "origin_failed"


def test_missing_csrf_has_security_headers(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@theorigen.cu", "password": "Origen2026!"},
    )
    assert response.status_code == 403
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_extra_fields_are_forbidden(client: TestClient, csrf: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "demo@theorigen.cu",
            "password": "Origen2026!",
            "role": "admin",
        },
        headers=csrf,
    )
    assert response.status_code == 422
    assert response.json()["code"] == "invalid_input"


def test_validation_errors_do_not_echo_values(
    client: TestClient, csrf: dict[str, str]
) -> None:
    secret = "clave-secreta-que-no-debe-volver"
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "A", "email": "no-es-correo", "password": secret},
        headers=csrf,
    )
    assert response.status_code == 422
    assert secret not in response.text


def test_free_text_is_not_reflected_as_html(
    client: TestClient, csrf: dict[str, str]
) -> None:
    from datetime import date, timedelta

    response = client.post(
        "/api/v1/reservations",
        json={
            "date": (date.today() + timedelta(days=1)).isoformat(),
            "time": "20:00",
            "partySize": 2,
            "name": "<script>alert(1)</script>",
            "email": "xss@example.com",
            "phone": "+53 50667554",
            "notes": "<img src=x onerror=alert(1)>",
        },
        headers=csrf,
    )
    # Se guarda como texto; el cliente no recibe HTML ejecutable.
    assert response.status_code == 201
    assert "<script>" not in response.headers.get("content-type", "")
    assert response.json()["name"] == "<script>alert(1)</script>"
