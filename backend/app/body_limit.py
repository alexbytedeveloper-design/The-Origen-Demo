"""Límite real del cuerpo de una petición.

``Content-Length`` es una pista, no una garantía: un cliente puede omitirlo y
enviar el cuerpo por trozos (``Transfer-Encoding: chunked``). Este middleware
cuenta los bytes que llegan de verdad y corta la petición en cuanto supera el
máximo, antes de que el endpoint intente deserializarla.

Se coloca dentro del middleware de seguridad para que la respuesta 413 también
salga con las cabeceras habituales.
"""

from __future__ import annotations

import json

from starlette.types import ASGIApp, Message, Receive, Scope, Send


class BodyLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def _reject(self, send: Send) -> None:
        payload = json.dumps(
            {
                "detail": "La petición es demasiado grande.",
                "code": "payload_too_large",
            },
            ensure_ascii=False,
        ).encode("utf-8")

        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json; charset=utf-8"),
                    (b"content-length", str(len(payload)).encode("ascii")),
                    (b"cache-control", b"no-store"),
                ],
            }
        )
        await send({"type": "http.response.body", "body": payload})

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # El cuerpo se lee aquí, acotado por ``max_bytes``, y se reproduce
        # después. No basta con lanzar una excepción desde ``receive``: FastAPI
        # la interpreta como un JSON inválido y responde 400 en lugar de 413.
        cached: list[Message] = []
        received = 0

        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                cached.append(message)
                break
            if message["type"] != "http.request":
                cached.append(message)
                continue

            received += len(message.get("body", b""))
            if received > self.max_bytes:
                await self._reject(send)
                return

            cached.append(message)
            if not message.get("more_body", False):
                break

        index = 0

        async def replay() -> Message:
            nonlocal index
            if index < len(cached):
                message = cached[index]
                index += 1
                return message
            return await receive()

        await self.app(scope, replay, send)
