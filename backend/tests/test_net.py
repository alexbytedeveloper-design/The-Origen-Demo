from __future__ import annotations

from types import SimpleNamespace

import pytest

from app import net
from app.net import client_host, origin_allowed


@pytest.mark.parametrize(
    ("origin", "expected"),
    [
        (None, True),
        ("", True),
        ("http://localhost:3000", True),
        ("http://127.0.0.1:3000", True),
        ("http://[::1]:3000", True),
        ("https://localhost:3000", False),
        ("http://localhost:3001", False),
        ("http://evil.example:3000", False),
        ("http://localhost", False),
    ],
)
def test_origin_allowed(origin: str | None, expected: bool) -> None:
    assert origin_allowed(origin, "http://localhost:3000") is expected


@pytest.mark.parametrize(
    "origin",
    [
        "http://[::1",
        "http://localhost:not-a-port",
        "://sin-esquema",
    ],
)
def test_malformed_origin_is_rejected_without_raising(origin: str) -> None:
    assert origin_allowed(origin, "http://localhost:3000") is False


def _request(headers: dict[str, str], host: str | None = "10.0.0.1"):
    return SimpleNamespace(
        headers=headers,
        client=SimpleNamespace(host=host) if host else None,
    )


def test_client_host_ignores_forwarded_header_without_trust(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        net, "get_settings", lambda: SimpleNamespace(trust_proxy=False)
    )
    request = _request({"x-forwarded-for": "203.0.113.9"})
    assert client_host(request) == "10.0.0.1"


def test_client_host_uses_valid_forwarded_header_with_trust(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        net, "get_settings", lambda: SimpleNamespace(trust_proxy=True)
    )
    request = _request({"x-forwarded-for": "203.0.113.9, 10.0.0.1"})
    assert client_host(request) == "203.0.113.9"


def test_client_host_normalizes_ipv6_and_falls_back_on_garbage(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        net, "get_settings", lambda: SimpleNamespace(trust_proxy=True)
    )
    assert client_host(_request({"x-forwarded-for": "2001:DB8::1"})) == "2001:db8::1"
    assert client_host(_request({"x-forwarded-for": "no-es-ip"})) == "10.0.0.1"


def test_client_host_without_client_is_unknown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        net, "get_settings", lambda: SimpleNamespace(trust_proxy=False)
    )
    assert client_host(_request({}, host=None)) == "unknown"
