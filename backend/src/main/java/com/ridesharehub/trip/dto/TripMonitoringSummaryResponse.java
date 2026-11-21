package com.ridesharehub.trip.dto;

import com.ridesharehub.trip.enums.DriverAssignmentStatus;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.enums.TripStopType;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * SP4-P2-02: Operational monitoring summary per trip for Company & Admin dashboards.
 */
public record TripMonitoringSummaryResponse(
        Long tripId,
        String routeName,
        String origin,
        String destination,
        Long companyId,
        String companyName,
        String driverName,
        String driverPhone,
        String vehiclePlate,
        String vehicleType,
        Instant departureTime,
        int estimatedMinutes,
        TripStatus status,
        DriverAssignmentStatus assignmentStatus,
        int bookedSeats,
        int seatCapacity,
        BigDecimal currentLat,
        BigDecimal currentLng,
        BigDecimal speedKmh,
        Instant locationUpdatedAt,
        boolean locationStale,
        int completedStopsCount,
        int totalStopsCount,
        String nextStopAddress,
        TripStopType nextStopType,
        int openIncidentsCount,
        int totalIncidentsCount) {
}
