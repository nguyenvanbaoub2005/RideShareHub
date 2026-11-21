package com.ridesharehub.trip.dto;

import com.ridesharehub.trip.entity.RouteProposalStop;
import com.ridesharehub.trip.enums.TripStopType;
import java.math.BigDecimal;
import java.time.Instant;

public record RouteProposalStopResponse(
        Long id,
        Long bookingId,
        String bookingCode,
        String passengerName,
        int seatCount,
        TripStopType stopType,
        int stopOrder,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        int seatDelta,
        int cumulativeSeatsOnBoard,
        BigDecimal distanceFromPrevKm,
        int etaOffsetMinutes,
        Instant plannedArrivalAt) {

    public static RouteProposalStopResponse from(RouteProposalStop s) {
        var b = s.getBooking();
        var p = b.getPassenger();
        return new RouteProposalStopResponse(
                s.getId(),
                b.getId(),
                b.getBookingCode(),
                p.getFullName(),
                b.getSeatCount(),
                s.getStopType(),
                s.getStopOrder(),
                s.getAddress(),
                s.getLatitude(),
                s.getLongitude(),
                s.getSeatDelta(),
                s.getCumulativeSeatsOnBoard(),
                s.getDistanceFromPrevKm(),
                s.getEtaOffsetMinutes(),
                s.getPlannedArrivalAt());
    }
}
