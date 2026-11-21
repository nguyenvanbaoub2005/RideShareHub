package com.ridesharehub.admin.dto;

import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.enums.TripStatus;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * SP4-P1-01: Read-only trip directory row for Admin (AD-07).
 */
public record AdminTripResponse(
        Long id,
        Long companyId,
        String companyName,
        String routeName,
        String origin,
        String destination,
        String driverName,
        String driverPhone,
        String vehiclePlate,
        String vehicleType,
        Instant departureTime,
        int estimatedMinutes,
        BigDecimal fare,
        int bookedSeats,
        int seatCapacity,
        TripStatus status,
        String assignmentStatus,
        Instant createdAt) {

    public static AdminTripResponse from(Trip t) {
        return new AdminTripResponse(
                t.getId(),
                t.getCompany().getId(),
                t.getCompany().getName(),
                t.getRoute().getName(),
                t.getRoute().getOrigin(),
                t.getRoute().getDestination(),
                t.getDriver().getFullName(),
                t.getDriver().getPhone(),
                t.getVehicle().getPlateNumber(),
                t.getVehicle().getVehicleType(),
                t.getDepartureTime(),
                t.getRoute().getEstimatedMinutes(),
                t.getFare(),
                t.getBookedSeats(),
                t.getVehicle().getSeatCapacity(),
                t.getStatus(),
                t.getAssignmentStatus() != null ? t.getAssignmentStatus().name() : "ASSIGNED",
                t.getCreatedAt());
    }
}
