from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import get_settings
from app.login_guard import lock_seconds_for_strike
from app.rate_limit import limiter

BAD_PASSWORD = "no-es-esta-clave"


def _login(client: TestClient, csrf: dict[str, str], email: str, password: str):
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=csrf,
    )


def _expire_locks(db_file: Path) -> None:
    past = datetime.now(timezone.utc) - timedelta(hours=1)
    with sqlite3.connect(db_file) as connection:
        connection.execute(
            "UPDATE login_guards SET locked_until = ? WHERE locked_until IS NOT NULL",
            (past.strftime("%Y-%m-%d %H:%M:%S.%f"),),
        )
        connection.commit()


def test_lockout_durations_grow_exponentially() -> None:
    assert lock_seconds_for_strike(1) == 24 * 60 * 60
    assert lock_seconds_for_strike(2) == 72 * 60 * 60
    assert lock_seconds_for_strike(3) == 216 * 60 * 60
    assert lock_seconds_for_strike(4) == 648 * 60 * 60
    assert lock_seconds_for_strike(5) == 30 * 24 * 60 * 60


def test_five_failures_lock_for_a_day(
    client: TestClient, csrf: dict[str, str], unique_email: str
) -> None:
    for _ in range(get_settings().login_attempt_limit - 1):
        assert _login(client, csrf, unique_email, BAD_PASSWORD).status_code == 401

    locked = _login(client, csrf, unique_email, BAD_PASSWORD)
    assert locked.status_code == 429
    assert locked.json()["code"] == "too_many_attempts"
    assert int(locked.headers["Retry-After"]) == 24 * 60 * 60

    # Incluso la contraseña correcta queda fuera mientras dure el bloqueo.
    blocked = _login(client, csrf, "demo@theorigen.cu", "Origen2026!")
    assert blocked.status_code == 429


def test_lockout_escalates_until_ip_is_blocked(
    client: TestClient, csrf: dict[str, str], unique_email: str, db_file: Path
) -> None:
    settings = get_settings()

    for strike in range(1, settings.login_max_strikes + 1):
        limiter.clear()
        response = None
        for _ in range(settings.login_attempt_limit):
            response = _login(client, csrf, unique_email, BAD_PASSWORD)

        assert response is not None

        if strike < settings.login_max_strikes:
            assert response.status_code == 429, f"strike {strike}"
            expected = lock_seconds_for_strike(strike)
            assert abs(int(response.headers["Retry-After"]) - expected) <= 2
            _expire_locks(db_file)
        else:
            assert response.status_code == 403
            assert response.json()["code"] == "ip_blocked"

    with sqlite3.connect(db_file) as connection:
        blocked = connection.execute(
            "SELECT blocked FROM login_guards WHERE key LIKE 'ip:%'"
        ).fetchone()
    assert blocked and blocked[0] == 1

    # El bloqueo de IP es permanente: ni la cuenta correcta puede entrar.
    limiter.clear()
    assert _login(client, csrf, "demo@theorigen.cu", "Origen2026!").status_code == 403


def test_successful_login_resets_the_failure_counter(
    client: TestClient, csrf: dict[str, str]
) -> None:
    for index in range(4):
        assert (
            _login(client, csrf, f"intento-{index}@example.com", BAD_PASSWORD).status_code
            == 401
        )

    assert _login(client, csrf, "demo@theorigen.cu", "Origen2026!").status_code == 200
    client.cookies.delete("origen_access")
    client.cookies.delete("origen_refresh")
    # El acceso correcto rota el CSRF, como haría el navegador.
    csrf["X-CSRF-Token"] = client.cookies.get("origen_csrf")

    # El contador de la IP empezó de cero: cuatro fallos más no bloquean todavía.
    for index in range(4):
        assert (
            _login(client, csrf, f"otro-{index}@example.com", BAD_PASSWORD).status_code
            == 401
        )
    assert (
        _login(client, csrf, "ultimo@example.com", BAD_PASSWORD).status_code == 429
    )
