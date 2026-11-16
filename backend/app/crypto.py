"""Cifrado de datos personales en reposo con AES-256-GCM.

Las contraseñas nunca pasan por aquí: se almacenan con Argon2id, que es un
hash pensado para verificar y no para recuperar. Lo que sí se cifra con
AES-256-GCM son los datos personales de las reservas (nombre, correo,
teléfono y notas), porque el restaurante necesita leerlos y la base de datos
no debería guardarlos en claro.

Formato de un valor cifrado::

    enc:v1:<base64url(nonce de 12 bytes | ciphertexto | etiqueta de 16 bytes)>

GCM se usa en modo autenticado: si alguien altera un solo byte del texto
cifrado, ``decrypt`` falla en lugar de devolver basura. La asociación
adicional (AAD) ata cada valor a la versión del formato para que no se pueda
reutilizar un texto cifrado de otro contexto.
"""

from __future__ import annotations

import base64
import binascii
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .config import get_settings

PREFIX = "enc:v1:"
AAD = b"the-origen:pii:v1"
NONCE_BYTES = 12


class DecryptionError(ValueError):
    """El valor cifrado está corrupto o la clave no es la correcta."""


def _key() -> bytes:
    key = get_settings().data_key
    if len(key) != 32:
        raise RuntimeError("DATA_ENCRYPTION_KEY debe tener 32 bytes")
    return key


def encrypt_text(plaintext: str) -> str:
    if not isinstance(plaintext, str):
        raise TypeError("Solo se cifran cadenas de texto")
    if plaintext.startswith(PREFIX):
        # Ya está cifrado: no se vuelve a envolver.
        return plaintext

    nonce = os.urandom(NONCE_BYTES)
    ciphertext = AESGCM(_key()).encrypt(nonce, plaintext.encode("utf-8"), AAD)
    payload = base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")
    return f"{PREFIX}{payload}"


def decrypt_text(value: str) -> str:
    if not value.startswith(PREFIX):
        # Compatibilidad con filas antiguas guardadas en claro.
        return value

    raw = value[len(PREFIX) :]
    try:
        blob = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
    except (binascii.Error, ValueError) as exc:
        raise DecryptionError("Texto cifrado con base64 inválido") from exc

    if len(blob) < NONCE_BYTES + 16:
        raise DecryptionError("Texto cifrado incompleto")

    nonce, ciphertext = blob[:NONCE_BYTES], blob[NONCE_BYTES:]
    try:
        return AESGCM(_key()).decrypt(nonce, ciphertext, AAD).decode("utf-8")
    except (InvalidTag, UnicodeDecodeError) as exc:
        raise DecryptionError("No se pudo descifrar el valor") from exc


def is_encrypted(value: str | None) -> bool:
    return bool(value) and value.startswith(PREFIX)
