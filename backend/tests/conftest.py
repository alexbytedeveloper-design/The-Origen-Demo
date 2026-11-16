"""Configuración común de las pruebas.

Se usa un SQLite temporal distinto en cada ejecución y se importa la app
después de fijar las variables de entorno.
"""

from __future__ import annotations

import os
import sqlite3
import tempfile
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TMP = Path(tempfile.mkdtemp(prefix="origen-tests-"))
DB_FILE = TMP / "test.db"

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{DB_FILE.as_posix()}"
os.environ["JWT_SECRET"] = "test-secret-0123456789abcdef0123456789abcdef"
os.environ["DATA_ENCRYPTION_KEY"] = "test-data-key-0123456789abcdef!!"
os.environ["COOKIE_SECURE"] = "false"
os.environ["SEED_DEMO"] = "true"
os.environ["APP_ENV"] = "test"

from app.main import app  # noqa: E402
from app.rate_limit import limiter  # noqa: E402


@pytest.fixture(autouse=True)
def clean_state(client: TestClient):
    """Cada prueba empieza sin bloqueos, ráfagas ni sesión heredada."""
    limiter.clear()
    # El TestClient es de sesión: si no se limpian, una prueba de acceso deja
    # cookies que cambian el resultado de la siguiente (y cookies duplicadas
    # con dominios distintos hacen que httpx lance CookieConflict).
    client.cookies.clear()
    with sqlite3.connect(DB_FILE) as connection:
        try:
            connection.execute("DELETE FROM login_guards")
            connection.commit()
        except sqlite3.OperationalError:
            pass
    yield
    limiter.clear()


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def db_file() -> Path:
    return DB_FILE


@pytest.fixture
def csrf(client: TestClient) -> dict[str, str]:
    client.get("/api/v1/auth/csrf")
    token = client.cookies.get("origen_csrf")
    assert token
    return {"X-CSRF-Token": token}


@pytest.fixture
def unique_email() -> str:
    return f"test-{uuid.uuid4().hex[:10]}@example.com"
