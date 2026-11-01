"""Límite de peticiones en memoria: suficiente para un demo de una sola instancia.

En producción con varias réplicas esto se sustituye por Redis o el limitador
del proxy (nginx, Cloudflare). Aquí evita fuerza bruta y spam de reservas.
"""

from __future__ import annotations

import threading
import time
from collections import deque


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window: int) -> int:
        """Registra un intento. Devuelve 0 si pasa o los segundos de espera si no."""
        now = time.monotonic()
        with self._lock:
            bucket = self._hits.setdefault(key, deque())
            cutoff = now - window
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = int(bucket[0] + window - now) + 1
                return max(retry_after, 1)

            bucket.append(now)
            return 0

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()
