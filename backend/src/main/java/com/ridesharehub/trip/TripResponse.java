package com.ridesharehub.trip;

import java.math.BigDecimal;
import java.time.Instant;

/** Read-only response view for Trip. */
public record TripResponse(
        Long id,
        Long routeId,
        String routeName,
        String origin,
        String destination,
        Long companyId,
        String companyName,
        Long vehicleId,
        String vehiclePlate,
        int seatCapacity,
        Long driverId,
        String driverName,
        Instant departureTime,
        BigDecimal fare,
        String note,
        TripStatus status,
        Instant createdAt) {

    public static TripResponse from(Trip t) {
        return new TripResponse(
                t.getId(),
                t.getRoute().getId(),
                t.getRoute().getName(),
                t.getRoute().getOrigin(),
                t.getRoute().getDestination(),
                t.getCompany().getId(),
                t.getCompany().getName(),
                t.getVehicle().getId(),
                t.getVehicle().getPlateNumber(),
                t.getVehicle().getSeatCapacity(),
                t.getDriver().getId(),
                t.getDriver().getFullName(),
                t.getDepartureTime(),
                t.getFare(),
                t.getNote(),
                t.getStatus(),
                t.getCreatedAt());
    }
}

