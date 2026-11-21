package com.ridesharehub.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.route.entity.Route;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.ReportIncidentRequest;
import com.ridesharehub.trip.dto.ResolveIncidentRequest;
import com.ridesharehub.trip.dto.TripIncidentResponse;
import com.ridesharehub.trip.dto.TripMonitoringSummaryResponse;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.entity.TripIncident;
import com.ridesharehub.trip.entity.TripStop;
import com.ridesharehub.trip.enums.TripIncidentStatus;
import com.ridesharehub.trip.enums.TripIncidentType;
import com.ridesharehub.trip.enums.TripStopType;
import com.ridesharehub.trip.repository.TripIncidentRepository;
import com.ridesharehub.trip.repository.TripRepository;
import com.ridesharehub.trip.repository.TripStopRepository;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class TripIncidentServiceTest {

    @Mock TripIncidentRepository tripIncidentRepository;
    @Mock TripRepository tripRepository;
    @Mock TripStopRepository tripStopRepository;
    @Mock DriverRepository driverRepository;
    @Mock CompanyRepository companyRepository;
    @Mock TripExecutionService tripExecutionService;

    private TripIncidentService service;

    private static final AuthPrincipal DRIVER_PRINCIPAL =
            new AuthPrincipal(201L, "driver@example.com", UserRole.DRIVER);
    private static final AuthPrincipal OTHER_DRIVER_PRINCIPAL =
            new AuthPrincipal(202L, "other.driver@example.com", UserRole.DRIVER);
    private static final AuthPrincipal COMPANY_PRINCIPAL =
            new AuthPrincipal(10L, "tc@example.com", UserRole.TRANSPORT_COMPANY);
    private static final AuthPrincipal OTHER_COMPANY_PRINCIPAL =
            new AuthPrincipal(19L, "other.tc@example.com", UserRole.TRANSPORT_COMPANY);
    private static final AuthPrincipal ADMIN_PRINCIPAL =
            new AuthPrincipal(99L, "admin@example.com", UserRole.ADMIN);

    private Trip trip;
    private Driver driver;
    private Driver otherDriver;
    private TransportCompany company;
    private List<TripIncident> incidentStore;
    private final AtomicLong idGen = new AtomicLong(800L);

    @BeforeEach
    void setUp() throws Exception {
        service = new TripIncidentService(
                tripIncidentRepository,
                tripRepository,
                tripStopRepository,
                driverRepository,
                companyRepository,
                tripExecutionService);

        User owner = new User("tc@example.com", "hash", "Chủ Nhà Xe", UserRole.TRANSPORT_COMPANY);
        setId(owner, 10L);
        company = new TransportCompany(owner, "Nhà Xe Hoàng Gia", "123 Lê Duẩn", "0900000000", "Rep", "Biz");
        setId(company, 1L);

        Vehicle vehicle = new Vehicle(company, "43A-777.77", "Limousine", "Ford", "Transit", 7);
        setId(vehicle, 100L);

        driver = new Driver(company, "Tài Xế A", "0911222333", "B2-123456");
        setId(driver, 200L);
        driver.assignUser(201L);

        otherDriver = new Driver(company, "Tài Xế B", "0911999888", "B2-999999");
        setId(otherDriver, 205L);
        otherDriver.assignUser(202L);

        Route route = new Route(company, "Đà Nẵng - Huế", "Đà Nẵng", "Huế", 120, new BigDecimal("150000"));
        setId(route, 50L);

        trip = new Trip(route, company, vehicle, driver, Instant.now().plus(1, ChronoUnit.HOURS),
                new BigDecimal("150000"), "Chuyến kiểm thử");
        setId(trip, 1001L);
        trip.publish();
        trip.acceptAssignment();
        trip.startTrip();
        trip.updateDriverLocation(new BigDecimal("16.120000"), new BigDecimal("108.150000"),
                BigDecimal.ZERO, new BigDecimal("42.5"));

        incidentStore = new ArrayList<>();

        lenient().when(driverRepository.findByUserId(201L)).thenReturn(Optional.of(driver));
        lenient().when(driverRepository.findByUserId(202L)).thenReturn(Optional.of(otherDriver));
        lenient().when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
        lenient().when(tripRepository.findById(1001L)).thenReturn(Optional.of(trip));
        lenient().when(tripRepository.findAllByCompanyIdWithDetailsOrderByDepartureTimeDesc(1L))
                .thenReturn(List.of(trip));
        lenient().when(tripRepository.findAllWithDetailsOrderByDepartureTimeDesc())
                .thenReturn(List.of(trip));
        lenient().when(tripStopRepository.findAllByTripIdWithBooking(1001L)).thenAnswer(inv -> {
            User p = new User("p@example.com", "hash", "Khách 1", UserRole.PASSENGER);
            setId(p, 301L);
            Booking b = new Booking("BK-10", trip, p, "0931111222", 2, "Đón DN",
                    new BigDecimal("16.06"), new BigDecimal("108.21"), "Trả Huế",
                    new BigDecimal("16.46"), new BigDecimal("107.59"), new BigDecimal("300000"), false);
            b.confirm();
            TripStop pickup = new TripStop(trip, b, TripStopType.PICKUP, 1, "Đón DN",
                    new BigDecimal("16.06"), new BigDecimal("108.21"));
            setId(pickup, 601L);
            pickup.markCompleted();
            TripStop dropoff = new TripStop(trip, b, TripStopType.DROPOFF, 2, "Trả Huế",
                    new BigDecimal("16.46"), new BigDecimal("107.59"));
            setId(dropoff, 602L);
            return List.of(pickup, dropoff);
        });

        lenient().when(tripIncidentRepository.save(any(TripIncident.class))).thenAnswer(inv -> {
            TripIncident inc = inv.getArgument(0);
            if (inc.getId() == null) {
                setId(inc, idGen.incrementAndGet());
            }
            incidentStore.removeIf(e -> e.getId().equals(inc.getId()));
            incidentStore.add(inc);
            return inc;
        });
        lenient().when(tripIncidentRepository.findAllByTripIdWithDetails(1001L))
                .thenAnswer(inv -> new ArrayList<>(incidentStore));
        lenient().when(tripIncidentRepository.findAllByCompanyIdWithDetails(1L, null))
                .thenAnswer(inv -> new ArrayList<>(incidentStore));
        lenient().when(tripIncidentRepository.findAllWithDetails(null))
                .thenAnswer(inv -> new ArrayList<>(incidentStore));
        lenient().when(tripIncidentRepository.findByIdAndTripIdWithDetails(any(Long.class), any(Long.class)))
                .thenAnswer(inv -> {
                    Long iid = inv.getArgument(0);
                    return incidentStore.stream().filter(i -> i.getId().equals(iid)).findFirst();
                });
    }

    @Test
    void reportAndResolveIncident_enforcesAuthorizationFallbackCoordsAndIdempotency() {
        ReportIncidentRequest req = new ReportIncidentRequest(
                TripIncidentType.HEAVY_TRAFFIC,
                "Đoạn đèo Hải Vân bị sạt lở nhẹ gây kẹt xe kéo dài hơn 20 phút",
                null,
                null);

        // Wrong driver gets 403
        assertThatThrownBy(() -> service.reportIncident(1001L, req, OTHER_DRIVER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        // Assigned driver succeeds and falls back to trip's latest GPS
        TripIncidentResponse created = service.reportIncident(1001L, req, DRIVER_PRINCIPAL);
        assertThat(created.incidentType()).isEqualTo(TripIncidentType.HEAVY_TRAFFIC);
        assertThat(created.status()).isEqualTo(TripIncidentStatus.OPEN);
        assertThat(created.latitude()).isEqualByComparingTo("16.120000");
        assertThat(created.longitude()).isEqualByComparingTo("108.150000");
        verify(tripExecutionService).broadcastIncidentReported(trip);

        // Unauthorized company cannot list incidents
        assertThatThrownBy(() -> service.listCompanyIncidents(1L, null, OTHER_COMPANY_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        // Company & Admin see monitoring summary with open incident count
        List<TripMonitoringSummaryResponse> summaries =
                service.listCompanyMonitoringTrips(1L, COMPANY_PRINCIPAL);
        assertThat(summaries).hasSize(1);
        TripMonitoringSummaryResponse sum = summaries.get(0);
        assertThat(sum.completedStopsCount()).isEqualTo(1);
        assertThat(sum.totalStopsCount()).isEqualTo(2);
        assertThat(sum.openIncidentsCount()).isEqualTo(1);
        assertThat(sum.locationStale()).isFalse();
        assertThat(sum.nextStopAddress()).isEqualTo("Trả Huế");

        // Admin resolves incident (and second resolve is idempotent)
        TripIncidentResponse resolved = service.resolveIncident(
                1001L, created.id(), new ResolveIncidentRequest("Đã điều hướng đường tránh"), ADMIN_PRINCIPAL);
        assertThat(resolved.status()).isEqualTo(TripIncidentStatus.RESOLVED);
        assertThat(resolved.resolutionNote()).isEqualTo("Đã điều hướng đường tránh");

        TripIncidentResponse resolvedAgain = service.resolveIncident(
                1001L, created.id(), new ResolveIncidentRequest("Ghi đè khác"), ADMIN_PRINCIPAL);
        assertThat(resolvedAgain.status()).isEqualTo(TripIncidentStatus.RESOLVED);
        assertThat(resolvedAgain.resolutionNote()).isEqualTo("Đã điều hướng đường tránh");
    }

    @Test
    void reportIncident_onCancelledTrip_throwsConflict() throws Exception {
        Trip cancelledTrip = new Trip(trip.getRoute(), company, trip.getVehicle(), driver,
                Instant.now().plus(5, ChronoUnit.HOURS), new BigDecimal("150000"), null);
        setId(cancelledTrip, 1002L);
        cancelledTrip.cancel();
        lenient().when(tripRepository.findById(1002L)).thenReturn(Optional.of(cancelledTrip));

        ReportIncidentRequest req = new ReportIncidentRequest(
                TripIncidentType.VEHICLE_ISSUE,
                "Xe gặp sự cố lốp trước khi khởi hành",
                null,
                null);

        assertThatThrownBy(() -> service.reportIncident(1002L, req, DRIVER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    private static void setId(Object entity, Object idValue) throws Exception {
        Field f = entity.getClass().getDeclaredField("id");
        f.setAccessible(true);
        f.set(entity, idValue);
    }
}
