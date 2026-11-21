package com.ridesharehub.trip.dto;

import com.ridesharehub.trip.entity.TripIncident;
import com.ridesharehub.trip.enums.TripIncidentStatus;
import com.ridesharehub.trip.enums.TripIncidentType;
import java.math.BigDecimal;
import java.time.Instant;

public record TripIncidentResponse(
        Long id,
        Long tripId,
        String routeName,
        String origin,
        String destination,
        Long companyId,
        String companyName,
        String vehiclePlate,
        Long driverId,
        String driverName,
        String driverPhone,
        TripIncidentType incidentType,
        String incidentTypeLabel,
        String description,
        BigDecimal latitude,
        BigDecimal longitude,
        TripIncidentStatus status,
        String resolutionNote,
        Long resolvedByUserId,
        Instant resolvedAt,
        Instant createdAt) {

    public static TripIncidentResponse from(TripIncident i) {
        var t = i.getTrip();
        var r = t.getRoute();
        var c = t.getCompany();
        var v = t.getVehicle();
        var d = i.getDriver();
        return new TripIncidentResponse(
                i.getId(),
                t.getId(),
                r.getName(),
                r.getOrigin(),
                r.getDestination(),
                c.getId(),
                c.getName(),
                v.getPlateNumber(),
                d.getId(),
                d.getFullName(),
                d.getPhone(),
                i.getIncidentType(),
                i.getIncidentType().getLabelVi(),
                i.getDescription(),
                i.getLatitude(),
                i.getLongitude(),
                i.getStatus(),
                i.getResolutionNote(),
                i.getResolvedByUserId(),
                i.getResolvedAt(),
                i.getCreatedAt());
    }
}
