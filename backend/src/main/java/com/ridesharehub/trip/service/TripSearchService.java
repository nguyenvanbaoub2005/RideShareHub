package com.ridesharehub.trip.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ridesharehub.trip.dto.TripSearchRequest;
import com.ridesharehub.trip.dto.TripSearchResult;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.repository.TripRepository;

/**
 * SP2-P1-01: Trip search/filter for passengers.
 * SP2-P1-02: V1 fare estimation — returns the trip's configured per-seat fare
 *            (MVP V1 excludes surge pricing per project specification section 5.13 & 12.2).
 */
@Service
@Transactional(readOnly = true)
public class TripSearchService {

    /** Maximum results per search to avoid unbounded queries. */
    private static final int PAGE_SIZE = 50;

    private static final ZoneId SEARCH_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final TripRepository tripRepository;
    private final long bookCutoffMinutes;
    private final Clock clock;

    @Autowired
    public TripSearchService(
            TripRepository tripRepository,
            @Value("${booking.policy.book-cutoff-minutes:15}") long bookCutoffMinutes) {
        this(tripRepository, bookCutoffMinutes, Clock.systemUTC());
    }

    public TripSearchService(TripRepository tripRepository) {
        this(tripRepository, 15L, Clock.systemUTC());
    }

    public TripSearchService(TripRepository tripRepository, long bookCutoffMinutes, Clock clock) {
        this.tripRepository = tripRepository;
        this.bookCutoffMinutes = Math.max(0L, bookCutoffMinutes);
        this.clock = clock;
    }

    /**
     * Searches PUBLISHED trips matching the given criteria and
     * appends V1 estimated fare to each result.
     * Excludes trips that have already departed or are within the booking cutoff window.
     */
    public List<TripSearchResult> search(TripSearchRequest request) {
        Instant minBookableDeparture = clock.instant().plus(Duration.ofMinutes(bookCutoffMinutes));

        Instant from = minBookableDeparture;
        Instant to   = null;
        if (request.date() != null) {
            LocalDate date = request.date();
            Instant dayStart = date.atStartOfDay(SEARCH_ZONE).toInstant();
            Instant dayEnd   = date.plusDays(1).atStartOfDay(SEARCH_ZONE).toInstant();
            if (!dayEnd.isAfter(minBookableDeparture)) {
                return List.of();
            }
            from = dayStart.isBefore(minBookableDeparture) ? minBookableDeparture : dayStart;
            to   = dayEnd;
        }

        String origin      = blankToNull(request.origin());
        String destination = blankToNull(request.destination());
        int    minSeats    = request.effectiveMinSeats();

        List<Trip> trips = tripRepository.searchPublished(
                origin, destination, from, to,
                PageRequest.of(0, PAGE_SIZE));

        // Fallback: Vietnamese accent-insensitive matching (e.g., "da nang" -> "Đà Nẵng", "hue" -> "Huế")
        if (trips.isEmpty() && (origin != null || destination != null)) {
            String normOrigin = origin != null ? normalizeVietnamese(origin) : null;
            String normDest   = destination != null ? normalizeVietnamese(destination) : null;
            List<Trip> candidates = tripRepository.searchPublished(
                    null, null, from, to, PageRequest.of(0, PAGE_SIZE));
            trips = candidates.stream()
                    .filter(t -> normOrigin == null
                            || normalizeVietnamese(t.getRoute().getOrigin()).contains(normOrigin))
                    .filter(t -> normDest == null
                            || normalizeVietnamese(t.getRoute().getDestination()).contains(normDest))
                    .toList();
        }

        return trips.stream()
                .map(t -> toResult(t, minSeats, minBookableDeparture))
                .filter(r -> r != null)
                .toList();
    }

    // ------------------------------------------------------------------ private

    /**
     * Maps a Trip to a TripSearchResult.
     * Returns null if available seats < minSeats or trip has already passed booking cutoff.
     */
    private TripSearchResult toResult(Trip trip, int minSeats, Instant minBookableDeparture) {
        if (trip.getDepartureTime() == null || trip.getDepartureTime().isBefore(minBookableDeparture)) {
            return null;
        }
        if (trip.getCompany() != null
                && trip.getCompany().getStatus() != null
                && !trip.getCompany().isApproved()) {
            return null;
        }

        int capacity       = trip.getVehicle().getSeatCapacity();
        int bookedSeats    = trip.getBookedSeats();
        int availableSeats = capacity - bookedSeats;

        if (availableSeats < minSeats) {
            return null; // does not satisfy minimum-seat requirement
        }

        BigDecimal estimatedFare = estimateFare(trip.getFare(), capacity, bookedSeats);
        BigDecimal rating = trip.getCompany().getAvgRating() != null
                ? trip.getCompany().getAvgRating()
                : BigDecimal.ZERO;

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
                capacity,
                trip.getVehicle().getVehicleType(),
                trip.getVehicle().getPlateNumber(),
                trip.getVehicle().getBrand(),
                trip.getVehicle().getModel(),
                trip.getDriver().getFullName(),
                trip.getCompany().getId(),
                trip.getCompany().getName(),
                rating,
                trip.getCompany().getRatingCount(),
                trip.getNote(),
                trip.getStatus()
        );
    }

    /**
     * SP2-P1-02 V1 fare estimation:
     * MVP V1 uses the trip/route fixed price without demand-based surge pricing
     * (per project specification sections 5.13 and 12.2).
     * Result is rounded to 2 decimal places (HALF_UP).
     */
    public BigDecimal estimateFare(BigDecimal baseFare, int capacity, int bookedSeats) {
        if (baseFare == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return baseFare.setScale(2, RoundingMode.HALF_UP);
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.strip();
    }

    private static String normalizeVietnamese(String input) {
        if (input == null) return "";
        String decomposed = Normalizer.normalize(input.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        return decomposed
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('đ', 'd');
    }
}
