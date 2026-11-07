package com.ridesharehub.trip.dto;

import java.time.LocalDate;

/**
 * SP2-P1-01: Passenger trip search parameters.
 * All fields are optional — omitting them broadens the search.
 */
public record TripSearchRequest(
        String origin,
        String destination,
        LocalDate date,
        Integer minSeats
) {
    /** Defaults: at least 1 seat if caller omits the field. */
    public int effectiveMinSeats() {
        return (minSeats != null && minSeats > 0) ? minSeats : 1;
    }
}

