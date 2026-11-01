from __future__ import annotations

from fastapi.testclient import TestClient


def test_content_in_every_language(client: TestClient) -> None:
    for locale in ("es", "en", "fr", "ru"):
        response = client.get(f"/api/v1/content/{locale}")
        assert response.status_code == 200
        payload = response.json()
        assert payload["locale"] == locale
        assert payload["menu"]["sections"]
        assert payload["reviews"]
        assert payload["signature"]
        assert payload["updatedAt"]


def test_content_shape(client: TestClient) -> None:
    payload = client.get("/api/v1/content/es").json()
    section = payload["menu"]["sections"][0]
    assert {"id", "title", "groups"} <= section.keys()

    group = section["groups"][0]
    assert {"id", "title", "items"} <= group.keys()

    dish = group["items"][0]
    assert {"name", "price"} <= dish.keys()
    assert isinstance(dish["price"], (int, float))


def _shape(payload: dict) -> list:
    return [
        (
            section["id"],
            tuple(
                (
                    group["id"],
                    tuple((item["name"], item["price"]) for item in group["items"]),
                )
                for group in section["groups"]
            ),
        )
        for section in payload["menu"]["sections"]
    ]


def test_menu_matches_across_locales(client: TestClient) -> None:
    payloads = {
        locale: client.get(f"/api/v1/content/{locale}").json()
        for locale in ("es", "en", "fr", "ru")
    }

    base = _shape(payloads["es"])
    for locale, payload in payloads.items():
        assert _shape(payload) == base, f"{locale} no coincide con la carta base"

    assert len(base) == 6
    assert sum(len(groups) for _, groups in base) == 19
    assert sum(
        len(items)
        for _, groups in base
        for _, items in groups
    ) == 92


def test_unknown_locale_is_404(client: TestClient) -> None:
    response = client.get("/api/v1/content/de")
    assert response.status_code == 404
    assert response.json()["code"] == "unknown_locale"


def test_security_headers(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Content-Security-Policy"]
