package com.ridesharehub.trip.dto;

import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.trip.entity.TripStop;
import com.ridesharehub.trip.enums.TripStopStatus;
import com.ridesharehub.trip.enums.TripStopType;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * SP3-P1-01 / SP3-P1-04 / SP3-P2-01: Stop view returned to Company, Driver, and Passenger screens.
 * For PASSENGER viewers, {@link #forPassenger(TripStop, Long)} masks sensitive details of other passengers.
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
        Instant completedAt,
        Instant plannedArrivalAt,
        Long proposalId,
        Boolean ownStop) {

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
                s.getCompletedAt(),
                s.getPlannedArrivalAt(),
                s.getProposalId(),
                null);
    }

    /**
     * SP3-P1-04: Passenger-scoped stop projection that masks other passengers' personal information
     * (name, phone, booking code) while keeping full details for the viewer's own stops.
     */
    public static TripStopResponse forPassenger(TripStop s, Long viewerUserId) {
        var b = s.getBooking();
        var p = b.getPassenger();
        boolean isOwn = viewerUserId != null && p.getId().equals(viewerUserId);
        return new TripStopResponse(
                s.getId(),
                s.getTrip().getId(),
                isOwn ? b.getId() : null,
                isOwn ? b.getBookingCode() : null,
                isOwn ? p.getFullName() : "Hành khách khác",
                isOwn ? p.getPhone() : null,
                b.getSeatCount(),
                b.getStatus(),
                s.getStopType(),
                s.getStopOrder(),
                isOwn ? s.getAddress() : maskAddressForOtherPassenger(s.getAddress()),
                s.getLatitude(),
                s.getLongitude(),
                s.getStatus(),
                s.getArrivedAt(),
                s.getCompletedAt(),
                s.getPlannedArrivalAt(),
                s.getProposalId(),
                isOwn);
    }

    private static String maskAddressForOtherPassenger(String address) {
        if (address == null || address.isBlank()) {
            return "Điểm dừng dọc tuyến";
        }
        String[] parts = address.split(",");
        if (parts.length >= 2) {
            return "Khu vực " + parts[parts.length - 2].trim() + ", " + parts[parts.length - 1].trim();
        }
        return "Điểm dừng dọc tuyến";
    }
}
