package com.ridesharehub.rating.dto;

import com.ridesharehub.rating.entity.Rating;
import java.time.Instant;

public record RatingResponse(
        Long id,
        Long bookingId,
        String bookingCode,
        Long tripId,
        String routeName,
        Long companyId,
        String companyName,
        Long driverId,
        String driverName,
        Long passengerId,
        String passengerName,
        int score,
        int tripScore,
        int driverScore,
        int companyScore,
        String comment,
        Instant createdAt) {

    public static RatingResponse from(Rating r) {
        return new RatingResponse(
                r.getId(),
                r.getBooking().getId(),
                r.getBooking().getBookingCode(),
                r.getTrip().getId(),
                r.getTrip().getRoute().getName(),
                r.getCompany().getId(),
                r.getCompany().getName(),
                r.getDriver().getId(),
                r.getDriver().getFullName(),
                r.getPassenger().getId(),
                r.getPassenger().getFullName(),
                r.getScore(),
                r.getTripScore(),
                r.getDriverScore(),
                r.getCompanyScore(),
                r.getComment(),
                r.getCreatedAt());
    }
}
