from __future__ import annotations

from datetime import datetime

from fastapi.testclient import TestClient


def test_content_has_cache_and_language_headers(client: TestClient) -> None:
    response = client.get("/api/v1/content/es")
    assert response.status_code == 200
    assert response.headers["Content-Language"] == "es"
    assert "max-age=60" in response.headers["Cache-Control"]
    assert response.headers["Content-Type"].startswith("application/json")


def test_content_updated_at_is_iso_utc(client: TestClient) -> None:
    payload = client.get("/api/v1/content/en").json()
    parsed = datetime.fromisoformat(payload["updatedAt"])
    assert parsed.tzinfo is not None


def test_content_is_the_same_when_requested_twice(client: TestClient) -> None:
    first = client.get("/api/v1/content/fr").json()
    second = client.get("/api/v1/content/fr").json()
    assert first == second


def test_content_prices_are_positive_and_names_are_not_html(client: TestClient) -> None:
    for locale in ("es", "en", "fr", "ru"):
        payload = client.get(f"/api/v1/content/{locale}").json()
        for section in payload["menu"]["sections"]:
            for group in section["groups"]:
                for dish in group["items"]:
                    assert dish["name"].strip()
                    assert isinstance(dish["price"], (int, float))
                    assert dish["price"] > 0
                    assert "<" not in dish["name"]
                    assert ">" not in dish["name"]


def test_signature_and_reviews_have_content(client: TestClient) -> None:
    payload = client.get("/api/v1/content/es").json()
    assert payload["signature"]
    assert len(payload["reviews"]) == 6
    assert all(review.get("sample") for review in payload["reviews"])
