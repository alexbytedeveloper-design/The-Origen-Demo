from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import get_settings
from app.login_guard import guard_keys
from app.rate_limit import limiter

BAD_PASSWORD = "no-es-esta-clave"


def _login(client: TestClient, csrf: dict[str, str], email: str, password: str):
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=csrf,
    )


def _update_guards(db_file: Path, **values: object) -> None:
    if not values:
        return
    assignments = ", ".join(f"{name} = ?" for name in values)
    with sqlite3.connect(db_file) as connection:
        connection.execute(
            f"UPDATE login_guards SET {assignments}", tuple(values.values())
        )
        connection.commit()


def _age_guards(db_file: Path, **values: object) -> None:
    for name, value in values.items():
        if isinstance(value, datetime):
            values[name] = value.strftime("%Y-%m-%d %H:%M:%S.%f")
    _update_guards(db_file, **values)


def test_guard_keys_include_ip_and_normalized_account() -> None:
    assert guard_keys("203.0.113.9", " Foo@Example.COM ") == [
        ("ip", "203.0.113.9"),
        ("account", "foo@example.com"),
    ]
    assert guard_keys("203.0.113.9", "") == [("ip", "203.0.113.9")]


def test_failures_outside_the_window_start_again(
    client: TestClient, csrf: dict[str, str], unique_email: str, db_file: Path
) -> None:
    for _ in range(4):
        assert _login(client, csrf, unique_email, BAD_PASSWORD).status_code == 401

    two_days_ago = datetime.now(timezone.utc) - timedelta(days=2)
    _age_guards(db_file, window_started=two_days_ago)

    # Si la ventana no se reiniciara, el quinto intento bloquearía. Con la
    # ventana vencida, estos cuatro siguen siendo intentos normales.
    for index in range(4):
        response = _login(client, csrf, unique_email, BAD_PASSWORD)
        assert response.status_code == 401, f"intento {index}"

    blocked = _login(client, csrf, unique_email, BAD_PASSWORD)
    assert blocked.status_code == 429
    assert blocked.json()["code"] == "too_many_attempts"


def test_strikes_decay_after_ninety_days(
    client: TestClient, csrf: dict[str, str], unique_email: str, db_file: Path
) -> None:
    settings = get_settings()
    for _ in range(settings.login_attempt_limit):
        _login(client, csrf, unique_email, BAD_PASSWORD)

    expired = datetime.now(timezone.utc) - timedelta(hours=1)
    old_strike = datetime.now(timezone.utc) - timedelta(days=91)
    _age_guards(db_file, locked_until=expired, last_strike_at=old_strike)

    for _ in range(settings.login_attempt_limit):
        response = _login(client, csrf, unique_email, BAD_PASSWORD)

    assert response.status_code == 429
    # El castigo vuelve a empezar en 24 h, no escala a 72 h.
    assert abs(int(response.headers["Retry-After"]) - 24 * 60 * 60) <= 2


def test_successful_login_keeps_strikes_for_the_next_lock(
    client: TestClient, csrf: dict[str, str], unique_email: str, db_file: Path
) -> None:
    settings = get_settings()
    for _ in range(settings.login_attempt_limit):
        _login(client, csrf, unique_email, BAD_PASSWORD)

    expired = datetime.now(timezone.utc) - timedelta(hours=1)
    _age_guards(db_file, locked_until=expired)

    assert _login(client, csrf, "demo@theorigen.cu", "Origen2026!").status_code == 200
    limiter.clear()
    rotated = client.cookies.get("origen_csrf")
    assert rotated
    csrf["X-CSRF-Token"] = rotated

    for _ in range(settings.login_attempt_limit - 1):
        assert _login(client, csrf, unique_email, BAD_PASSWORD).status_code == 401

    response = _login(client, csrf, unique_email, BAD_PASSWORD)
    assert response.status_code == 429
    assert abs(int(response.headers["Retry-After"]) - 72 * 60 * 60) <= 2
