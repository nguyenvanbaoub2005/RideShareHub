package com.ridesharehub.booking.dto;

import jakarta.validation.constraints.Size;

/**
 * Optional reason payload for booking cancellation or no-show transition.
 */
public record CancelBookingRequest(
        @Size(max = 500, message = "Reason must be at most 500 characters")
        String reason) {
}

