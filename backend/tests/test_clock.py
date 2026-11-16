from __future__ import annotations

from datetime import date, datetime, timezone

from app.clock import restaurant_date, restaurant_today


def test_late_evening_in_havana_is_still_the_same_day() -> None:
    # 01:00 UTC del 16 de noviembre = 20:00 del 15 en La Habana (UTC-5).
    moment = datetime(2026, 11, 16, 1, 0, tzinfo=timezone.utc)
    assert restaurant_date(moment) == date(2026, 11, 15)


def test_midday_utc_is_midday_in_havana() -> None:
    moment = datetime(2026, 11, 15, 17, 30, tzinfo=timezone.utc)
    assert restaurant_date(moment) == date(2026, 11, 15)


def test_naive_datetime_is_treated_as_utc() -> None:
    assert restaurant_date(datetime(2026, 11, 16, 3, 0)) == date(2026, 11, 15)


def test_today_is_a_date() -> None:
    assert isinstance(restaurant_today(), date)
