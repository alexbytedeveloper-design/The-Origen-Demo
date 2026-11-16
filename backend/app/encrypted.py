"""Tipo de columna que cifra al escribir y descifra al leer."""

from __future__ import annotations

from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from .crypto import decrypt_text, encrypt_text


class EncryptedText(TypeDecorator[str]):
    """Texto cifrado con AES-256-GCM en la base de datos.

    Las filas antiguas en claro se leen sin problema; en cuanto se vuelven a
    guardar quedan cifradas. El texto cifrado ocupa más que el original, así
    que la columna subyacente es ``TEXT`` y no un ``VARCHAR`` ajustado.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: object, dialect: object) -> str | None:
        if value is None:
            return None
        return encrypt_text(str(value))

    def process_result_value(self, value: object, dialect: object) -> str | None:
        if value is None:
            return None
        return decrypt_text(str(value))
