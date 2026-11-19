package com.ridesharehub.trip.dto;

import java.math.BigDecimal;
import java.time.Instant;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.enums.TripStatus;

/** Read-only response view for Trip. */
public record TripResponse(
        Long id,
        Long routeId,
        String routeName,
        String origin,
        String destination,
        int estimatedMinutes,
        Long companyId,
        String companyName,
        Long vehicleId,
        String vehiclePlate,
        String vehicleType,
        int seatCapacity,
        int bookedSeats,
        Long driverId,
        String driverName,
        Instant departureTime,
        BigDecimal fare,
        String note,
        TripStatus status,
        String assignmentStatus,
        Instant createdAt) {

    public TripResponse(
            Long id,
            Long routeId,
            String routeName,
            String origin,
            String destination,
            int estimatedMinutes,
            Long companyId,
            String companyName,
            Long vehicleId,
            String vehiclePlate,
            String vehicleType,
            int seatCapacity,
            int bookedSeats,
            Long driverId,
            String driverName,
            Instant departureTime,
            BigDecimal fare,
            String note,
            TripStatus status,
            Instant createdAt) {
        this(id, routeId, routeName, origin, destination, estimatedMinutes,
                companyId, companyName, vehicleId, vehiclePlate, vehicleType,
                seatCapacity, bookedSeats, driverId, driverName, departureTime,
                fare, note, status, "ASSIGNED", createdAt);
    }

    public static TripResponse from(Trip t) {
        return new TripResponse(
                t.getId(),
                t.getRoute().getId(),
                t.getRoute().getName(),
                t.getRoute().getOrigin(),
                t.getRoute().getDestination(),
                t.getRoute().getEstimatedMinutes(),
                t.getCompany().getId(),
                t.getCompany().getName(),
                t.getVehicle().getId(),
                t.getVehicle().getPlateNumber(),
                t.getVehicle().getVehicleType(),
                t.getVehicle().getSeatCapacity(),
                t.getBookedSeats(),
                t.getDriver().getId(),
                t.getDriver().getFullName(),
                t.getDepartureTime(),
                t.getFare(),
                t.getNote(),
                t.getStatus(),
                t.getAssignmentStatus() != null ? t.getAssignmentStatus().name() : "ASSIGNED",
                t.getCreatedAt());
    }
}

