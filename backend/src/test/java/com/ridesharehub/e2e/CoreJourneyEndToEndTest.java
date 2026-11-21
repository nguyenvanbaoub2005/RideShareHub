package com.ridesharehub.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ridesharehub.auth.dto.AuthResponse;
import com.ridesharehub.auth.dto.RegisterRequest;
import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.auth.repository.UserRepository;
import com.ridesharehub.auth.service.AuthenticationService;
import com.ridesharehub.booking.dto.BookingResponse;
import com.ridesharehub.booking.dto.CreateBookingRequest;
import com.ridesharehub.booking.dto.LocationDto;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.company.dto.CompanyDecisionRequest;
import com.ridesharehub.company.dto.CompanyRegistrationRequest;
import com.ridesharehub.company.dto.CompanyResponse;
import com.ridesharehub.company.dto.VehicleRequest;
import com.ridesharehub.company.dto.VehicleResponse;
import com.ridesharehub.company.enums.CompanyStatus;
import com.ridesharehub.company.enums.DecisionType;
import com.ridesharehub.company.enums.VehicleStatus;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.driver.dto.DriverRequest;
import com.ridesharehub.driver.dto.DriverResponse;
import com.ridesharehub.driver.enums.DriverStatus;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.route.dto.RouteRequest;
import com.ridesharehub.route.dto.RouteResponse;
import com.ridesharehub.route.service.RouteService;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.security.JwtService;
import com.ridesharehub.trip.dto.DriverLocationUpdateRequest;
import com.ridesharehub.trip.dto.ReportIncidentRequest;
import com.ridesharehub.trip.dto.ResolveIncidentRequest;
import com.ridesharehub.trip.dto.RouteProposalResponse;
import com.ridesharehub.trip.dto.StopStatusUpdateRequest;
import com.ridesharehub.trip.dto.TripIncidentResponse;
import com.ridesharehub.trip.dto.TripLiveSnapshotResponse;
import com.ridesharehub.trip.dto.TripMonitoringSummaryResponse;
import com.ridesharehub.trip.dto.TripRequest;
import com.ridesharehub.trip.dto.TripResponse;
import com.ridesharehub.trip.dto.TripSearchRequest;
import com.ridesharehub.trip.dto.TripSearchResult;
import com.ridesharehub.trip.dto.TripStopResponse;
import com.ridesharehub.trip.enums.DriverAssignmentStatus;
import com.ridesharehub.trip.enums.RouteProposalStatus;
import com.ridesharehub.trip.enums.TripIncidentStatus;
import com.ridesharehub.trip.enums.TripIncidentType;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.enums.TripStopStatus;
import com.ridesharehub.trip.enums.TripStopType;
import com.ridesharehub.trip.repository.RouteProposalRepository;
import com.ridesharehub.trip.repository.TripIncidentRepository;
import com.ridesharehub.trip.repository.TripRepository;
import com.ridesharehub.trip.repository.TripStopRepository;
import com.ridesharehub.trip.service.RouteOptimizationService;
import com.ridesharehub.trip.service.TripExecutionService;
import com.ridesharehub.trip.service.TripIncidentService;
import com.ridesharehub.trip.service.TripSearchService;
import com.ridesharehub.trip.service.TripService;
import com.ridesharehub.company.service.CompanyService;
import com.ridesharehub.driver.service.DriverService;
import com.ridesharehub.booking.service.BookingService;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.repository.VehicleRepository;
import com.ridesharehub.route.repository.RouteRepository;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * SP4-P2-03: Full-Stack Core Journey End-to-End Integration Test across Spring Boot services,
 * real H2 PostgreSQL-compatible JPA persistence, HTTP VRPPD Optimizer integration,
 * TripStops, Driver Execution lifecycle, Live Tracking & Privacy Masking, and Trip Incidents.
 */
@SpringBootTest
@TestPropertySource(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:core_journey_e2e_test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;LOCK_TIMEOUT=10000;INIT=RUNSCRIPT FROM 'classpath:h2-domains.sql'",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "spring.flyway.enabled=false",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "jwt.signer-key=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "booking.policy.auto-confirm=true"
        })
class CoreJourneyEndToEndTest {

    private static HttpServer optimizerServer;
    private static int optimizerPort;
    private static final ObjectMapper JSON = new ObjectMapper();

    @BeforeAll
    static void startOptimizerStub() throws IOException {
        optimizerServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        optimizerPort = optimizerServer.getAddress().getPort();
        optimizerServer.createContext("/optimize/trip-route", exchange -> {
            byte[] reqBytes = exchange.getRequestBody().readAllBytes();
            JsonNode reqJson = JSON.readTree(new String(reqBytes, StandardCharsets.UTF_8));
            long tripId = reqJson.path("trip_id").asLong();
            int cap = reqJson.path("vehicle_capacity").asInt(7);
            JsonNode bookings = reqJson.path("bookings");

            StringBuilder stopsJson = new StringBuilder("[");
            int order = 1;
            int seatsOnBoard = 0;
            int maxSeats = 0;
            // All pickups in reverse input order to prove optimization changed ordering, then dropoffs
            for (int i = bookings.size() - 1; i >= 0; i--) {
                JsonNode b = bookings.get(i);
                int sc = b.path("seat_count").asInt(1);
                seatsOnBoard += sc;
                maxSeats = Math.max(maxSeats, seatsOnBoard);
                JsonNode p = b.path("pickup");
                if (order > 1) stopsJson.append(",");
                stopsJson.append(String.format(
                        "{\"stop_order\":%d,\"booking_id\":%d,\"stop_type\":\"PICKUP\","
                                + "\"label\":%s,\"latitude\":%s,\"longitude\":%s,"
                                + "\"seat_delta\":%d,\"cumulative_seats_on_board\":%d,"
                                + "\"distance_from_prev_km\":2.5,\"cumulative_distance_km\":%.1f,"
                                + "\"eta_offset_minutes\":%d}",
                        order,
                        b.path("booking_id").asLong(),
                        JSON.writeValueAsString(p.path("label").asText("Điểm đón")),
                        p.path("latitude").asDouble(16.06),
                        p.path("longitude").asDouble(108.21),
                        sc,
                        seatsOnBoard,
                        order * 2.5,
                        order * 8));
                order++;
            }
            for (int i = bookings.size() - 1; i >= 0; i--) {
                JsonNode b = bookings.get(i);
                int sc = b.path("seat_count").asInt(1);
                seatsOnBoard -= sc;
                JsonNode d = b.path("dropoff");
                stopsJson.append(",");
                stopsJson.append(String.format(
                        "{\"stop_order\":%d,\"booking_id\":%d,\"stop_type\":\"DROPOFF\","
                                + "\"label\":%s,\"latitude\":%s,\"longitude\":%s,"
                                + "\"seat_delta\":%d,\"cumulative_seats_on_board\":%d,"
                                + "\"distance_from_prev_km\":18.0,\"cumulative_distance_km\":%.1f,"
                                + "\"eta_offset_minutes\":%d}",
                        order,
                        b.path("booking_id").asLong(),
                        JSON.writeValueAsString(d.path("label").asText("Điểm trả")),
                        d.path("latitude").asDouble(16.46),
                        d.path("longitude").asDouble(107.59),
                        -sc,
                        Math.max(0, seatsOnBoard),
                        20.0 + order * 12.0,
                        order * 25));
                order++;
            }
            stopsJson.append("]");

            String body = String.format(
                    "{\"trip_id\":%d,\"solver_engine\":\"OR-TOOLS-VRPPD\",\"solver_status\":\"OPTIMAL\","
                            + "\"total_distance_km\":96.50,\"baseline_distance_km\":115.00,"
                            + "\"distance_saved_km\":18.50,\"total_duration_minutes\":125,"
                            + "\"max_seats_on_board\":%d,\"vehicle_capacity\":%d,\"ordered_stops\":%s}",
                    tripId, maxSeats, cap, stopsJson);

            byte[] out = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, out.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(out);
            }
        });
        optimizerServer.start();
    }

    @AfterAll
    static void stopOptimizerStub() {
        if (optimizerServer != null) {
            optimizerServer.stop(0);
        }
    }

    @DynamicPropertySource
    static void overrideProps(DynamicPropertyRegistry registry) {
        registry.add("optimizer.base-url", () -> "http://127.0.0.1:" + optimizerPort);
    }

    @Autowired private AuthenticationService authService;
    @Autowired private CompanyService companyService;
    @Autowired private DriverService driverService;
    @Autowired private RouteService routeService;
    @Autowired private TripService tripService;
    @Autowired private TripSearchService tripSearchService;
    @Autowired private BookingService bookingService;
    @Autowired private RouteOptimizationService routeOptimizationService;
    @Autowired private TripExecutionService tripExecutionService;
    @Autowired private TripIncidentService tripIncidentService;

    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private DriverRepository driverRepository;
    @Autowired private RouteRepository routeRepository;
    @Autowired private TripRepository tripRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private TripStopRepository tripStopRepository;
    @Autowired private RouteProposalRepository routeProposalRepository;
    @Autowired private TripIncidentRepository tripIncidentRepository;

    @BeforeEach
    void cleanDb() {
        tripIncidentRepository.deleteAll();
        tripStopRepository.deleteAll();
        routeProposalRepository.deleteAll();
        bookingRepository.deleteAll();
        tripRepository.deleteAll();
        routeRepository.deleteAll();
        driverRepository.deleteAll();
        vehicleRepository.deleteAll();
        companyRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void fullCoreJourney_registerApproveCreateBookOptimizeDriveMonitorIncidentAndComplete() {
        // 1. Seed Admin user & Register Company Owner + 2 Passengers
        User admin = userRepository.save(new User("admin@e2e.vn", "hash", "System Admin", UserRole.ADMIN));
        AuthPrincipal adminPrincipal = new AuthPrincipal(admin.getId(), admin.getEmail(), UserRole.ADMIN);

        AuthResponse tcAuth = authService.register(new RegisterRequest(
                "company@e2e.vn", "Passw0rd!123", "Chủ Nhà Xe Miền Trung", UserRole.TRANSPORT_COMPANY, "0905111222"));
        Long tcUserId = jwtService.verify(tcAuth.accessToken(), "access").userId();
        AuthPrincipal companyPrincipal = new AuthPrincipal(tcUserId, "company@e2e.vn", UserRole.TRANSPORT_COMPANY);

        AuthResponse p1Auth = authService.register(new RegisterRequest(
                "pax1@e2e.vn", "Passw0rd!123", "Nguyễn Văn An", UserRole.PASSENGER, "0935111111"));
        Long p1Id = jwtService.verify(p1Auth.accessToken(), "access").userId();
        AuthPrincipal p1Principal = new AuthPrincipal(p1Id, "pax1@e2e.vn", UserRole.PASSENGER);

        AuthResponse p2Auth = authService.register(new RegisterRequest(
                "pax2@e2e.vn", "Passw0rd!123", "Trần Thị Bình", UserRole.PASSENGER, "0935222222"));
        Long p2Id = jwtService.verify(p2Auth.accessToken(), "access").userId();
        AuthPrincipal p2Principal = new AuthPrincipal(p2Id, "pax2@e2e.vn", UserRole.PASSENGER);

        // 2. Company Registration -> PENDING -> Admin APPROVES
        CompanyResponse pendingCompany = companyService.registerCompany(
                new CompanyRegistrationRequest(
                        "Nhà Xe Miền Trung E2E",
                        "0905111222",
                        "120 Tôn Đức Thắng, Đà Nẵng",
                        "Nguyễn Thành Công",
                        "GPKD Vận tải hành khách liên tỉnh 43-E2E"),
                companyPrincipal);
        assertThat(pendingCompany.status()).isEqualTo(CompanyStatus.PENDING);

        CompanyResponse approvedCompany = companyService.decide(
                pendingCompany.id(),
                new CompanyDecisionRequest(DecisionType.APPROVE, "Hồ sơ hợp lệ"),
                adminPrincipal);
        assertThat(approvedCompany.status()).isEqualTo(CompanyStatus.APPROVED);
        Long companyId = approvedCompany.id();

        // 3. Create Vehicle, Driver (with login account), Route, Trip -> Publish
        VehicleResponse vehicle = companyService.addVehicle(
                companyId,
                new VehicleRequest("43B-999.99", "Limousine 7 chỗ", "Ford", "Transit", 7, "VIP", null),
                companyPrincipal);
        DriverResponse driver = driverService.addDriver(
                companyId,
                new DriverRequest("Tài Xế Hùng", "0914555666", "B2-888999", "driver@e2e.vn", "DriverPass123"),
                companyPrincipal);
        User driverUser = userRepository.findByEmailIgnoreCase("driver@e2e.vn").orElseThrow();
        AuthPrincipal driverPrincipal = new AuthPrincipal(driverUser.getId(), driverUser.getEmail(), UserRole.DRIVER);

        RouteResponse route = routeService.addRoute(
                companyId,
                new RouteRequest("Đà Nẵng - Huế", "Đà Nẵng", "Huế", 120, new BigDecimal("180000"), null),
                companyPrincipal);

        Instant departure = Instant.now().plus(3, ChronoUnit.HOURS);
        TripResponse draftTrip = tripService.createTrip(
                companyId,
                new TripRequest(route.id(), vehicle.id(), driver.id(), departure, new BigDecimal("180000"), "Xe ghép VIP"),
                companyPrincipal);
        TripResponse publishedTrip = tripService.publishTrip(companyId, draftTrip.id(), companyPrincipal);
        assertThat(publishedTrip.status()).isEqualTo(TripStatus.PUBLISHED);
        Long tripId = publishedTrip.id();

        // 4. Passengers Search & Book Seats (with Idempotency check)
        List<TripSearchResult> found = tripSearchService.search(
                new TripSearchRequest("Đà Nẵng", "Huế", null, 1));
        assertThat(found).extracting(TripSearchResult::tripId).contains(tripId);

        BookingResponse b1 = bookingService.createBooking(
                tripId,
                "e2e-idem-b1",
                new CreateBookingRequest(
                        2,
                        new LocationDto("24 Lê Duẩn, Hải Châu, Đà Nẵng", new BigDecimal("16.068000"), new BigDecimal("108.221000")),
                        new LocationDto("15 Hùng Vương, TP. Huế", new BigDecimal("16.463000"), new BigDecimal("107.595000"))),
                p1Principal);
        // Duplicate idempotency key returns identical booking without deducting seats twice
        BookingResponse b1Dup = bookingService.createBooking(
                tripId,
                "e2e-idem-b1",
                new CreateBookingRequest(
                        2,
                        new LocationDto("24 Lê Duẩn, Hải Châu, Đà Nẵng", new BigDecimal("16.068000"), new BigDecimal("108.221000")),
                        new LocationDto("15 Hùng Vương, TP. Huế", new BigDecimal("16.463000"), new BigDecimal("107.595000"))),
                p1Principal);
        assertThat(b1Dup.id()).isEqualTo(b1.id());

        BookingResponse b2 = bookingService.createBooking(
                tripId,
                "e2e-idem-b2",
                new CreateBookingRequest(
                        1,
                        new LocationDto("100 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng", new BigDecimal("16.060000"), new BigDecimal("108.210000")),
                        new LocationDto("Thị trấn Lăng Cô, Huế", new BigDecimal("16.235000"), new BigDecimal("108.084000"))),
                p2Principal);
        assertThat(b1.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(b2.status()).isEqualTo(BookingStatus.CONFIRMED);

        // 5. Company Syncs Stops, Calls AI Optimizer (real HTTP) & Accepts Proposal
        List<TripStopResponse> initialStops = routeOptimizationService.syncOrReorderTripStops(
                tripId, null, companyPrincipal);
        assertThat(initialStops).hasSize(4);

        RouteProposalResponse proposal = routeOptimizationService.optimizeTrip(tripId, companyPrincipal);
        assertThat(proposal.status()).isEqualTo(RouteProposalStatus.PROPOSED);
        assertThat(proposal.stops()).hasSize(4);

        RouteProposalResponse acceptedProposal = routeOptimizationService.acceptProposal(
                tripId, proposal.id(), companyPrincipal);
        assertThat(acceptedProposal.status()).isEqualTo(RouteProposalStatus.ACCEPTED);

        // 6. Driver Accepts Assignment, Starts Trip, Sends GPS, Reports Incident
        TripResponse driverAccepted = tripExecutionService.acceptTrip(tripId, driverPrincipal);
        assertThat(driverAccepted.assignmentStatus()).isEqualTo("ACCEPTED");

        TripResponse started = tripExecutionService.startTrip(tripId, driverPrincipal);
        assertThat(started.status()).isEqualTo(TripStatus.IN_PROGRESS);
        assertThat(driverRepository.findById(driver.id()).orElseThrow().getStatus())
                .isEqualTo(DriverStatus.ON_TRIP);
        assertThat(vehicleRepository.findById(vehicle.id()).orElseThrow().getStatus())
                .isEqualTo(VehicleStatus.IN_USE);

        tripExecutionService.updateDriverLocation(
                tripId,
                new DriverLocationUpdateRequest(
                        new BigDecimal("16.062000"), new BigDecimal("108.213000"),
                        new BigDecimal("25"), new BigDecimal("38")),
                driverPrincipal);

        TripIncidentResponse incident = tripIncidentService.reportIncident(
                tripId,
                new ReportIncidentRequest(
                        TripIncidentType.HEAVY_TRAFFIC,
                        "Ùn tắc tại đường dẫn hầm Hải Vân phía Nam",
                        null,
                        null),
                driverPrincipal);
        assertThat(incident.status()).isEqualTo(TripIncidentStatus.OPEN);

        // 7. Passenger Live Tracking Snapshot enforces Privacy Masking + Personal ETA
        TripLiveSnapshotResponse p1Snapshot = tripExecutionService.getLiveSnapshot(tripId, p1Principal);
        assertThat(p1Snapshot.routeOptimized()).isTrue();
        assertThat(p1Snapshot.locationStale()).isFalse();
        assertThat(p1Snapshot.stops()).hasSize(4);
        assertThat(p1Snapshot.myNextStop()).isNotNull();
        assertThat(p1Snapshot.stops())
                .anySatisfy(s -> {
                    assertThat(s.ownStop()).isFalse();
                    assertThat(s.passengerName()).isEqualTo("Hành khách khác");
                    assertThat(s.passengerPhone()).isNull();
                    assertThat(s.bookingCode()).isNull();
                });

        // 8. Company & Admin Monitoring Dashboards see Live Progress + Incident, then Resolve
        List<TripMonitoringSummaryResponse> companyMonitoring =
                tripIncidentService.listCompanyMonitoringTrips(companyId, companyPrincipal);
        assertThat(companyMonitoring).hasSize(1);
        assertThat(companyMonitoring.get(0).openIncidentsCount()).isEqualTo(1);
        assertThat(companyMonitoring.get(0).status()).isEqualTo(TripStatus.IN_PROGRESS);

        List<TripMonitoringSummaryResponse> adminMonitoring = tripIncidentService.listAdminMonitoringTrips();
        assertThat(adminMonitoring).hasSize(1);

        TripIncidentResponse resolvedIncident = tripIncidentService.resolveIncident(
                tripId,
                incident.id(),
                new ResolveIncidentRequest("Đã liên hệ tài xế chuyển làn ưu tiên"),
                companyPrincipal);
        assertThat(resolvedIncident.status()).isEqualTo(TripIncidentStatus.RESOLVED);

        // 9. Driver executes ordered stops (verifying PICKUP-before-DROPOFF invariant) & Completes Trip
        List<TripStopResponse> orderedStops = tripExecutionService.listTripStopsForDriver(tripId, driverPrincipal);
        TripStopResponse firstDropoff = orderedStops.stream()
                .filter(s -> s.stopType() == TripStopType.DROPOFF)
                .findFirst().orElseThrow();

        // Attempting DROPPED_OFF before its PICKUP is completed MUST return 409 CONFLICT
        assertThatThrownBy(() -> tripExecutionService.updateStopStatus(
                        tripId, firstDropoff.id(), new StopStatusUpdateRequest("DROPPED_OFF", null), driverPrincipal))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        for (TripStopResponse stop : orderedStops) {
            TripStopResponse arrived = tripExecutionService.updateStopStatus(
                    tripId, stop.id(), new StopStatusUpdateRequest("ARRIVED", null), driverPrincipal);
            assertThat(arrived.status()).isEqualTo(TripStopStatus.ARRIVED);

            String completeAction = stop.stopType() == TripStopType.PICKUP ? "PICKED_UP" : "DROPPED_OFF";
            TripStopResponse done = tripExecutionService.updateStopStatus(
                    tripId, stop.id(), new StopStatusUpdateRequest(completeAction, null), driverPrincipal);
            assertThat(done.status()).isEqualTo(TripStopStatus.COMPLETED);
        }

        assertThat(bookingRepository.findById(b1.id()).orElseThrow().getStatus())
                .isEqualTo(BookingStatus.COMPLETED);
        assertThat(bookingRepository.findById(b2.id()).orElseThrow().getStatus())
                .isEqualTo(BookingStatus.COMPLETED);

        TripResponse completed = tripExecutionService.completeTrip(tripId, driverPrincipal);
        assertThat(completed.status()).isEqualTo(TripStatus.COMPLETED);
        assertThat(driverRepository.findById(driver.id()).orElseThrow().getStatus())
                .isEqualTo(DriverStatus.AVAILABLE);
        assertThat(vehicleRepository.findById(vehicle.id()).orElseThrow().getStatus())
                .isEqualTo(VehicleStatus.AVAILABLE);
    }
}
