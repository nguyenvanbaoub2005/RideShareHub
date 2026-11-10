package com.ridesharehub.booking.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.auth.repository.UserRepository;
import com.ridesharehub.booking.dto.BookingResponse;
import com.ridesharehub.booking.dto.CancelBookingRequest;
import com.ridesharehub.booking.dto.CreateBookingRequest;
import com.ridesharehub.booking.dto.LocationDto;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.company.repository.VehicleRepository;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.route.entity.Route;
import com.ridesharehub.route.repository.RouteRepository;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.repository.TripRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.server.ResponseStatusException;

/**
 * SP2-P2-04: Concurrent Booking Integration Test.
 *
 * <p>Verifies that when a PUBLISHED Trip has only 2 seats remaining and
 * 2 passengers simultaneously request 2 seats each:
 * <ul>
 *   <li>Exactly 1 booking succeeds (CONFIRMED).
 *   <li>Exactly 1 booking fails with 409 CONFLICT.
 *   <li>Remaining capacity reaches 0 (TripStatus.FULL) and never becomes negative.
 *   <li>Cancelling the confirmed booking releases the 2 seats so a subsequent booking succeeds.
 * </ul>
 */
@SpringBootTest
@TestPropertySource(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:concurrent_booking_test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;LOCK_TIMEOUT=10000;INIT=RUNSCRIPT FROM 'classpath:h2-domains.sql'",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "spring.flyway.enabled=false",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "jwt.signer-key=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "booking.policy.auto-confirm=true"
        })
class ConcurrentBookingTest {

    @Autowired private BookingService bookingService;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private TripRepository tripRepository;
    @Autowired private RouteRepository routeRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private DriverRepository driverRepository;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private UserRepository userRepository;

    private User passenger1;
    private User passenger2;
    private Trip twoSeatRemainingTrip;

    @BeforeEach
    void setUp() {
        bookingRepository.deleteAll();
        tripRepository.deleteAll();
        routeRepository.deleteAll();
        driverRepository.deleteAll();
        vehicleRepository.deleteAll();
        companyRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(
                new User("admin@rsh.test", "hash", "Admin", UserRole.ADMIN));
        User companyOwner = userRepository.save(
                new User("owner@rsh.test", "hash", "Owner", UserRole.TRANSPORT_COMPANY));
        passenger1 = userRepository.save(
                new User("p1@rsh.test", "hash", "Passenger 1", UserRole.PASSENGER));
        passenger2 = userRepository.save(
                new User("p2@rsh.test", "hash", "Passenger 2", UserRole.PASSENGER));

        TransportCompany company = new TransportCompany(
                companyOwner, "Nhà Xe Đà Nẵng", "Đà Nẵng", "0905000111", "Rep", "Info");
        company.approve(admin);
        company = companyRepository.save(company);

        // Vehicle with 7 total seats, 5 already booked -> exactly 2 seats remaining
        Vehicle vehicle = vehicleRepository.save(
                new Vehicle(company, "43A-99999", "Limousine 7 chỗ", "Ford", "Transit", 7));
        Driver driver = driverRepository.save(
                new Driver(company, "Tài Xế 1", "0905000222", "GPLX-001"));
        Route route = routeRepository.save(
                new Route(company, "Đà Nẵng - Huế", "Đà Nẵng", "Huế", 120, new BigDecimal("180000.00")));

        Trip trip = new Trip(
                route,
                company,
                vehicle,
                driver,
                Instant.now().plus(1, ChronoUnit.DAYS),
                new BigDecimal("180000.00"));
        trip.publish();
        trip.reserveSeats(5); // 5 seats already taken -> 2 seats remaining!
        twoSeatRemainingTrip = tripRepository.save(trip);
    }

    @Test
    void two_simultaneous_two_seat_requests_on_trip_with_two_remaining_seats_confirms_only_one()
            throws Exception {

        Long tripId = twoSeatRemainingTrip.getId();
        AuthPrincipal p1Principal = new AuthPrincipal(
                passenger1.getId(), passenger1.getEmail(), UserRole.PASSENGER);
        AuthPrincipal p2Principal = new AuthPrincipal(
                passenger2.getId(), passenger2.getEmail(), UserRole.PASSENGER);

        CreateBookingRequest req1 = new CreateBookingRequest(
                2,
                new LocationDto("10 Nguyễn Văn Linh, Đà Nẵng"),
                new LocationDto("20 Lê Lợi, Huế"));
        CreateBookingRequest req2 = new CreateBookingRequest(
                2,
                new LocationDto("50 Điện Biên Phủ, Đà Nẵng"),
                new LocationDto("80 Hùng Vương, Huế"));

        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);
        List<BookingResponse> confirmedBookings = new ArrayList<>();

        Callable<Void> task1 = () -> {
            readyLatch.countDown();
            startLatch.await();
            try {
                BookingResponse resp = bookingService.createBooking(
                        tripId, "idem-concurrent-p1", req1, p1Principal);
                synchronized (confirmedBookings) {
                    confirmedBookings.add(resp);
                }
                successCount.incrementAndGet();
            } catch (ResponseStatusException ex) {
                if (ex.getStatusCode().value() == HttpStatus.CONFLICT.value()) {
                    conflictCount.incrementAndGet();
                } else {
                    throw ex;
                }
            }
            return null;
        };

        Callable<Void> task2 = () -> {
            readyLatch.countDown();
            startLatch.await();
            try {
                BookingResponse resp = bookingService.createBooking(
                        tripId, "idem-concurrent-p2", req2, p2Principal);
                synchronized (confirmedBookings) {
                    confirmedBookings.add(resp);
                }
                successCount.incrementAndGet();
            } catch (ResponseStatusException ex) {
                if (ex.getStatusCode().value() == HttpStatus.CONFLICT.value()) {
                    conflictCount.incrementAndGet();
                } else {
                    throw ex;
                }
            }
            return null;
        };

        try {
            Future<Void> f1 = executor.submit(task1);
            Future<Void> f2 = executor.submit(task2);

            assertThat(readyLatch.await(5, TimeUnit.SECONDS)).isTrue();
            // Release both threads at the exact same instant
            startLatch.countDown();

            f1.get(10, TimeUnit.SECONDS);
            f2.get(10, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        // Assert: strictly 1 booking succeeded and 1 failed with 409 CONFLICT
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(conflictCount.get()).isEqualTo(1);
        assertThat(confirmedBookings).hasSize(1);

        BookingResponse winningBooking = confirmedBookings.get(0);
        assertThat(winningBooking.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(winningBooking.seatCount()).isEqualTo(2);

        // Verify durable Trip state in database: 7/7 seats booked, 0 remaining, status FULL
        Trip reloadedTrip = tripRepository.findById(tripId).orElseThrow();
        assertThat(reloadedTrip.getBookedSeats()).isEqualTo(7);
        assertThat(reloadedTrip.getStatus()).isEqualTo(TripStatus.FULL);

        // Verify cancelling the winning booking releases the 2 seats so the other passenger can book
        AuthPrincipal winnerPrincipal = winningBooking.passengerId().equals(passenger1.getId())
                ? p1Principal
                : p2Principal;
        AuthPrincipal loserPrincipal = winningBooking.passengerId().equals(passenger1.getId())
                ? p2Principal
                : p1Principal;

        BookingResponse cancelled = bookingService.cancelBooking(
                winningBooking.id(),
                "idem-cancel-winner",
                new CancelBookingRequest("Nhường vé"),
                winnerPrincipal);
        assertThat(cancelled.status()).isEqualTo(BookingStatus.CANCELLED);

        Trip afterCancelTrip = tripRepository.findById(tripId).orElseThrow();
        assertThat(afterCancelTrip.getBookedSeats()).isEqualTo(5);
        assertThat(afterCancelTrip.getStatus()).isEqualTo(TripStatus.PUBLISHED);

        // Now the losing passenger retries with a new idempotency key and succeeds
        BookingResponse secondAttempt = bookingService.createBooking(
                tripId, "idem-retry-after-cancel", req2, loserPrincipal);
        assertThat(secondAttempt.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(secondAttempt.seatCount()).isEqualTo(2);
    }

    @Test
    void sequential_retry_with_same_idempotency_key_returns_same_booking_and_reserves_once() {
        Long tripId = twoSeatRemainingTrip.getId();
        AuthPrincipal p1Principal = new AuthPrincipal(
                passenger1.getId(), passenger1.getEmail(), UserRole.PASSENGER);

        CreateBookingRequest req = new CreateBookingRequest(
                1,
                new LocationDto("10 Nguyễn Văn Linh, Đà Nẵng"),
                new LocationDto("20 Lê Lợi, Huế"));

        BookingResponse first = bookingService.createBooking(
                tripId, "idem-duplicate-key-001", req, p1Principal);
        BookingResponse second = bookingService.createBooking(
                tripId, "idem-duplicate-key-001", req, p1Principal);

        assertThat(second.id()).isEqualTo(first.id());
        assertThat(second.bookingCode()).isEqualTo(first.bookingCode());

        Trip reloadedTrip = tripRepository.findById(tripId).orElseThrow();
        // Started at 5 booked seats + 1 seat = 6 booked seats (not 7!)
        assertThat(reloadedTrip.getBookedSeats()).isEqualTo(6);
        assertThat(reloadedTrip.getStatus()).isEqualTo(TripStatus.PUBLISHED);
    }
}
