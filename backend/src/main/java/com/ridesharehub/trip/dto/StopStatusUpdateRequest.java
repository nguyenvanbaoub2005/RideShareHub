package com.ridesharehub.trip.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * SP3-P2-01: Driver command to update a TripStop status.
 * Supported values for {@code action} (or {@code status}):
 * ARRIVED, PICKED_UP, DROPPED_OFF, COMPLETED.
 */
public record StopStatusUpdateRequest(
        String action,
        String status) {

    @NotBlank(message = "action or status is required")
    public String effectiveAction() {
        if (action != null && !action.isBlank()) {
            return action.strip().toUpperCase();
        }
        if (status != null && !status.isBlank()) {
            return status.strip().toUpperCase();
        }
        return "";
    }
}
