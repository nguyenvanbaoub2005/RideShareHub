package com.ridesharehub.trip;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * SP2-P1-01 / SP2-P1-02: Public trip view returned to Passenger on search.
 * Includes fare and available-seat count so the passenger can decide.
 */
public record TripSearchResult(
        Long tripId,
        Long routeId,
        String routeName,
        String origin,
        String destination,
        int estimatedMinutes,
        Instant departureTime,
        BigDecimal fare,
        BigDecimal estimatedFare,
        int availableSeats,
        String vehicleType,
        String driverName,
        TripStatus status
) {}

