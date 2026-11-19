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
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
 */
class TripSearchServiceTest {

    private static final Instant FIXED_NOW = Instant.parse("2026-11-10T06:00:00Z");
    private static final Instant EXPECTED_CUTOFF = Instant.parse("2026-11-10T06:15:00Z");

    private TripRepository tripRepository;
    private TripSearchService service;

    @BeforeEach
    void setUp() {
        tripRepository = mock(TripRepository.class);
        service = new TripSearchService(tripRepository, 15L, Clock.fixed(FIXED_NOW, ZoneOffset.UTC));
    }

    // ------------------------------------------------------------------ search delegation

    @Test
    void search_withNoFilters_passesBookCutoffThreshold() {
        when(tripRepository.searchPublished(isNull(), isNull(), eq(EXPECTED_CUTOFF), isNull(), any(Pageable.class)))
                .thenReturn(List.of());

        List<TripSearchResult> results = service.search(new TripSearchRequest(null, null, null, null));

        assertThat(results).isEmpty();
    }

    @Test
    void search_withOriginAndDestination_passesFiltersToRepository() {
        when(tripRepository.searchPublished(eq("Hà Nội"), eq("Đà Nẵng"), eq(EXPECTED_CUTOFF), isNull(), any(Pageable.class)))
                .thenReturn(List.of());
        when(tripRepository.searchPublished(isNull(), isNull(), eq(EXPECTED_CUTOFF), isNull(), any(Pageable.class)))
                .thenReturn(List.of());

        service.search(new TripSearchRequest("Hà Nội", "Đà Nẵng", null, null));
    }

    @Test
    void search_matchesVietnameseUnaccentedOriginAndDestination() {
        Trip trip = buildPublishedTrip(10); // origin="Hà Nội", destination="Đà Nẵng"
        when(tripRepository.searchPublished(eq("ha noi"), eq("da nang"), eq(EXPECTED_CUTOFF), isNull(), any(Pageable.class)))
                .thenReturn(List.of());
        when(tripRepository.searchPublished(isNull(), isNull(), eq(EXPECTED_CUTOFF), isNull(), any(Pageable.class)))
                .thenReturn(List.of(trip));

        List<TripSearchResult> results = service.search(new TripSearchRequest("ha noi", "da nang", null, 1));

        assertThat(results).hasSize(1);
        assertThat(results.get(0).origin()).isEqualTo("Hà Nội");
        assertThat(results.get(0).destination()).isEqualTo("Đà Nẵng");
    }

    @Test
    void search_withBlankOrigin_treatedAsNull() {
        when(tripRepository.searchPublished(isNull(), isNull(), eq(EXPECTED_CUTOFF), isNull(), any(Pageable.class)))
                .thenReturn(List.of());

        service.search(new TripSearchRequest("   ", "", null, null));
    }

    @Test
    void search_withFutureDate_computesDayBoundaries() {
        when(tripRepository.searchPublished(
                isNull(), isNull(),
                any(Instant.class), any(Instant.class),
                any(Pageable.class)))
                .thenReturn(List.of());

        service.search(new TripSearchRequest(null, null, LocalDate.of(2026, 11, 15), null));
    }

    @Test
    void search_excludesTripsAlreadyDepartedOrWithinBookCutoff() {
        Trip alreadyDeparted = buildPublishedTrip(10, Instant.parse("2026-11-10T05:45:00Z"));
        Trip withinCutoff = buildPublishedTrip(10, Instant.parse("2026-11-10T06:10:00Z"));
        Trip openFutureTrip = buildPublishedTrip(10, Instant.parse("2026-11-10T08:00:00Z"));
        when(tripRepository.searchPublished(any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(List.of(alreadyDeparted, withinCutoff, openFutureTrip));

        List<TripSearchResult> results = service.search(new TripSearchRequest(null, null, null, 1));

        assertThat(results).hasSize(1);
        assertThat(results.get(0).departureTime()).isEqualTo(Instant.parse("2026-11-10T08:00:00Z"));
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

    // ------------------------------------------------------------------ SP2-P1-02 fare estimation (MVP V1 fixed fare, no surge pricing)

    @Test
    void estimateFare_returnsBaseFare_whenMajorityOfSeatsAvailable() {
        BigDecimal estimated = service.estimateFare(new BigDecimal("100.00"), 10, 0);
        assertThat(estimated).isEqualByComparingTo("100.00");
    }

    @Test
    void estimateFare_returnsFixedBaseFare_whenBetween20And50PercentRemaining() {
        // MVP V1 excludes surge pricing per project spec section 5.13 & 12.2
        BigDecimal estimated = service.estimateFare(new BigDecimal("100.00"), 10, 6);
        assertThat(estimated).isEqualByComparingTo("100.00");
    }

    @Test
    void estimateFare_returnsFixedBaseFare_whenLessThan20PercentRemaining() {
        BigDecimal estimated = service.estimateFare(new BigDecimal("100.00"), 10, 9);
        assertThat(estimated).isEqualByComparingTo("100.00");
    }

    @Test
    void estimateFare_roundsToTwoDecimalPlaces() {
        BigDecimal estimated = service.estimateFare(new BigDecimal("99.989"), 10, 6);
        assertThat(estimated).isEqualByComparingTo("99.99");
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
        return buildPublishedTrip(seatCapacity, Instant.parse("2026-11-10T08:00:00Z"));
    }

    private Trip buildPublishedTrip(int seatCapacity, Instant departureTime) {
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
        when(trip.getDepartureTime()).thenReturn(departureTime);
        when(trip.getFare()).thenReturn(new BigDecimal("150000.00"));
        when(trip.getStatus()).thenReturn(TripStatus.PUBLISHED);

        return trip;
    }
}

