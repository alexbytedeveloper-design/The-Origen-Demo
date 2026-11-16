"""Utilidades de red: IP del cliente y comprobación de origen."""

from __future__ import annotations

import ipaddress
from urllib.parse import urlsplit

from fastapi import Request

from .config import get_settings

_LOOPBACK = {"localhost", "127.0.0.1", "::1"}


def client_host(request: Request) -> str:
    """IP del cliente sin confiar ciegamente en cabeceras del proxy.

    ``X-Forwarded-For`` solo se lee cuando ``TRUST_PROXY`` está activo, y aun
    así se valida que el primer valor sea una IP real. En el demo el backend
    escucha en loopback y la cabecera no se usa.
    """
    if get_settings().trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "")
        candidate = forwarded.split(",")[0].strip()
        if candidate:
            try:
                return str(ipaddress.ip_address(candidate))
            except ValueError:
                pass
    return request.client.host if request.client else "unknown"


def origin_allowed(origin: str | None, expected: str) -> bool:
    """El navegador solo puede enviar peticiones desde el origen del sitio.

    Un ``Origin`` mal formado (por ejemplo ``http://[::1``) no debe tumbar la
    petición con un 500: se trata como origen no permitido.
    """
    if not origin:
        return True

    try:
        given = urlsplit(origin.strip())
        wanted = urlsplit(expected.strip())
        given_port = given.port
        wanted_port = wanted.port
    except ValueError:
        return False

    if given.scheme != wanted.scheme or given_port != wanted_port:
        return False

    given_host = (given.hostname or "").lower()
    wanted_host = (wanted.hostname or "").lower()
    if given_host == wanted_host:
        return True

    # En desarrollo conviene poder abrir el sitio por localhost o por 127.0.0.1
    # sin que el CSRF cambie de opinión.
    return given_host in _LOOPBACK and wanted_host in _LOOPBACK
