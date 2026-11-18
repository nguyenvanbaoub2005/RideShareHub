package com.ridesharehub.booking.dto;

import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.enums.BookingStatus;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * SP2-P2-01: Read-only response view for Booking.
 * Includes OpenAPI Booking fields and Trip context for Passenger UI.
 */
public record BookingResponse(
        Long id,
        String bookingCode,
        Long passengerId,
        String passengerName,
        String passengerEmail,
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
        Instant createdAt) {

    public static BookingResponse from(Booking b) {
        var t = b.getTrip();
        var r = t.getRoute();
        return new BookingResponse(
                b.getId(),
                b.getBookingCode(),
                b.getPassenger().getId(),
                b.getPassenger().getFullName(),
                b.getPassenger().getEmail(),
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
                b.getCreatedAt());
    }
}
