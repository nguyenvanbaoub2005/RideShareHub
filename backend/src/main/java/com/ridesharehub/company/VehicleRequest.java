package com.ridesharehub.company;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** POST /api/v1/companies/{companyId}/vehicles */
public record VehicleRequest(
        @NotBlank @Size(max = 20)  String plateNumber,
        @NotBlank @Size(max = 50)  String vehicleType,
        @Size(max = 50)            String brand,
        @Size(max = 50)            String model,
        @NotNull @Min(1)           Integer seatCapacity,
        @Size(max = 2000)          String description,
        @Size(max = 500)           String imageUrl) { }
