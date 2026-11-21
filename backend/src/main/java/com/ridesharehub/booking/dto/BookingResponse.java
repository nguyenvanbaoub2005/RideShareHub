package com.ridesharehub.booking.dto;

import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.rating.entity.Rating;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * SP2-P2-01 & SP4-P1-01: Read-only response view for Booking.
 * Includes OpenAPI Booking fields, Trip context, and optional Rating summary.
 */
public record BookingResponse(
        Long id,
        String bookingCode,
        Long passengerId,
        String passengerName,
        String passengerEmail,
        String passengerPhone,
        Long tripId,
        String routeName,
        String origin,
        String destination,
        int estimatedMinutes,
        Instant departureTime,
        String companyName,
        String vehiclePlate,
        String vehicleType,
        String driverName,
        String driverPhone,
        int seatCount,
        LocationDto pickup,
        LocationDto dropoff,
        BigDecimal fareEstimate,
        BookingStatus status,
        String cancelReason,
        Instant confirmedAt,
        Instant cancelledAt,
        Instant createdAt,
        boolean rated,
        Integer ratingScore) {

    public static BookingResponse from(Booking b) {
        return from(b, null);
    }

    public static BookingResponse from(Booking b, Rating rating) {
        var t = b.getTrip();
        var r = t.getRoute();
        return new BookingResponse(
                b.getId(),
                b.getBookingCode(),
                b.getPassenger().getId(),
                b.getPassenger().getFullName(),
                b.getPassenger().getEmail(),
                b.getPassenger().getPhone(),
                t.getId(),
                r.getName(),
                r.getOrigin(),
                r.getDestination(),
                r.getEstimatedMinutes(),
                t.getDepartureTime(),
                t.getCompany().getName(),
                t.getVehicle().getPlateNumber(),
                t.getVehicle().getVehicleType(),
                t.getDriver().getFullName(),
                t.getDriver().getPhone(),
                b.getSeatCount(),
                new LocationDto(b.getPickupAddress(), b.getPickupLat(), b.getPickupLng()),
                new LocationDto(b.getDropoffAddress(), b.getDropoffLat(), b.getDropoffLng()),
                b.getEstimatedFare(),
                b.getStatus(),
                b.getCancelReason(),
                b.getConfirmedAt(),
                b.getCancelledAt(),
                b.getCreatedAt(),
                rating != null,
                rating != null ? rating.getScore() : null);
    }
}
