"""Límite de peticiones en memoria: suficiente para un demo de una sola instancia.

En producción con varias réplicas esto se sustituye por Redis o el limitador
del proxy (nginx, Cloudflare). Aquí evita fuerza bruta y spam de reservas.
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict, deque

# Un límite de claves evita que un atacante llene la memoria enviando correos
# distintos: el diccionario se comporta como una LRU y descarta la entrada más
# antigua. En producción el limitador vive en Redis o en el proxy.
DEFAULT_MAX_KEYS = 10_000


class RateLimiter:
    def __init__(self, max_keys: int = DEFAULT_MAX_KEYS) -> None:
        self._hits: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = threading.Lock()
        self._max_keys = max(max_keys, 1)

    def hit(self, key: str, limit: int, window: int) -> int:
        """Registra un intento. Devuelve 0 si pasa o los segundos de espera si no."""
        now = time.monotonic()
        with self._lock:
            bucket = self._hits.get(key)
            if bucket is None:
                if len(self._hits) >= self._max_keys:
                    self._hits.popitem(last=False)
                bucket = deque()
                self._hits[key] = bucket
            else:
                self._hits.move_to_end(key)

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

    def __len__(self) -> int:
        with self._lock:
            return len(self._hits)



limiter = RateLimiter()
