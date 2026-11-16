from __future__ import annotations

import pytest

from app.crypto import PREFIX, DecryptionError, decrypt_text, encrypt_text, is_encrypted


def test_roundtrip_preserves_unicode() -> None:
    original = "María Núñez · +53 50667554 · 日本語"
    sealed = encrypt_text(original)

    assert sealed.startswith(PREFIX)
    assert original not in sealed
    assert decrypt_text(sealed) == original


def test_same_text_produces_different_ciphertext() -> None:
    one = encrypt_text("Calle 3ra entre 24 y 26")
    two = encrypt_text("Calle 3ra entre 24 y 26")

    assert one != two, "el nonce debe ser aleatorio en cada cifrado"
    assert decrypt_text(one) == decrypt_text(two)


def test_legacy_plaintext_is_readable() -> None:
    assert decrypt_text("texto antiguo sin cifrar") == "texto antiguo sin cifrar"
    assert not is_encrypted("texto antiguo sin cifrar")


def test_tampering_is_detected() -> None:
    sealed = encrypt_text("dato sensible")
    changed = sealed[:-1] + ("A" if sealed[-1] != "A" else "B")

    with pytest.raises(DecryptionError):
        decrypt_text(changed)


def test_encrypting_twice_does_not_double_wrap() -> None:
    once = encrypt_text("hola")
    assert encrypt_text(once) == once


def test_empty_string_roundtrip() -> None:
    # AES-GCM con texto vacío produce solo la etiqueta de 16 bytes; debe poder
    # descifrarse. Las notas de una reserva pueden venir vacías.
    sealed = encrypt_text("")
    assert sealed.startswith(PREFIX)
    assert decrypt_text(sealed) == ""


def test_truncated_and_invalid_payloads_raise() -> None:
    with pytest.raises(DecryptionError):
        decrypt_text(f"{PREFIX}no-es-base64-@@@")

    with pytest.raises(DecryptionError):
        decrypt_text(PREFIX)

    with pytest.raises(DecryptionError):
        decrypt_text(encrypt_text("dato")[:-8])


def test_non_string_is_rejected() -> None:
    with pytest.raises(TypeError):
        encrypt_text(123)  # type: ignore[arg-type]

