package com.ridesharehub.booking.enums;

/**
 * SP2-P2-01: Lifecycle statuses for a Passenger Booking.
 */
public enum BookingStatus {
    PENDING,
    CONFIRMED,
    PICKED_UP,
    COMPLETED,
    CANCELLED,
    NO_SHOW;

    /**
     * Returns true if a booking in this status currently occupies seats on the Trip.
     */
    public boolean holdsSeats() {
        return this == PENDING || this == CONFIRMED || this == PICKED_UP;
    }
}

