package com.ridesharehub.trip.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ridesharehub.trip.dto.TripSearchRequest;
import com.ridesharehub.trip.dto.TripSearchResult;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.repository.TripRepository;

/**
 * SP2-P1-01: Trip search/filter for passengers.
 * SP2-P1-02: V1 fare estimation — returns route baseFare adjusted by
 *            a seat-demand factor when the trip is nearly full.
 */
@Service
@Transactional(readOnly = true)
public class TripSearchService {

    /** Maximum results per search to avoid unbounded queries. */
    private static final int PAGE_SIZE = 50;

    /**
     * Fare surcharge tiers (SP2-P1-02 V1 policy):
     *  < 20 % remaining → +20 % surcharge
     *  < 50 % remaining → +10 % surcharge
     *  otherwise        → no surcharge
     */
    private static final BigDecimal SURCHARGE_HIGH   = new BigDecimal("0.20");
    private static final BigDecimal SURCHARGE_MEDIUM = new BigDecimal("0.10");
    private static final double     THRESHOLD_HIGH   = 0.20;
    private static final double     THRESHOLD_MEDIUM = 0.50;

    private final TripRepository tripRepository;

    public TripSearchService(TripRepository tripRepository) {
        this.tripRepository = tripRepository;
    }

    /**
     * Searches PUBLISHED trips matching the given criteria and
     * appends V1 estimated fare to each result.
     */
    public List<TripSearchResult> search(TripSearchRequest request) {
        Instant from = null;
        Instant to   = null;
        if (request.date() != null) {
            LocalDate date = request.date();
            from = date.atStartOfDay(ZoneOffset.UTC).toInstant();
            to   = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        }

        String origin      = blankToNull(request.origin());
        String destination = blankToNull(request.destination());
        int    minSeats    = request.effectiveMinSeats();

        List<Trip> trips = tripRepository.searchPublished(
                origin, destination, from, to,
                PageRequest.of(0, PAGE_SIZE));

        return trips.stream()
                .map(t -> toResult(t, minSeats))
                .filter(r -> r != null)
                .toList();
    }

    // ------------------------------------------------------------------ private

    /**
     * Maps a Trip to a TripSearchResult.
     * Returns null if available seats < minSeats (filtered out by caller).
     */
    private TripSearchResult toResult(Trip trip, int minSeats) {
        int capacity      = trip.getVehicle().getSeatCapacity();
        int bookedSeats   = trip.getBookedSeats();
        int availableSeats = capacity - bookedSeats;

        if (availableSeats < minSeats) {
            return null; // does not satisfy minimum-seat requirement
        }

        BigDecimal estimatedFare = estimateFare(trip.getFare(), capacity, bookedSeats);

        return new TripSearchResult(
                trip.getId(),
                trip.getRoute().getId(),
                trip.getRoute().getName(),
                trip.getRoute().getOrigin(),
                trip.getRoute().getDestination(),
                trip.getRoute().getEstimatedMinutes(),
                trip.getDepartureTime(),
                trip.getFare(),
                estimatedFare,
                availableSeats,
                trip.getVehicle().getVehicleType(),
                trip.getDriver().getFullName(),
                trip.getStatus()
        );
    }

    /**
     * SP2-P1-02 V1 fare estimation:
     * Applies a demand-based surcharge when available capacity is low.
     * Result is rounded to 2 decimal places (HALF_UP).
     */
    public BigDecimal estimateFare(BigDecimal baseFare, int capacity, int bookedSeats) {
        if (capacity <= 0) {
            return baseFare;
        }
        double remainingRatio = (double) (capacity - bookedSeats) / capacity;
        BigDecimal surcharge;
        if (remainingRatio < THRESHOLD_HIGH) {
            surcharge = SURCHARGE_HIGH;
        } else if (remainingRatio < THRESHOLD_MEDIUM) {
            surcharge = SURCHARGE_MEDIUM;
        } else {
            surcharge = BigDecimal.ZERO;
        }
        return baseFare.multiply(BigDecimal.ONE.add(surcharge))
                       .setScale(2, RoundingMode.HALF_UP);
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.strip();
    }
}

