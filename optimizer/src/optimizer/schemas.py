from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LocationPoint(BaseModel):
    label: str = Field(..., min_length=1, max_length=500)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class BookingStopInput(BaseModel):
    booking_id: int = Field(..., gt=0)
    seat_count: int = Field(..., ge=1, le=60)
    pickup: LocationPoint
    dropoff: LocationPoint


class OptimizeTripRouteRequest(BaseModel):
    trip_id: int = Field(..., gt=0)
    vehicle_capacity: int = Field(..., ge=1, le=60)
    start_point: LocationPoint | None = None
    end_point: LocationPoint | None = None
    average_speed_kmh: float = Field(default=40.0, gt=5.0, le=120.0)
    time_limit_seconds: float = Field(default=5.0, ge=0.2, le=30.0)
    bookings: list[BookingStopInput] = Field(default_factory=list)


class OptimizedStopOutput(BaseModel):
    stop_order: int
    booking_id: int
    stop_type: Literal["PICKUP", "DROPOFF"]
    label: str
    latitude: float
    longitude: float
    seat_delta: int
    cumulative_seats_on_board: int
    distance_from_prev_km: float
    cumulative_distance_km: float
    eta_offset_minutes: int


class OptimizeTripRouteResponse(BaseModel):
    trip_id: int
    solver_engine: str
    solver_status: str
    total_distance_km: float
    baseline_distance_km: float
    distance_saved_km: float
    total_duration_minutes: int
    max_seats_on_board: int
    vehicle_capacity: int
    ordered_stops: list[OptimizedStopOutput]
