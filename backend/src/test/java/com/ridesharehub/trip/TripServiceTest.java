package com.ridesharehub.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ridesharehub.auth.User;
import com.ridesharehub.auth.UserRole;
import com.ridesharehub.company.CompanyRepository;
import com.ridesharehub.company.CompanyStatus;
import com.ridesharehub.company.TransportCompany;
import com.ridesharehub.company.Vehicle;
import com.ridesharehub.company.VehicleRepository;
import com.ridesharehub.driver.Driver;
import com.ridesharehub.driver.DriverRepository;
import com.ridesharehub.route.Route;
import com.ridesharehub.route.RouteRepository;
import com.ridesharehub.security.AuthPrincipal;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class TripServiceTest {

    @Mock TripRepository tripRepository;
    @Mock CompanyRepository companyRepository;
    @Mock RouteRepository routeRepository;
    @Mock VehicleRepository vehicleRepository;
    @Mock DriverRepository driverRepository;

    private TripService service;

    private static final AuthPrincipal TC_PRINCIPAL =
            new AuthPrincipal(10L, "tc@example.com", UserRole.TRANSPORT_COMPANY);
    private static final AuthPrincipal ADMIN_PRINCIPAL =
            new AuthPrincipal(99L, "admin@example.com", UserRole.ADMIN);
    private static final AuthPrincipal OTHER_PRINCIPAL =
            new AuthPrincipal(20L, "other@example.com", UserRole.TRANSPORT_COMPANY);

    private TransportCompany approvedCompany;
    private Vehicle vehicle;
    private Driver driver;
    private Route route;

    @BeforeEach
    void setUp() throws Exception {
        service = new TripService(tripRepository, companyRepository,
                routeRepository, vehicleRepository, driverRepository);

        // Build owner user
        User owner = new User("tc@example.com", "hash", "TC Owner", UserRole.TRANSPORT_COMPANY);
        setId(owner, 10L);

        // Build approved company
        approvedCompany = new TransportCompany(owner, "Company A", "Addr", "0900000000",
                "Rep A", "BizInfo A");
        setId(approvedCompany, 1L);
        // approve it
        User admin = new User("admin@example.com", "hash", "Admin", UserRole.ADMIN);
        approvedCompany.approve(admin);

        // Build vehicle
        vehicle = new Vehicle(approvedCompany, "51A-12345", "Xe khách", "Toyota", "Innova", 7);
        setId(vehicle, 100L);

        // Build driver
        driver = new Driver(approvedCompany, "Driver A", "0911111111", "DL12345");
        setId(driver, 200L);

        // Build route
        route = new Route(approvedCompany, "Đà Nẵng - Huế", "Đà Nẵng", "Huế", 120,
                BigDecimal.valueOf(150_000));
        setId(route, 300L);
    }

    // ================================================================== createTrip

    @Nested
    class CreateTrip {

        @Test
        void creates_trip_for_approved_company_owner() {
            Instant departure = Instant.now().plus(1, ChronoUnit.DAYS);
            TripRequest req = new TripRequest(300L, 100L, 200L, departure,
                    BigDecimal.valueOf(150_000), null);

            when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
            when(routeRepository.findById(300L)).thenReturn(Optional.of(route));
            when(vehicleRepository.findById(100L)).thenReturn(Optional.of(vehicle));
            when(driverRepository.findById(200L)).thenReturn(Optional.of(driver));
            when(tripRepository.existsVehicleConflict(any(), any(), any(), any())).thenReturn(false);
            when(tripRepository.existsDriverConflict(any(), any(), any(), any())).thenReturn(false);

            Trip saved = new Trip(route, approvedCompany, vehicle, driver, departure,
                    BigDecimal.valueOf(150_000));
            setId(saved, 999L);
            when(tripRepository.save(any(Trip.class))).thenReturn(saved);

            TripResponse resp = service.createTrip(1L, req, TC_PRINCIPAL);

            assertThat(resp.status()).isEqualTo(TripStatus.DRAFT);
            assertThat(resp.vehiclePlate()).isEqualTo("51A-12345");
            assertThat(resp.driverName()).isEqualTo("Driver A");
            verify(tripRepository).save(any(Trip.class));
        }

        @Test
        void rejects_unapproved_company() throws Exception {
            // Create pending company (not approved)
            User owner = new User("tc@example.com", "hash", "TC Owner", UserRole.TRANSPORT_COMPANY);
            setId(owner, 10L);
            TransportCompany pendingCompany = new TransportCompany(owner, "Pending Co", "Addr",
                    "0900000000", "Rep", "BizInfo");
            setId(pendingCompany, 1L);

            when(companyRepository.findById(1L)).thenReturn(Optional.of(pendingCompany));

            TripRequest req = new TripRequest(300L, 100L, 200L,
                    Instant.now().plus(1, ChronoUnit.DAYS), BigDecimal.valueOf(100_000), null);

            assertThatThrownBy(() -> service.createTrip(1L, req, TC_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode().value())
                            .isEqualTo(HttpStatus.FORBIDDEN.value()));
            verify(tripRepository, never()).save(any());
        }

        @Test
        void rejects_vehicle_conflict() {
            Instant departure = Instant.now().plus(1, ChronoUnit.DAYS);
            TripRequest req = new TripRequest(300L, 100L, 200L, departure,
                    BigDecimal.valueOf(150_000), null);

            when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
            when(routeRepository.findById(300L)).thenReturn(Optional.of(route));
            when(vehicleRepository.findById(100L)).thenReturn(Optional.of(vehicle));
            when(driverRepository.findById(200L)).thenReturn(Optional.of(driver));
            when(tripRepository.existsVehicleConflict(any(), any(), any(), any())).thenReturn(true);

            assertThatThrownBy(() -> service.createTrip(1L, req, TC_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode().value())
                            .isEqualTo(HttpStatus.CONFLICT.value()));
            verify(tripRepository, never()).save(any());
        }

        @Test
        void rejects_driver_conflict() {
            Instant departure = Instant.now().plus(1, ChronoUnit.DAYS);
            TripRequest req = new TripRequest(300L, 100L, 200L, departure,
                    BigDecimal.valueOf(150_000), null);

            when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
            when(routeRepository.findById(300L)).thenReturn(Optional.of(route));
            when(vehicleRepository.findById(100L)).thenReturn(Optional.of(vehicle));
            when(driverRepository.findById(200L)).thenReturn(Optional.of(driver));
            when(tripRepository.existsVehicleConflict(any(), any(), any(), any())).thenReturn(false);
            when(tripRepository.existsDriverConflict(any(), any(), any(), any())).thenReturn(true);

            assertThatThrownBy(() -> service.createTrip(1L, req, TC_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode().value())
                            .isEqualTo(HttpStatus.CONFLICT.value()));
            verify(tripRepository, never()).save(any());
        }
    }

    // ================================================================== publishTrip

    @Nested
    class PublishTrip {

        @Test
        void publishes_draft_trip() throws Exception {
            Instant departure = Instant.now().plus(1, ChronoUnit.DAYS);
            Trip trip = new Trip(route, approvedCompany, vehicle, driver, departure,
                    BigDecimal.valueOf(150_000));
            setId(trip, 999L);
            Trip publishedTrip = new Trip(route, approvedCompany, vehicle, driver, departure,
                    BigDecimal.valueOf(150_000));
            setId(publishedTrip, 999L);
            publishedTrip.publish();

            when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
            when(tripRepository.findById(999L)).thenReturn(Optional.of(trip));
            when(tripRepository.save(any(Trip.class))).thenReturn(publishedTrip);

            TripResponse resp = service.publishTrip(1L, 999L, TC_PRINCIPAL);

            assertThat(resp.status()).isEqualTo(TripStatus.PUBLISHED);
        }

        @Test
        void cannot_publish_already_published_trip() throws Exception {
            Instant departure = Instant.now().plus(1, ChronoUnit.DAYS);
            Trip trip = new Trip(route, approvedCompany, vehicle, driver, departure,
                    BigDecimal.valueOf(150_000));
            setId(trip, 999L);
            trip.publish(); // already published

            when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
            when(tripRepository.findById(999L)).thenReturn(Optional.of(trip));

            assertThatThrownBy(() -> service.publishTrip(1L, 999L, TC_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode().value())
                            .isEqualTo(HttpStatus.CONFLICT.value()));
        }
    }

    // ================================================================== listTrips

    @Test
    void list_trips_returns_all_company_trips() throws Exception {
        Instant departure = Instant.now().plus(1, ChronoUnit.DAYS);
        Trip t1 = new Trip(route, approvedCompany, vehicle, driver, departure,
                BigDecimal.valueOf(150_000));
        setId(t1, 1L);
        Trip t2 = new Trip(route, approvedCompany, vehicle, driver,
                departure.plus(1, ChronoUnit.DAYS), BigDecimal.valueOf(200_000));
        setId(t2, 2L);

        when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
        when(tripRepository.findAllByCompany_Id(1L)).thenReturn(List.of(t1, t2));

        List<TripResponse> resp = service.listTrips(1L, TC_PRINCIPAL);

        assertThat(resp).hasSize(2);
    }

    // ================================================================== helper

    /** Injects id into entities that have no public setter. */
    private static void setId(Object entity, Long id) {
        try {
            Field f = entity.getClass().getDeclaredField("id");
            f.setAccessible(true);
            f.set(entity, id);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            throw new RuntimeException("Cannot set id on " + entity.getClass(), e);
        }
    }
}

