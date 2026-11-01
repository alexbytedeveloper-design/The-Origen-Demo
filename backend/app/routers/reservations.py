"""Solicitudes de mesa."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..deps import optional_user
from ..models import Reservation, User
from ..rate_limit import limiter
from ..schemas import ReservationIn, ReservationOut

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.post("", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    payload: ReservationIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(optional_user),
) -> Reservation:
    host = request.client.host if request.client else "unknown"
    wait = limiter.hit(f"reserve:{host}", limit=10, window=3600)
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "detail": "Demasiadas solicitudes seguidas. Espera unos minutos.",
                "code": "too_many_requests",
            },
            headers={"Retry-After": str(wait)},
        )

    reservation = Reservation(
        user_id=user.id if user else None,
        booking_date=payload.date,
        booking_time=payload.time,
        party_size=payload.partySize,
        name=payload.name,
        email=payload.email.lower().strip(),
        phone=payload.phone.strip(),
        notes=payload.notes or "",
        status="pending",
    )
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    return reservation
