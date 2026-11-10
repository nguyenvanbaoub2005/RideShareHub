package com.ridesharehub.booking.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * SP2-P2-01: Request payload for creating a Booking on a Trip.
 */
public record CreateBookingRequest(
        @Min(value = 1, message = "seatCount must be at least 1")
        int seatCount,

        @NotNull(message = "pickup location is required")
        @Valid
        LocationDto pickup,

        @NotNull(message = "dropoff location is required")
        @Valid
        LocationDto dropoff) {
}

