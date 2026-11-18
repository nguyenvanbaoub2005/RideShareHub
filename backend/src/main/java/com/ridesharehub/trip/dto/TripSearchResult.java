package com.ridesharehub.trip.dto;

import java.math.BigDecimal;
import java.time.Instant;
import com.ridesharehub.trip.enums.TripStatus;

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
        int seatCapacity,
        String vehicleType,
        String vehiclePlate,
        String vehicleBrand,
        String vehicleModel,
        String driverName,
        Long companyId,
        String companyName,
        BigDecimal companyRating,
        int companyRatingCount,
        String note,
        TripStatus status
) {
    public TripSearchResult(
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
            int seatCapacity,
            String vehicleType,
            String vehiclePlate,
            String driverName,
            String companyName,
            TripStatus status) {
        this(tripId, routeId, routeName, origin, destination, estimatedMinutes,
                departureTime, fare, estimatedFare, availableSeats, seatCapacity,
                vehicleType, vehiclePlate, null, null, driverName, null, companyName,
                BigDecimal.ZERO, 0, null, status);
    }
}

