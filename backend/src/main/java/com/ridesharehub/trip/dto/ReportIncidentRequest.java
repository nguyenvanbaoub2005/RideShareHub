package com.ridesharehub.trip.dto;

import com.ridesharehub.trip.enums.TripIncidentType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ReportIncidentRequest(
        @NotNull(message = "Loại sự cố là bắt buộc")
        TripIncidentType incidentType,

        @NotBlank(message = "Mô tả sự cố là bắt buộc")
        @Size(min = 10, max = 500, message = "Mô tả sự cố phải từ 10 đến 500 ký tự")
        String description,

        @DecimalMin(value = "-90.0", message = "latitude phải >= -90")
        @DecimalMax(value = "90.0", message = "latitude phải <= 90")
        BigDecimal latitude,

        @DecimalMin(value = "-180.0", message = "longitude phải >= -180")
        @DecimalMax(value = "180.0", message = "longitude phải <= 180")
        BigDecimal longitude) {
}
