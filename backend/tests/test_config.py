from __future__ import annotations

import base64

import pytest

from app.config import _flag, _int, _parse_key, _validate_origin


def test_parse_key_accepts_raw_base64_and_hex() -> None:
    raw = "0123456789abcdef0123456789abcdef"
    assert _parse_key(raw, "KEY") == raw.encode("ascii")

    encoded = base64.urlsafe_b64encode(b"x" * 32).decode("ascii")
    assert _parse_key(encoded, "KEY") == b"x" * 32

    hexadecimal = (b"y" * 32).hex()
    assert _parse_key(hexadecimal, "KEY") == b"y" * 32


def test_parse_key_rejects_wrong_length() -> None:
    with pytest.raises(RuntimeError):
        _parse_key("demasiado-corta", "KEY")


def test_origin_validation() -> None:
    assert (
        _validate_origin("http://localhost:3000/", production=False)
        == "http://localhost:3000"
    )
    assert (
        _validate_origin("https://origen.example", production=True)
        == "https://origen.example"
    )

    with pytest.raises(RuntimeError):
        _validate_origin("localhost:3000", production=False)
    with pytest.raises(RuntimeError):
        _validate_origin("http://origen.example", production=True)


def test_int_bounds_and_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ORIGEN_TEST_INT", raising=False)
    assert _int("ORIGEN_TEST_INT", 7, 1, 10) == 7

    monkeypatch.setenv("ORIGEN_TEST_INT", "9")
    assert _int("ORIGEN_TEST_INT", 7, 1, 10) == 9

    monkeypatch.setenv("ORIGEN_TEST_INT", "no-numero")
    with pytest.raises(RuntimeError):
        _int("ORIGEN_TEST_INT", 7, 1, 10)

    monkeypatch.setenv("ORIGEN_TEST_INT", "11")
    with pytest.raises(RuntimeError):
        _int("ORIGEN_TEST_INT", 7, 1, 10)


@pytest.mark.parametrize("raw", ["1", "true", "YES", "on"])
def test_flag_true_values(monkeypatch: pytest.MonkeyPatch, raw: str) -> None:
    monkeypatch.setenv("ORIGEN_TEST_FLAG", raw)
    assert _flag("ORIGEN_TEST_FLAG") is True


@pytest.mark.parametrize("raw", ["0", "false", "no", "off", "cualquier-cosa"])
def test_flag_false_values(monkeypatch: pytest.MonkeyPatch, raw: str) -> None:
    monkeypatch.setenv("ORIGEN_TEST_FLAG", raw)
    assert _flag("ORIGEN_TEST_FLAG") is False
