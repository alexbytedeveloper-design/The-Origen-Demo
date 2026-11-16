"""Fecha local del restaurante.

El servidor puede estar en UTC y el restaurante en La Habana: a las 21:00 en
Miramar ya es el día siguiente en UTC. Validar las reservas con la fecha del
servidor rechazaría mesas de esa misma noche. ``RESTAURANT_TZ`` usa la base de
zonas del sistema cuando está disponible; si no, se aplica el desfase fijo de
``RESTAURANT_UTC_OFFSET`` (por defecto, hora estándar de Cuba).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .config import get_settings


def restaurant_zone() -> timezone | ZoneInfo:
    settings = get_settings()
    if settings.restaurant_tz:
        try:
            return ZoneInfo(settings.restaurant_tz)
        except (ZoneInfoNotFoundError, ValueError):
            pass
    return timezone(timedelta(hours=settings.restaurant_utc_offset))


def restaurant_date(moment: datetime | None = None) -> date:
    """Devuelve la fecha local del restaurante para un instante UTC."""
    current = moment or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return current.astimezone(restaurant_zone()).date()


def restaurant_today() -> date:
    return restaurant_date()
