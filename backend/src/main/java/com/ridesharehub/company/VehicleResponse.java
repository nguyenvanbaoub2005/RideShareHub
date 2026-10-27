package com.ridesharehub.company;

import java.time.Instant;

/** Read-only Vehicle response. */
public record VehicleResponse(
        Long id,
        Long companyId,
        String plateNumber,
        String vehicleType,
        String brand,
        String model,
        int seatCapacity,
        String description,
        String imageUrl,
        VehicleStatus status,
        Instant createdAt) {

    public static VehicleResponse from(Vehicle v) {
        return new VehicleResponse(
                v.getId(),
                v.getCompany().getId(),
                v.getPlateNumber(),
                v.getVehicleType(),
                v.getBrand(),
                v.getModel(),
                v.getSeatCapacity(),
                v.getDescription(),
                v.getImageUrl(),
                v.getStatus(),
                v.getCreatedAt());
    }
}
