package com.ridesharehub.trip.dto;

import jakarta.validation.constraints.Size;

public record ResolveIncidentRequest(
        @Size(max = 500, message = "Ghi chú xử lý tối đa 500 ký tự")
        String resolutionNote) {
}
