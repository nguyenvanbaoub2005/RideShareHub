package com.ridesharehub.booking.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Location input/output DTO matching OpenAPI LocationInput schema.
 */
public record LocationDto(
        @NotBlank(message = "Location label is required")
        @Size(max = 500, message = "Location label must be at most 500 characters")
        String label,

        @DecimalMin(value = "-90.0", message = "Latitude must be >= -90")
        @DecimalMax(value = "90.0", message = "Latitude must be <= 90")
        BigDecimal latitude,

        @DecimalMin(value = "-180.0", message = "Longitude must be >= -180")
        @DecimalMax(value = "180.0", message = "Longitude must be <= 180")
        BigDecimal longitude) {

    public LocationDto(String label) {
        this(label, null, null);
    }
}

