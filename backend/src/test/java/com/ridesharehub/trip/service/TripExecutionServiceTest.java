package com.ridesharehub.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.company.enums.VehicleStatus;
import com.ridesharehub.company.repository.VehicleRepository;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.enums.DriverStatus;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.route.entity.Route;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.DriverLocationUpdateRequest;
import com.ridesharehub.trip.dto.StopStatusUpdateRequest;
import com.ridesharehub.trip.dto.TripLiveSnapshotResponse;
import com.ridesharehub.trip.dto.TripResponse;
import com.ridesharehub.trip.dto.TripStopResponse;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.entity.TripStop;
import com.ridesharehub.trip.enums.DriverAssignmentStatus;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.enums.TripStopStatus;
import com.ridesharehub.trip.enums.TripStopType;
import com.ridesharehub.trip.realtime.TripRealtimeBroadcaster;
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
class TripExecutionServiceTest {

    @Mock TripRepository tripRepository;
    @Mock TripStopRepository tripStopRepository;
    @Mock BookingRepository bookingRepository;
    @Mock DriverRepository driverRepository;
    @Mock VehicleRepository vehicleRepository;
    @Mock TripRealtimeBroadcaster realtimeBroadcaster;

    private TripExecutionService service;

    private static final AuthPrincipal DRIVER_PRINCIPAL =
            new AuthPrincipal(201L, "driver@example.com", UserRole.DRIVER);
    private static final AuthPrincipal OTHER_DRIVER_PRINCIPAL =
            new AuthPrincipal(202L, "other.driver@example.com", UserRole.DRIVER);
    private static final AuthPrincipal PASSENGER_PRINCIPAL =
            new AuthPrincipal(301L, "passenger@example.com", UserRole.PASSENGER);
    private static final AuthPrincipal STRANGER_PASSENGER_PRINCIPAL =
            new AuthPrincipal(399L, "stranger@example.com", UserRole.PASSENGER);

    private Long tripId;
    private Trip trip;
    private Driver driver;
    private Driver otherDriver;
    private Vehicle vehicle;
    private Booking booking;
    private List<TripStop> stopStore;
    private final AtomicLong stopIdGenerator = new AtomicLong(500L);

    @BeforeEach
    void setUp() throws Exception {
        service = new TripExecutionService(
                tripRepository,
                tripStopRepository,
                bookingRepository,
                driverRepository,
                vehicleRepository,
                realtimeBroadcaster);

        User owner = new User("tc@example.com", "hash", "TC Owner", UserRole.TRANSPORT_COMPANY);
        setId(owner, 10L);
        TransportCompany company = new TransportCompany(
                owner, "Nhà Xe Hoàng Gia", "123 Lê Duẩn", "0900000000", "Rep", "Biz");
        setId(company, 1L);

        vehicle = new Vehicle(company, "43A-888.88", "Limousine", "Ford", "Transit", 7);
        setId(vehicle, 100L);

        User driverUser = new User("driver@example.com", "hash", "Tài Xế A", UserRole.DRIVER);
        setId(driverUser, 201L);
        driver = new Driver(company, "Tài Xế A", "0911222333", "B2-123456");
        setId(driver, 200L);
        driver.assignUser(201L);

        User otherDriverUser = new User("other.driver@example.com", "hash", "Tài Xế B", UserRole.DRIVER);
        setId(otherDriverUser, 202L);
        otherDriver = new Driver(company, "Tài Xế B", "0911999888", "B2-999999");
        setId(otherDriver, 205L);
        otherDriver.assignUser(202L);

        Route route = new Route(
                company,
                "Đà Nẵng - Huế",
                "Đà Nẵng",
                "Huế",
                120,
                new BigDecimal("150000"));
        setId(route, 50L);

        tripId = 1001L;
        trip = new Trip(
                route,
                company,
                vehicle,
                driver,
                Instant.now().plus(2, ChronoUnit.HOURS),
                new BigDecimal("150000"),
                "Trip test");
        setId(trip, tripId);
        trip.publish();

        User passengerUser = new User("passenger@example.com", "hash", "Hành Khách 1", UserRole.PASSENGER);
        setId(passengerUser, 301L);
        booking = new Booking(
                "RSH-TEST0001",
                trip,
                passengerUser,
                "0933444555",
                2,
                "24 Lê Duẩn, Hải Châu, Đà Nẵng",
                new BigDecimal("16.068000"),
                new BigDecimal("108.221000"),
                "15 Hùng Vương, TP. Huế",
                new BigDecimal("16.463000"),
                new BigDecimal("107.595000"),
                new BigDecimal("300000"),
                false);
        setId(booking, 701L);
        booking.confirm();

        stopStore = new ArrayList<>();

        lenient().when(driverRepository.findByUserId(201L)).thenReturn(Optional.of(driver));
        lenient().when(driverRepository.findByUserId(202L)).thenReturn(Optional.of(otherDriver));
        lenient().when(driverRepository.save(any(Driver.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(vehicleRepository.save(any(Vehicle.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        lenient().when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(bookingRepository.findAllByTrip_IdOrderByCreatedAtAsc(tripId))
                .thenReturn(List.of(booking));
        lenient().when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(tripStopRepository.findAllByTripIdWithBooking(tripId))
                .thenAnswer(inv -> new ArrayList<>(stopStore));
        lenient().when(tripStopRepository.save(any(TripStop.class))).thenAnswer(inv -> {
            TripStop s = inv.getArgument(0);
            if (s.getId() == null) {
                setId(s, stopIdGenerator.incrementAndGet());
            }
            stopStore.removeIf(existing -> existing.getId().equals(s.getId()));
            stopStore.add(s);
            stopStore.sort((a, b) -> Integer.compare(a.getStopOrder(), b.getStopOrder()));
            return s;
        });
        lenient().when(tripStopRepository.findByIdWithDetails(any(Long.class))).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return stopStore.stream().filter(s -> s.getId().equals(id)).findFirst();
        });
        lenient().when(tripStopRepository.findByBooking_IdAndStopType(any(Long.class), any(TripStopType.class)))
                .thenAnswer(inv -> {
                    Long bId = inv.getArgument(0);
                    TripStopType type = inv.getArgument(1);
                    return stopStore.stream()
                            .filter(s -> s.getBooking().getId().equals(bId) && s.getStopType() == type)
                            .findFirst();
                });
    }

    @Test
    void acceptAndRejectTrip_enforcesDriverIdentityAndIdempotency() {
        // Wrong driver cannot accept
        assertThatThrownBy(() -> service.acceptTrip(tripId, OTHER_DRIVER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        // Assigned driver accepts -> ACCEPTED
        TripResponse accepted = service.acceptTrip(tripId, DRIVER_PRINCIPAL);
        assertThat(accepted.assignmentStatus()).isEqualTo("ACCEPTED");

        // Idempotent second accept
        TripResponse acceptedAgain = service.acceptTrip(tripId, DRIVER_PRINCIPAL);
        assertThat(acceptedAgain.assignmentStatus()).isEqualTo("ACCEPTED");

        // Cannot reject after accepting
        assertThatThrownBy(() -> service.rejectTrip(tripId, DRIVER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void rejectTrip_whenAssigned_setsRejectedAndIsIdempotent() {
        TripResponse rejected = service.rejectTrip(tripId, DRIVER_PRINCIPAL);
        assertThat(rejected.assignmentStatus()).isEqualTo("REJECTED");

        // Idempotent second reject
        TripResponse rejectedAgain = service.rejectTrip(tripId, DRIVER_PRINCIPAL);
        assertThat(rejectedAgain.assignmentStatus()).isEqualTo("REJECTED");
    }

    @Test
    void startStopsAndCompleteTrip_fullLifecycleEnforcesPickupBeforeDropoff() {
        // Must accept before start
        assertThatThrownBy(() -> service.startTrip(tripId, DRIVER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        service.acceptTrip(tripId, DRIVER_PRINCIPAL);
        TripResponse started = service.startTrip(tripId, DRIVER_PRINCIPAL);
        assertThat(started.status()).isEqualTo(TripStatus.IN_PROGRESS);
        assertThat(driver.getStatus()).isEqualTo(DriverStatus.ON_TRIP);
        assertThat(vehicle.getStatus()).isEqualTo(VehicleStatus.IN_USE);

        // Materialized 2 stops (PICKUP and DROPOFF)
        List<TripStopResponse> stops = service.listTripStopsForDriver(tripId, DRIVER_PRINCIPAL);
        assertThat(stops).hasSize(2);
        TripStopResponse pickup = stops.get(0);
        TripStopResponse dropoff = stops.get(1);
        assertThat(pickup.stopType()).isEqualTo(TripStopType.PICKUP);
        assertThat(dropoff.stopType()).isEqualTo(TripStopType.DROPOFF);

        // Cannot complete DROPOFF before PICKUP is COMPLETED
        assertThatThrownBy(() -> service.updateStopStatus(
                        tripId, dropoff.id(), new StopStatusUpdateRequest("DROPPED_OFF", null), DRIVER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        // Cannot complete trip while stops are pending
        assertThatThrownBy(() -> service.completeTrip(tripId, DRIVER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        // 1. Arrive at PICKUP
        TripStopResponse pickupArrived = service.updateStopStatus(
                tripId, pickup.id(), new StopStatusUpdateRequest("ARRIVED", null), DRIVER_PRINCIPAL);
        assertThat(pickupArrived.status()).isEqualTo(TripStopStatus.ARRIVED);

        // 2. Complete PICKUP -> Booking becomes PICKED_UP
        TripStopResponse pickupCompleted = service.updateStopStatus(
                tripId, pickup.id(), new StopStatusUpdateRequest("PICKED_UP", null), DRIVER_PRINCIPAL);
        assertThat(pickupCompleted.status()).isEqualTo(TripStopStatus.COMPLETED);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PICKED_UP);

        // 3. Arrive at DROPOFF
        TripStopResponse dropoffArrived = service.updateStopStatus(
                tripId, dropoff.id(), new StopStatusUpdateRequest("ARRIVED", null), DRIVER_PRINCIPAL);
        assertThat(dropoffArrived.status()).isEqualTo(TripStopStatus.ARRIVED);

        // 4. Complete DROPOFF -> Booking becomes COMPLETED
        TripStopResponse dropoffCompleted = service.updateStopStatus(
                tripId, dropoff.id(), new StopStatusUpdateRequest("DROPPED_OFF", null), DRIVER_PRINCIPAL);
        assertThat(dropoffCompleted.status()).isEqualTo(TripStopStatus.COMPLETED);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.COMPLETED);

        // 5. Complete Trip -> Trip COMPLETED, driver & vehicle AVAILABLE
        TripResponse completedTrip = service.completeTrip(tripId, DRIVER_PRINCIPAL);
        assertThat(completedTrip.status()).isEqualTo(TripStatus.COMPLETED);
        assertThat(driver.getStatus()).isEqualTo(DriverStatus.AVAILABLE);
        assertThat(vehicle.getStatus()).isEqualTo(VehicleStatus.AVAILABLE);
    }

    @Test
    void updateLocationAndLiveSnapshot_broadcastsAndEnforcesAuthorization() {
        service.acceptTrip(tripId, DRIVER_PRINCIPAL);
        service.startTrip(tripId, DRIVER_PRINCIPAL);

        TripLiveSnapshotResponse snapshot = service.updateDriverLocation(
                tripId,
                new DriverLocationUpdateRequest(
                        new BigDecimal("16.065000"),
                        new BigDecimal("108.215000"),
                        new BigDecimal("45.0"),
                        new BigDecimal("42.0")),
                DRIVER_PRINCIPAL);

        assertThat(snapshot.currentLat()).isEqualByComparingTo("16.065000");
        assertThat(snapshot.currentLng()).isEqualByComparingTo("108.215000");
        assertThat(snapshot.locationStale()).isFalse();
        assertThat(snapshot.nextStop()).isNotNull();
        assertThat(snapshot.etaMinutesToNextStop()).isNotNull();
        verify(realtimeBroadcaster, times(3)).broadcast(eq(tripId), any(TripLiveSnapshotResponse.class));

        // Passenger with booking can view live snapshot
        TripLiveSnapshotResponse passengerView = service.getLiveSnapshot(tripId, PASSENGER_PRINCIPAL);
        assertThat(passengerView.tripId()).isEqualTo(tripId);

        // Stranger passenger without booking gets 403 FORBIDDEN
        assertThatThrownBy(() -> service.getLiveSnapshot(tripId, STRANGER_PASSENGER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    private static void setId(Object entity, Object idValue) throws Exception {
        Field f = entity.getClass().getDeclaredField("id");
        f.setAccessible(true);
        f.set(entity, idValue);
    }
}
