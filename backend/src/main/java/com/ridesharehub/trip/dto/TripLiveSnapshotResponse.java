package com.ridesharehub.trip.dto;

import com.ridesharehub.trip.enums.DriverAssignmentStatus;
import com.ridesharehub.trip.enums.TripStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * SP3-P2-02 & SP3-P2-04: Authoritative live tracking snapshot for a Trip.
 * Used both as REST response (GET /api/v1/trips/{tripId}/live-snapshot)
 * and as WebSocket event payload (/ws/trips/{tripId}).
 */
public record TripLiveSnapshotResponse(
        String eventType,
        Long tripId,
        String routeName,
        String origin,
        String destination,
        Instant departureTime,
        int estimatedMinutes,
        TripStatus tripStatus,
        DriverAssignmentStatus assignmentStatus,
        String companyName,
        String vehiclePlate,
        String vehicleType,
        String driverName,
        String driverPhone,
        BigDecimal currentLat,
        BigDecimal currentLng,
        BigDecimal heading,
        BigDecimal speedKmh,
        Instant locationUpdatedAt,
        boolean locationStale,
        TripStopResponse nextStop,
        Integer etaMinutesToNextStop,
        int completedStopsCount,
        int totalStopsCount,
        List<TripStopResponse> stops,
        List<String> recentEvents,
        Instant serverTimestamp) {
}
