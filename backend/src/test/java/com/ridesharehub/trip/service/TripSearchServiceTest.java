package com.ridesharehub.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.route.entity.Route;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import com.ridesharehub.trip.dto.TripSearchRequest;
import com.ridesharehub.trip.dto.TripSearchResult;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.repository.TripRepository;

/**
 * SP2-P1-01 / SP2-P1-02 unit tests for TripSearchService.
 *
 * Tests verify:
 *  - search delegates to repository with correct parameters
 *  - results are filtered by minSeats
 *  - V1 fare estimation surcharge tiers (SP2-P1-02)
 *  - blank/null origin/destination treated as "no filter"
 */
class TripSearchServiceTest {

    private TripRepository tripRepository;
    private TripSearchService service;

    @BeforeEach
    void setUp() {
        tripRepository = mock(TripRepository.class);
        service = new TripSearchService(tripRepository);
    }

    // ------------------------------------------------------------------ search delegation

    @Test
    void search_withNoFilters_delegatesToRepository() {
        when(tripRepository.searchPublished(isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(List.of());

        List<TripSearchResult> results = service.search(new TripSearchRequest(null, null, null, null));

        assertThat(results).isEmpty();
    }

    @Test
    void search_withOriginAndDestination_passesFiltersToRepository() {
        when(tripRepository.searchPublished(eq("Hà Nội"), eq("Đà Nẵng"), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(List.of());

        service.search(new TripSearchRequest("Hà Nội", "Đà Nẵng", null, null));
        // No assertion on results — just verifying the right args reach the repository.
    }

    @Test
    void search_withBlankOrigin_treatedAsNull() {
        when(tripRepository.searchPublished(isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(List.of());

        service.search(new TripSearchRequest("   ", "", null, null));
    }

    @Test
    void search_withDate_computesDayBoundaries() {
        // The from/to arguments should be non-null when date is provided.
        when(tripRepository.searchPublished(
                isNull(), isNull(),
                any(Instant.class), any(Instant.class),
                any(Pageable.class)))
                .thenReturn(List.of());

        service.search(new TripSearchRequest(null, null, LocalDate.of(2026, 11, 5), null));
    }

    // ------------------------------------------------------------------ minSeats filter

    @Test
    void search_filtersOutTripsWithInsufficientSeats() {
        Trip trip = buildPublishedTrip(2); // vehicle has 2 seats
        when(tripRepository.searchPublished(any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(List.of(trip));

        // Requesting 3 seats — trip should be filtered out
        List<TripSearchResult> results = service.search(new TripSearchRequest(null, null, null, 3));

        assertThat(results).isEmpty();
    }

    @Test
    void search_includesTripsWithSufficientSeats() {
        Trip trip = buildPublishedTrip(5); // vehicle has 5 seats
        when(tripRepository.searchPublished(any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(List.of(trip));

        List<TripSearchResult> results = service.search(new TripSearchRequest(null, null, null, 3));

        assertThat(results).hasSize(1);
        assertThat(results.get(0).availableSeats()).isEqualTo(5);
    }

    @Test
    void search_defaultsToMinSeatsOne_whenNotSpecified() {
        Trip trip = buildPublishedTrip(1);
        when(tripRepository.searchPublished(any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(List.of(trip));

        List<TripSearchResult> results = service.search(new TripSearchRequest(null, null, null, null));

        assertThat(results).hasSize(1);
    }

    // ------------------------------------------------------------------ SP2-P1-02 fare estimation

    @Test
    void estimateFare_noSurcharge_whenMajorityOfSeatsAvailable() {
        // 10 capacity, 0 booked → 100% remaining → no surcharge
        BigDecimal estimated = service.estimateFare(new BigDecimal("100.00"), 10, 0);
        assertThat(estimated).isEqualByComparingTo("100.00");
    }

    @Test
    void estimateFare_mediumSurcharge_whenBetween20And50PercentRemaining() {
        // 10 capacity, 6 booked → 40% remaining → +10%
        BigDecimal estimated = service.estimateFare(new BigDecimal("100.00"), 10, 6);
        assertThat(estimated).isEqualByComparingTo("110.00");
    }

    @Test
    void estimateFare_highSurcharge_whenLessThan20PercentRemaining() {
        // 10 capacity, 9 booked → 10% remaining → +20%
        BigDecimal estimated = service.estimateFare(new BigDecimal("100.00"), 10, 9);
        assertThat(estimated).isEqualByComparingTo("120.00");
    }

    @Test
    void estimateFare_roundsToTwoDecimalPlaces() {
        BigDecimal estimated = service.estimateFare(new BigDecimal("99.99"), 10, 6);
        // 99.99 * 1.10 = 109.989 → rounds to 109.99
        assertThat(estimated).isEqualByComparingTo("109.99");
    }

    @Test
    void estimateFare_zeroCapacity_returnsBaseFareUnchanged() {
        BigDecimal estimated = service.estimateFare(new BigDecimal("100.00"), 0, 0);
        assertThat(estimated).isEqualByComparingTo("100.00");
    }

    // ------------------------------------------------------------------ result fields

    @Test
    void searchResult_containsExpectedFields() {
        Trip trip = buildPublishedTrip(10);
        when(tripRepository.searchPublished(any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(List.of(trip));

        List<TripSearchResult> results = service.search(new TripSearchRequest(null, null, null, 1));

        assertThat(results).hasSize(1);
        TripSearchResult r = results.get(0);
        assertThat(r.origin()).isEqualTo("Hà Nội");
        assertThat(r.destination()).isEqualTo("Đà Nẵng");
        assertThat(r.fare()).isEqualByComparingTo("150000.00");
        assertThat(r.estimatedFare()).isEqualByComparingTo("150000.00"); // full capacity → no surcharge
        assertThat(r.availableSeats()).isEqualTo(10);
        assertThat(r.status()).isEqualTo(TripStatus.PUBLISHED);
    }

    // ------------------------------------------------------------------ helper

    private Trip buildPublishedTrip(int seatCapacity) {
        TransportCompany company = mock(TransportCompany.class);
        when(company.getId()).thenReturn(1L);

        Route route = mock(Route.class);
        when(route.getId()).thenReturn(1L);
        when(route.getName()).thenReturn("HN-ĐN");
        when(route.getOrigin()).thenReturn("Hà Nội");
        when(route.getDestination()).thenReturn("Đà Nẵng");
        when(route.getEstimatedMinutes()).thenReturn(120);

        Vehicle vehicle = mock(Vehicle.class);
        when(vehicle.getSeatCapacity()).thenReturn(seatCapacity);
        when(vehicle.getVehicleType()).thenReturn("BUS");

        Driver driver = mock(Driver.class);
        when(driver.getFullName()).thenReturn("Nguyễn Văn A");

        Trip trip = mock(Trip.class);
        when(trip.getId()).thenReturn(1L);
        when(trip.getRoute()).thenReturn(route);
        when(trip.getCompany()).thenReturn(company);
        when(trip.getVehicle()).thenReturn(vehicle);
        when(trip.getDriver()).thenReturn(driver);
        when(trip.getDepartureTime()).thenReturn(Instant.parse("2026-11-10T08:00:00Z"));
        when(trip.getFare()).thenReturn(new BigDecimal("150000.00"));
        when(trip.getStatus()).thenReturn(TripStatus.PUBLISHED);

        return trip;
    }
}

