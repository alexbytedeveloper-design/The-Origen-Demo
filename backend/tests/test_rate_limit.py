from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from app.rate_limit import RateLimiter


def test_hit_allows_limit_then_returns_retry_after() -> None:
    limiter = RateLimiter()

    for _ in range(3):
        assert limiter.hit("ip:1", limit=3, window=60) == 0

    retry = limiter.hit("ip:1", limit=3, window=60)
    assert 1 <= retry <= 61


def test_keys_are_independent() -> None:
    limiter = RateLimiter()
    assert limiter.hit("a", limit=1, window=60) == 0
    assert limiter.hit("b", limit=1, window=60) == 0
    assert limiter.hit("a", limit=1, window=60) > 0


def test_reset_and_clear() -> None:
    limiter = RateLimiter()
    assert limiter.hit("a", limit=1, window=60) == 0
    limiter.reset("a")
    assert limiter.hit("a", limit=1, window=60) == 0

    limiter.clear()
    assert len(limiter) == 0


def test_number_of_keys_is_bounded() -> None:
    limiter = RateLimiter(max_keys=3)
    for index in range(10):
        limiter.hit(f"email:{index}", limit=5, window=60)

    assert len(limiter) == 3


def test_concurrent_hits_do_not_exceed_the_limit() -> None:
    limiter = RateLimiter()

    def attempt(_: int) -> int:
        return limiter.hit("same-key", limit=10, window=60)

    with ThreadPoolExecutor(max_workers=16) as pool:
        results = list(pool.map(attempt, range(100)))

    assert sum(1 for result in results if result == 0) == 10
    assert sum(1 for result in results if result > 0) == 90
