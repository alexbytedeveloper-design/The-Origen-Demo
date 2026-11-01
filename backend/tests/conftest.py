"""Configuración común de las pruebas.

Se usa un SQLite temporal distinto en cada ejecución y se importa la app
después de fijar las variables de entorno.
"""

from __future__ import annotations

import os
import tempfile
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TMP = Path(tempfile.mkdtemp(prefix="origen-tests-"))
DB_FILE = TMP / "test.db"

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{DB_FILE.as_posix()}"
os.environ["JWT_SECRET"] = "test-secret-0123456789abcdef0123456789abcdef"
os.environ["COOKIE_SECURE"] = "false"
os.environ["SEED_DEMO"] = "true"
os.environ["APP_ENV"] = "test"

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def csrf(client: TestClient) -> dict[str, str]:
    client.get("/api/v1/auth/csrf")
    token = client.cookies.get("origen_csrf")
    assert token
    return {"X-CSRF-Token": token}


@pytest.fixture
def unique_email() -> str:
    return f"test-{uuid.uuid4().hex[:10]}@example.com"
