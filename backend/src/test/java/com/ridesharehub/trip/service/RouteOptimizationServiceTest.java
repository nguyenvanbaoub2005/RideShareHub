package com.ridesharehub.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.company.repository.VehicleRepository;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.route.entity.Route;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.RejectProposalRequest;
import com.ridesharehub.trip.dto.RouteProposalResponse;
import com.ridesharehub.trip.dto.SyncTripStopsRequest;
import com.ridesharehub.trip.dto.TripLiveSnapshotResponse;
import com.ridesharehub.trip.dto.TripStopResponse;
import com.ridesharehub.trip.entity.RouteProposal;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.entity.TripStop;
import com.ridesharehub.trip.enums.RouteProposalStatus;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.enums.TripStopType;
import com.ridesharehub.trip.optimizer.OptimizerClient;
import com.ridesharehub.trip.realtime.TripRealtimeBroadcaster;
import com.ridesharehub.trip.repository.RouteProposalRepository;
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
class RouteOptimizationServiceTest {

    @Mock TripRepository tripRepository;
    @Mock BookingRepository bookingRepository;
    @Mock TripStopRepository tripStopRepository;
    @Mock RouteProposalRepository routeProposalRepository;
    @Mock DriverRepository driverRepository;
    @Mock VehicleRepository vehicleRepository;
    @Mock TripRealtimeBroadcaster realtimeBroadcaster;
    @Mock OptimizerClient optimizerClient;

    private TripExecutionService executionService;
    private RouteOptimizationService optimizationService;

    private static final AuthPrincipal COMPANY_OWNER =
            new AuthPrincipal(10L, "owner@company.vn", UserRole.TRANSPORT_COMPANY);
    private static final AuthPrincipal OTHER_COMPANY =
            new AuthPrincipal(19L, "other@company.vn", UserRole.TRANSPORT_COMPANY);
    private static final AuthPrincipal PASSENGER_1 =
            new AuthPrincipal(301L, "p1@example.com", UserRole.PASSENGER);

    private Trip trip;
    private Booking booking1;
    private Booking booking2;
    private List<TripStop> stopStore;
    private List<RouteProposal> proposalStore;
    private final AtomicLong stopIdSeq = new AtomicLong(500L);
    private final AtomicLong proposalIdSeq = new AtomicLong(900L);

    @BeforeEach
    void setUp() throws Exception {
        executionService = new TripExecutionService(
                tripRepository,
                tripStopRepository,
                bookingRepository,
                driverRepository,
                vehicleRepository,
                realtimeBroadcaster,
                routeProposalRepository);

        optimizationService = new RouteOptimizationService(
                tripRepository,
                bookingRepository,
                tripStopRepository,
                routeProposalRepository,
                optimizerClient,
                executionService);

        User owner = new User("owner@company.vn", "hash", "Chủ Nhà Xe", UserRole.TRANSPORT_COMPANY);
        setId(owner, 10L);
        TransportCompany company = new TransportCompany(
                owner, "Nhà Xe Miền Trung", "123 Lê Duẩn", "0900000000", "Rep", "Biz");
        setId(company, 1L);

        Vehicle vehicle = new Vehicle(company, "43A-999.99", "Limousine", "Ford", "Transit", 7);
        setId(vehicle, 100L);

        Driver driver = new Driver(company, "Tài Xế Minh", "0911222333", "D-123456");
        setId(driver, 200L);
        driver.assignUser(201L);

        Route route = new Route(company, "Đà Nẵng - Huế", "Đà Nẵng", "Huế", 120, new BigDecimal("150000"));
        setId(route, 50L);

        trip = new Trip(
                route,
                company,
                vehicle,
                driver,
                Instant.now().plus(2, ChronoUnit.HOURS),
                new BigDecimal("150000"),
                "Chuyến ghép");
        setId(trip, 1001L);
        trip.publish();

        User u1 = new User("p1@example.com", "hash", "Nguyễn Văn An", UserRole.PASSENGER);
        setId(u1, 301L);
        u1.updateProfile("Nguyễn Văn An", "0931111111");
        booking1 = new Booking(
                "BK-001",
                trip,
                u1,
                "0931111111",
                2,
                "24 Lê Duẩn, Hải Châu, Đà Nẵng",
                new BigDecimal("16.068000"),
                new BigDecimal("108.221000"),
                "15 Hùng Vương, TP. Huế",
                new BigDecimal("16.463000"),
                new BigDecimal("107.595000"),
                new BigDecimal("300000"),
                false);
        setId(booking1, 701L);
        booking1.confirm();

        User u2 = new User("p2@example.com", "hash", "Trần Thị Bình", UserRole.PASSENGER);
        setId(u2, 302L);
        u2.updateProfile("Trần Thị Bình", "0932222222");
        booking2 = new Booking(
                "BK-002",
                trip,
                u2,
                "0932222222",
                1,
                "100 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng",
                new BigDecimal("16.060000"),
                new BigDecimal("108.210000"),
                "Thị trấn Lăng Cô, Phú Lộc, Huế",
                new BigDecimal("16.235000"),
                new BigDecimal("108.084000"),
                new BigDecimal("150000"),
                false);
        setId(booking2, 702L);
        booking2.confirm();

        stopStore = new ArrayList<>();
        proposalStore = new ArrayList<>();

        lenient().when(tripRepository.findById(1001L)).thenReturn(Optional.of(trip));
        lenient().when(bookingRepository.findAllByTrip_IdOrderByCreatedAtAsc(1001L))
                .thenReturn(List.of(booking1, booking2));
        lenient().when(tripStopRepository.findAllByTripIdWithBooking(1001L))
                .thenAnswer(inv -> new ArrayList<>(stopStore));
        lenient().when(tripStopRepository.save(any(TripStop.class))).thenAnswer(inv -> {
            TripStop s = inv.getArgument(0);
            if (s.getId() == null) {
                setId(s, stopIdSeq.incrementAndGet());
            }
            stopStore.removeIf(existing -> existing.getId().equals(s.getId()));
            stopStore.add(s);
            return s;
        });
        lenient().when(routeProposalRepository.save(any(RouteProposal.class))).thenAnswer(inv -> {
            RouteProposal p = inv.getArgument(0);
            if (p.getId() == null) {
                setId(p, proposalIdSeq.incrementAndGet());
            }
            proposalStore.removeIf(existing -> existing.getId().equals(p.getId()));
            proposalStore.add(p);
            return p;
        });
        lenient().when(routeProposalRepository.findByIdAndTripIdWithStops(any(Long.class), eq(1001L)))
                .thenAnswer(inv -> {
                    Long pid = inv.getArgument(0);
                    return proposalStore.stream().filter(p -> p.getId().equals(pid)).findFirst();
                });
        lenient().when(routeProposalRepository.findAllByTrip_IdAndStatusIn(eq(1001L), any()))
                .thenAnswer(inv -> {
                    @SuppressWarnings("unchecked")
                    List<RouteProposalStatus> statuses = inv.getArgument(1);
                    return proposalStore.stream().filter(p -> statuses.contains(p.getStatus())).toList();
                });
        lenient().when(routeProposalRepository.findFirstByTrip_IdAndStatusOrderByReviewedAtDescIdDesc(
                        eq(1001L), eq(RouteProposalStatus.ACCEPTED)))
                .thenAnswer(inv -> proposalStore.stream()
                        .filter(p -> p.getStatus() == RouteProposalStatus.ACCEPTED)
                        .findFirst());
    }

    @Test
    void syncOrReorderTripStops_enforcesPickupBeforeDropoffAndLocksCompletedTrip() throws Exception {
        // Unauthorized company gets 403
        assertThatThrownBy(() -> optimizationService.syncOrReorderTripStops(1001L, null, OTHER_COMPANY))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        // Materialize 4 stops (2 bookings x 2)
        List<TripStopResponse> stops = optimizationService.syncOrReorderTripStops(1001L, null, COMPANY_OWNER);
        assertThat(stops).hasSize(4);

        TripStopResponse p1 = stops.stream()
                .filter(s -> s.bookingId().equals(701L) && s.stopType() == TripStopType.PICKUP)
                .findFirst().orElseThrow();
        TripStopResponse d1 = stops.stream()
                .filter(s -> s.bookingId().equals(701L) && s.stopType() == TripStopType.DROPOFF)
                .findFirst().orElseThrow();
        TripStopResponse p2 = stops.stream()
                .filter(s -> s.bookingId().equals(702L) && s.stopType() == TripStopType.PICKUP)
                .findFirst().orElseThrow();
        TripStopResponse d2 = stops.stream()
                .filter(s -> s.bookingId().equals(702L) && s.stopType() == TripStopType.DROPOFF)
                .findFirst().orElseThrow();

        // Invalid order: DROPOFF of booking 1 before PICKUP of booking 1 -> 409 CONFLICT
        assertThatThrownBy(() -> optimizationService.syncOrReorderTripStops(
                        1001L,
                        new SyncTripStopsRequest(List.of(d1.id(), p1.id(), p2.id(), d2.id())),
                        COMPANY_OWNER))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        // Valid order: P2 -> P1 -> D2 -> D1
        List<TripStopResponse> reordered = optimizationService.syncOrReorderTripStops(
                1001L,
                new SyncTripStopsRequest(List.of(p2.id(), p1.id(), d2.id(), d1.id())),
                COMPANY_OWNER);
        assertThat(reordered).extracting(TripStopResponse::id)
                .containsExactly(p2.id(), p1.id(), d2.id(), d1.id());

        // Lock stops when Trip is COMPLETED
        Field statusField = Trip.class.getDeclaredField("status");
        statusField.setAccessible(true);
        statusField.set(trip, TripStatus.COMPLETED);

        assertThatThrownBy(() -> optimizationService.syncOrReorderTripStops(1001L, null, COMPANY_OWNER))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void optimizeAcceptSupersedeAndRejectProposal_fullLifecycleAndPassengerPrivacy() {
        OptimizerClient.OptimizerRouteResponse mockOpt = new OptimizerClient.OptimizerRouteResponse(
                1001L,
                "OR-TOOLS-VRPPD",
                "OPTIMAL",
                new BigDecimal("112.40"),
                new BigDecimal("128.90"),
                new BigDecimal("16.50"),
                140,
                3,
                7,
                List.of(
                        new OptimizerClient.OptimizedStopOutput(
                                1, 702L, "PICKUP", "100 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng",
                                16.06, 108.21, 1, 1, new BigDecimal("2.10"), new BigDecimal("2.10"), 5),
                        new OptimizerClient.OptimizedStopOutput(
                                2, 701L, "PICKUP", "24 Lê Duẩn, Hải Châu, Đà Nẵng",
                                16.068, 108.221, 2, 3, new BigDecimal("1.80"), new BigDecimal("3.90"), 10),
                        new OptimizerClient.OptimizedStopOutput(
                                3, 702L, "DROPOFF", "Thị trấn Lăng Cô, Phú Lộc, Huế",
                                16.235, 108.084, -1, 2, new BigDecimal("30.00"), new BigDecimal("33.90"), 55),
                        new OptimizerClient.OptimizedStopOutput(
                                4, 701L, "DROPOFF", "15 Hùng Vương, TP. Huế",
                                16.463, 107.595, -2, 0, new BigDecimal("78.50"), new BigDecimal("112.40"), 140)));

        when(optimizerClient.optimizeTripRoute(any())).thenReturn(mockOpt);

        // 1. Optimize creates a PROPOSED proposal without mutating stops yet
        RouteProposalResponse p1 = optimizationService.optimizeTrip(1001L, COMPANY_OWNER);
        assertThat(p1.status()).isEqualTo(RouteProposalStatus.PROPOSED);
        assertThat(p1.distanceSavedKm()).isEqualByComparingTo("16.50");
        assertThat(p1.stops()).hasSize(4);

        // Before proposal is ACCEPTED: Passenger 1 only sees their OWN 2 stops (routeOptimized = false)
        TripLiveSnapshotResponse snapBefore = executionService.getLiveSnapshot(1001L, PASSENGER_1);
        assertThat(snapBefore.routeOptimized()).isFalse();
        assertThat(snapBefore.stops()).hasSize(2);
        assertThat(snapBefore.stops()).allMatch(s -> Boolean.TRUE.equals(s.ownStop()));
        assertThat(snapBefore.myNextStop()).isNotNull();
        assertThat(snapBefore.etaMinutesToMyStop()).isNotNull();

        // 2. Accept proposal #1 -> stops reordered & broadcast triggered
        RouteProposalResponse accepted1 = optimizationService.acceptProposal(1001L, p1.id(), COMPANY_OWNER);
        assertThat(accepted1.status()).isEqualTo(RouteProposalStatus.ACCEPTED);
        verify(realtimeBroadcaster).broadcast(eq(1001L), any(TripLiveSnapshotResponse.class));

        // After proposal is ACCEPTED: Passenger 1 sees full 4 approved stops,
        // with Passenger 2's sensitive details masked!
        TripLiveSnapshotResponse snapAfter = executionService.getLiveSnapshot(1001L, PASSENGER_1);
        assertThat(snapAfter.routeOptimized()).isTrue();
        assertThat(snapAfter.acceptedProposalId()).isEqualTo(p1.id());
        assertThat(snapAfter.stops()).hasSize(4);

        // Stop #1 belongs to Passenger 2 -> MUST be masked
        TripStopResponse firstStop = snapAfter.stops().get(0);
        assertThat(firstStop.ownStop()).isFalse();
        assertThat(firstStop.passengerName()).isEqualTo("Hành khách khác");
        assertThat(firstStop.passengerPhone()).isNull();
        assertThat(firstStop.bookingCode()).isNull();

        // Stop #2 belongs to Passenger 1 -> full details visible
        TripStopResponse secondStop = snapAfter.stops().get(1);
        assertThat(secondStop.ownStop()).isTrue();
        assertThat(secondStop.passengerName()).isEqualTo("Nguyễn Văn An");
        assertThat(secondStop.bookingCode()).isEqualTo("BK-001");
        assertThat(secondStop.plannedArrivalAt()).isNotNull();

        // 3. Generate proposal #2 and accept it -> proposal #1 becomes SUPERSEDED
        RouteProposalResponse p2 = optimizationService.optimizeTrip(1001L, COMPANY_OWNER);
        RouteProposalResponse accepted2 = optimizationService.acceptProposal(1001L, p2.id(), COMPANY_OWNER);
        assertThat(accepted2.status()).isEqualTo(RouteProposalStatus.ACCEPTED);
        assertThat(proposalStore.stream().filter(x -> x.getId().equals(p1.id())).findFirst().orElseThrow().getStatus())
                .isEqualTo(RouteProposalStatus.SUPERSEDED);

        // 4. Generate proposal #3 and reject it
        RouteProposalResponse p3 = optimizationService.optimizeTrip(1001L, COMPANY_OWNER);
        RouteProposalResponse rejected = optimizationService.rejectProposal(
                1001L, p3.id(), new RejectProposalRequest("Đường đèo đang sửa"), COMPANY_OWNER);
        assertThat(rejected.status()).isEqualTo(RouteProposalStatus.REJECTED);
        assertThat(rejected.rejectReason()).isEqualTo("Đường đèo đang sửa");
    }

    private static void setId(Object entity, Object idValue) throws Exception {
        Field f = entity.getClass().getDeclaredField("id");
        f.setAccessible(true);
        f.set(entity, idValue);
    }
}
