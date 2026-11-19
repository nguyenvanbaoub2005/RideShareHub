package com.ridesharehub.trip.dto;

import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.trip.entity.TripStop;
import com.ridesharehub.trip.enums.TripStopStatus;
import com.ridesharehub.trip.enums.TripStopType;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * SP3-P2-01 / SP3-P2-03: Stop view returned to Driver and Passenger tracking screens.
 */
public record TripStopResponse(
        Long id,
        Long tripId,
        Long bookingId,
        String bookingCode,
        String passengerName,
        String passengerPhone,
        int seatCount,
        BookingStatus bookingStatus,
        TripStopType stopType,
        int stopOrder,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        TripStopStatus status,
        Instant arrivedAt,
        Instant completedAt) {

    public static TripStopResponse from(TripStop s) {
        var b = s.getBooking();
        var p = b.getPassenger();
        return new TripStopResponse(
                s.getId(),
                s.getTrip().getId(),
                b.getId(),
                b.getBookingCode(),
                p.getFullName(),
                p.getPhone(),
                b.getSeatCount(),
                b.getStatus(),
                s.getStopType(),
                s.getStopOrder(),
                s.getAddress(),
                s.getLatitude(),
                s.getLongitude(),
                s.getStatus(),
                s.getArrivedAt(),
                s.getCompletedAt());
    }
}
