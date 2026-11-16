"""Prueba de carga y de soporte contra una API de The Origen ya arrancada.

No escribe reservas ni intenta accesos: solo consulta health y contenido, de
modo que puede ejecutarse contra el demo sin ensuciar la base de datos.

Uso:
    python scripts/stress_api.py
    python scripts/stress_api.py --base-url http://127.0.0.1:8000 --requests 500
    python scripts/stress_api.py --concurrency 32 --json
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Iterable
from urllib.parse import urlparse

import httpx

LOCALES = ("es", "en", "fr", "ru")
REQUIRED_HEADERS = (
    "x-content-type-options",
    "x-frame-options",
    "content-security-policy",
    "x-request-id",
)


@dataclass
class Sample:
    path: str
    status: int
    elapsed_ms: float
    headers: dict[str, str]


@dataclass
class Summary:
    samples: list[Sample] = field(default_factory=list)
    duration_seconds: float = 0.0

    @property
    def total(self) -> int:
        return len(self.samples)

    @property
    def failures(self) -> list[Sample]:
        return [sample for sample in self.samples if sample.status != 200]

    def percentiles(self) -> dict[str, float]:
        values = sorted(sample.elapsed_ms for sample in self.samples)
        if not values:
            return {}

        def pick(percent: float) -> float:
            index = min(int(round((len(values) - 1) * percent)), len(values) - 1)
            return round(values[index], 1)

        return {
            "min": round(values[0], 1),
            "p50": pick(0.50),
            "p95": pick(0.95),
            "p99": pick(0.99),
            "max": round(values[-1], 1),
            "mean": round(statistics.fmean(values), 1),
        }

    def report(self) -> dict:
        return {
            "total": self.total,
            "ok": self.total - len(self.failures),
            "failed": [
                {
                    "path": sample.path,
                    "status": sample.status,
                    "elapsedMs": sample.elapsed_ms,
                }
                for sample in self.failures
            ],
            "latencyMs": self.percentiles(),
            "throughputRps": (
                round(self.total / self.duration_seconds, 1)
                if self.duration_seconds
                else None
            ),
        }


def _base_url(raw: str) -> str:
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise SystemExit(f"URL no válida: {raw}")
    return raw.rstrip("/")


def _fetch(client: httpx.Client, path: str) -> Sample:
    started = time.perf_counter()
    response = client.get(path)
    elapsed_ms = (time.perf_counter() - started) * 1000
    return Sample(
        path=path,
        status=response.status_code,
        elapsed_ms=round(elapsed_ms, 1),
        headers={key.lower(): value for key, value in response.headers.items()},
    )


def _run(
    base_url: str,
    paths: Iterable[str],
    concurrency: int,
    timeout: float,
) -> Summary:
    limits = httpx.Limits(max_connections=concurrency, max_keepalive_connections=concurrency)
    summary = Summary()
    started = time.perf_counter()
    with httpx.Client(
        base_url=base_url,
        timeout=timeout,
        limits=limits,
        headers={"User-Agent": "origen-stress/1.0"},
    ) as client:

        def one(path: str) -> Sample:
            return _fetch(client, path)

        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            for sample in pool.map(one, paths):
                summary.samples.append(sample)

    summary.duration_seconds = time.perf_counter() - started
    return summary


def _preflight(client: httpx.Client) -> list[str]:
    problems: list[str] = []

    health = client.get("/api/v1/health")
    if health.status_code != 200 or health.json() != {"status": "ok"}:
        problems.append(f"health respondió {health.status_code}: {health.text[:120]}")

    request_id = client.get(
        "/api/v1/health", headers={"X-Request-ID": "stress-check.1"}
    )
    if request_id.headers.get("x-request-id") != "stress-check.1":
        problems.append("X-Request-ID no se conserva")

    unknown = client.get("/api/v1/no-existe")
    if unknown.status_code != 404:
        problems.append(f"ruta desconocida respondió {unknown.status_code}")

    for label, response in (
        ("health", health),
        ("unknown", unknown),
    ):
        missing = [name for name in REQUIRED_HEADERS if name not in response.headers]
        if missing:
            problems.append(f"{label} sin cabeceras: {', '.join(missing)}")

    for locale in LOCALES:
        content = client.get(f"/api/v1/content/{locale}")
        if content.status_code != 200:
            problems.append(f"content/{locale} respondió {content.status_code}")
            continue
        try:
            body = content.json()
        except ValueError:
            problems.append(f"content/{locale} no es JSON")
            continue
        if body.get("locale") != locale:
            problems.append(f"content/{locale} devolvió locale={body.get('locale')}")
        if content.headers.get("content-language") != locale:
            problems.append(f"content/{locale} sin Content-Language")

    return problems


def _print_human(summary: Summary, problems: list[str], args: argparse.Namespace) -> None:
    report = summary.report()
    latency = report["latencyMs"]
    print(f"API: {args.base_url}")
    print(
        f"Peticiones: {report['total']} · concurrency {args.concurrency} · "
        f"fallos {len(report['failed'])}"
    )
    if latency:
        print(
            "Latencia (ms): "
            f"min {latency['min']} · p50 {latency['p50']} · "
            f"p95 {latency['p95']} · p99 {latency['p99']} · "
            f"max {latency['max']} · media {latency['mean']}"
        )
        if report["throughputRps"]:
            print(f"Ritmo aproximado: {report['throughputRps']} req/s")
    for failure in report["failed"][:10]:
        print(f"  FALLO {failure['status']} {failure['path']} ({failure['elapsedMs']} ms)")
    for problem in problems:
        print(f"  SOPORTE: {problem}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("STRESS_BASE_URL", "http://127.0.0.1:8000"),
        help="API ya arrancada (por defecto http://127.0.0.1:8000)",
    )
    parser.add_argument("--requests", type=int, default=200, help="peticiones de carga")
    parser.add_argument("--concurrency", type=int, default=20, help="peticiones en paralelo")
    parser.add_argument("--timeout", type=float, default=10.0, help="timeout por petición")
    parser.add_argument(
        "--max-p95",
        type=float,
        default=0.0,
        help="si es > 0 y el p95 lo supera, termina con error",
    )
    parser.add_argument("--json", action="store_true", help="salida JSON")
    args = parser.parse_args()

    if args.requests < 1 or args.concurrency < 1:
        parser.error("--requests y --concurrency deben ser positivos")

    args.base_url = _base_url(args.base_url)
    paths = [
        "/api/v1/health" if index % 4 else f"/api/v1/content/{LOCALES[index % 4]}"
        for index in range(args.requests)
    ]

    with httpx.Client(base_url=args.base_url, timeout=args.timeout) as client:
        try:
            problems = _preflight(client)
        except httpx.HTTPError as error:
            print(f"No se pudo hablar con {args.base_url}: {error}", file=sys.stderr)
            return 2

    summary = _run(args.base_url, paths, args.concurrency, args.timeout)
    report = summary.report()
    report["supportProblems"] = problems

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        _print_human(summary, problems, args)

    latency = report["latencyMs"]
    if report["failed"] or problems:
        return 1
    if args.max_p95 and latency and latency["p95"] > args.max_p95:
        if not args.json:
            print(f"p95 {latency['p95']} ms supera el límite {args.max_p95} ms")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
