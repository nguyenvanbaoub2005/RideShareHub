package com.ridesharehub.trip.dto;

import java.util.List;

/**
 * SP3-P1-01: Request payload for POST /api/v1/trips/{tripId}/stops.
 * When orderedStopIds is null/empty, the endpoint materializes missing PICKUP/DROPOFF
 * stops for all active bookings on the trip.
 * When orderedStopIds is provided, it reorders active stops while enforcing the
 * hard PICKUP-before-DROPOFF invariant per booking.
 */
public record SyncTripStopsRequest(List<Long> orderedStopIds) {
}
