package com.ridesharehub.booking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.auth.repository.UserRepository;
import com.ridesharehub.booking.dto.BookingResponse;
import com.ridesharehub.booking.dto.CancelBookingRequest;
import com.ridesharehub.booking.dto.CreateBookingRequest;
import com.ridesharehub.booking.dto.LocationDto;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.route.entity.Route;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.repository.TripRepository;
import com.ridesharehub.trip.service.TripSearchService;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * SP2-P2-01 & SP2-P2-02 unit tests for BookingService.
 */
@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock BookingRepository bookingRepository;
    @Mock TripRepository tripRepository;
    @Mock UserRepository userRepository;

    private TripSearchService tripSearchService;
    private BookingService service;

    private static final AuthPrincipal PASSENGER_PRINCIPAL =
            new AuthPrincipal(101L, "passenger1@example.com", UserRole.PASSENGER);
    private static final AuthPrincipal OTHER_PASSENGER_PRINCIPAL =
            new AuthPrincipal(102L, "passenger2@example.com", UserRole.PASSENGER);
    private static final AuthPrincipal COMPANY_PRINCIPAL =
            new AuthPrincipal(10L, "company@example.com", UserRole.TRANSPORT_COMPANY);
    private static final AuthPrincipal ADMIN_PRINCIPAL =
            new AuthPrincipal(99L, "admin@example.com", UserRole.ADMIN);

    private User passenger;
    private TransportCompany company;
    private Vehicle vehicle;
    private Driver driver;
    private Route route;
    private Trip publishedTrip;

    @BeforeEach
    void setUp() {
        tripSearchService = new TripSearchService(tripRepository);
        service = new BookingService(bookingRepository, tripRepository, userRepository, tripSearchService, true);

        User owner = new User("company@example.com", "hash", "Company Owner", UserRole.TRANSPORT_COMPANY);
        setId(owner, 10L);

        User admin = new User("admin@example.com", "hash", "Admin", UserRole.ADMIN);
        setId(admin, 99L);

        passenger = new User("passenger1@example.com", "hash", "Nguyễn Hành Khách", UserRole.PASSENGER);
        setId(passenger, 101L);

        company = new TransportCompany(owner, "Nhà Xe A", "123 Lê Duẩn", "0905123456", "Đại diện A", "Biz A");
        setId(company, 1L);
        company.approve(admin);

        vehicle = new Vehicle(company, "43A-12345", "Limousine 7 chỗ", "Toyota", "Innova", 4);
        setId(vehicle, 20L);

        driver = new Driver(company, "Tài Xế A", "0905999999", "B2-123456");
        setId(driver, 30L);

        route = new Route(company, "Đà Nẵng - Huế", "Đà Nẵng", "Huế", 120, new BigDecimal("150000.00"));
        setId(route, 40L);

        publishedTrip = new Trip(
                route,
                company,
                vehicle,
                driver,
                Instant.now().plus(1, ChronoUnit.DAYS),
                new BigDecimal("150000.00"));
        setId(publishedTrip, 500L);
        publishedTrip.publish();
    }

    // ================================================================== Create Booking

    @Nested
    class CreateBooking {

        @Test
        void creates_confirmed_booking_and_reserves_seats() {
            CreateBookingRequest req = new CreateBookingRequest(
                    2,
                    new LocationDto("123 Hải Châu, Đà Nẵng", new BigDecimal("16.0678"), new BigDecimal("108.2208")),
                    new LocationDto("45 Lê Lợi, Huế", new BigDecimal("16.4637"), new BigDecimal("107.5909")));

            when(bookingRepository.findByPassenger_IdAndIdempotencyKey(101L, "idem-key-0001"))
                    .thenReturn(Optional.empty());
            when(userRepository.findById(101L)).thenReturn(Optional.of(passenger));
            when(tripRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(publishedTrip));
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
                Booking b = inv.getArgument(0);
                setId(b, 900L);
                return b;
            });

            BookingResponse resp = service.createBooking(500L, "idem-key-0001", req, PASSENGER_PRINCIPAL);

            assertThat(resp.id()).isEqualTo(900L);
            assertThat(resp.status()).isEqualTo(BookingStatus.CONFIRMED);
            assertThat(resp.seatCount()).isEqualTo(2);
            assertThat(resp.fareEstimate()).isEqualByComparingTo("300000.00");
            assertThat(resp.pickup().label()).isEqualTo("123 Hải Châu, Đà Nẵng");
            assertThat(resp.dropoff().label()).isEqualTo("45 Lê Lợi, Huế");
            assertThat(publishedTrip.getBookedSeats()).isEqualTo(2);
            assertThat(publishedTrip.getAvailableSeats()).isEqualTo(2);
            assertThat(publishedTrip.getStatus()).isEqualTo(TripStatus.PUBLISHED);
        }

        @Test
        void transitions_trip_to_full_when_last_seats_are_booked() {
            CreateBookingRequest req = new CreateBookingRequest(
                    4,
                    new LocationDto("Bến xe Đà Nẵng"),
                    new LocationDto("Bến xe Huế"));

            when(bookingRepository.findByPassenger_IdAndIdempotencyKey(101L, "idem-key-full"))
                    .thenReturn(Optional.empty());
            when(userRepository.findById(101L)).thenReturn(Optional.of(passenger));
            when(tripRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(publishedTrip));
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
                Booking b = inv.getArgument(0);
                setId(b, 901L);
                return b;
            });

            BookingResponse resp = service.createBooking(500L, "idem-key-full", req, PASSENGER_PRINCIPAL);

            assertThat(resp.status()).isEqualTo(BookingStatus.CONFIRMED);
            assertThat(publishedTrip.getBookedSeats()).isEqualTo(4);
            assertThat(publishedTrip.getAvailableSeats()).isEqualTo(0);
            assertThat(publishedTrip.getStatus()).isEqualTo(TripStatus.FULL);
        }

        @Test
        void idempotent_retry_returns_original_booking_without_reserving_seats_again() {
            Booking existing = new Booking(
                    "BK-EXISTING",
                    publishedTrip,
                    passenger,
                    "idem-key-retry",
                    2,
                    "Điểm đón A",
                    null,
                    null,
                    "Điểm trả B",
                    null,
                    null,
                    new BigDecimal("300000.00"),
                    true);
            setId(existing, 777L);

            when(bookingRepository.findByPassenger_IdAndIdempotencyKey(101L, "idem-key-retry"))
                    .thenReturn(Optional.of(existing));

            CreateBookingRequest req = new CreateBookingRequest(
                    2,
                    new LocationDto("Điểm đón A"),
                    new LocationDto("Điểm trả B"));

            BookingResponse resp = service.createBooking(500L, "idem-key-retry", req, PASSENGER_PRINCIPAL);

            assertThat(resp.id()).isEqualTo(777L);
            assertThat(resp.bookingCode()).isEqualTo("BK-EXISTING");
            assertThat(publishedTrip.getBookedSeats()).isEqualTo(0); // not incremented again
            verify(tripRepository, never()).findByIdForUpdate(any());
            verify(bookingRepository, never()).save(any());
        }

        @Test
        void rejects_when_requested_seats_exceed_available_capacity() {
            publishedTrip.reserveSeats(3); // 1 seat remaining out of 4

            CreateBookingRequest req = new CreateBookingRequest(
                    2,
                    new LocationDto("Điểm đón A"),
                    new LocationDto("Điểm trả B"));

            when(bookingRepository.findByPassenger_IdAndIdempotencyKey(101L, "idem-key-over"))
                    .thenReturn(Optional.empty());
            when(userRepository.findById(101L)).thenReturn(Optional.of(passenger));
            when(tripRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(publishedTrip));

            assertThatThrownBy(() -> service.createBooking(500L, "idem-key-over", req, PASSENGER_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                            .isEqualTo(HttpStatus.CONFLICT));

            assertThat(publishedTrip.getBookedSeats()).isEqualTo(3);
            verify(bookingRepository, never()).save(any());
        }

        @Test
        void rejects_booking_on_non_published_trip() {
            Trip draftTrip = new Trip(
                    route,
                    company,
                    vehicle,
                    driver,
                    Instant.now().plus(2, ChronoUnit.DAYS),
                    new BigDecimal("150000.00"));
            setId(draftTrip, 501L);

            CreateBookingRequest req = new CreateBookingRequest(
                    1,
                    new LocationDto("Điểm đón A"),
                    new LocationDto("Điểm trả B"));

            when(bookingRepository.findByPassenger_IdAndIdempotencyKey(101L, "idem-key-draft"))
                    .thenReturn(Optional.empty());
            when(userRepository.findById(101L)).thenReturn(Optional.of(passenger));
            when(tripRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(draftTrip));

            assertThatThrownBy(() -> service.createBooking(501L, "idem-key-draft", req, PASSENGER_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                            .isEqualTo(HttpStatus.CONFLICT));
        }

        @Test
        void rejects_non_passenger_role() {
            CreateBookingRequest req = new CreateBookingRequest(
                    1,
                    new LocationDto("Điểm đón A"),
                    new LocationDto("Điểm trả B"));

            assertThatThrownBy(() -> service.createBooking(500L, "idem-key-role", req, COMPANY_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                            .isEqualTo(HttpStatus.FORBIDDEN));
        }

        @Test
        void rejects_missing_or_short_idempotency_key() {
            CreateBookingRequest req = new CreateBookingRequest(
                    1,
                    new LocationDto("Điểm đón A"),
                    new LocationDto("Điểm trả B"));

            assertThatThrownBy(() -> service.createBooking(500L, "short", req, PASSENGER_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                            .isEqualTo(HttpStatus.BAD_REQUEST));
        }

        @Test
        void rejects_identical_pickup_and_dropoff_addresses() {
            CreateBookingRequest req = new CreateBookingRequest(
                    1,
                    new LocationDto("123 Nguyễn Văn Linh"),
                    new LocationDto("123 nguyễn văn linh"));

            assertThatThrownBy(() -> service.createBooking(500L, "idem-key-same", req, PASSENGER_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode().value())
                            .isEqualTo(422));
        }
    }

    // ================================================================== Cancel & No-Show

    @Nested
    class CancelAndNoShow {

        @Test
        void cancels_confirmed_booking_and_releases_seats_once_reopening_full_trip() {
            publishedTrip.reserveSeats(4); // Trip becomes FULL
            assertThat(publishedTrip.getStatus()).isEqualTo(TripStatus.FULL);

            Booking booking = new Booking(
                    "BK-CANCEL01",
                    publishedTrip,
                    passenger,
                    "idem-key-c1",
                    2,
                    "Điểm đón A",
                    null,
                    null,
                    "Điểm trả B",
                    null,
                    null,
                    new BigDecimal("300000.00"),
                    true);
            setId(booking, 800L);

            when(bookingRepository.findByIdWithDetails(800L)).thenReturn(Optional.of(booking));
            when(tripRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(publishedTrip));
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

            BookingResponse resp = service.cancelBooking(
                    800L, "cancel-key-01", new CancelBookingRequest("Đổi lịch trình"), PASSENGER_PRINCIPAL);

            assertThat(resp.status()).isEqualTo(BookingStatus.CANCELLED);
            assertThat(resp.cancelReason()).isEqualTo("Đổi lịch trình");
            assertThat(publishedTrip.getBookedSeats()).isEqualTo(2);
            assertThat(publishedTrip.getAvailableSeats()).isEqualTo(2);
            assertThat(publishedTrip.getStatus()).isEqualTo(TripStatus.PUBLISHED);
        }

        @Test
        void duplicate_cancel_on_already_cancelled_booking_is_rejected_and_does_not_release_seats_twice() {
            publishedTrip.reserveSeats(2);
            Booking booking = new Booking(
                    "BK-CANCEL02",
                    publishedTrip,
                    passenger,
                    "idem-key-c2",
                    2,
                    "Điểm đón A",
                    null,
                    null,
                    "Điểm trả B",
                    null,
                    null,
                    new BigDecimal("300000.00"),
                    true);
            setId(booking, 801L);
            booking.cancel("Hủy lần 1");
            publishedTrip.releaseSeats(2); // 0 booked seats now

            // Another passenger books 2 seats
            publishedTrip.reserveSeats(2);

            when(bookingRepository.findByIdWithDetails(801L)).thenReturn(Optional.of(booking));
            when(tripRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(publishedTrip));

            assertThatThrownBy(() -> service.cancelBooking(
                    801L, "cancel-key-02", new CancelBookingRequest("Hủy lần 2"), PASSENGER_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                            .isEqualTo(HttpStatus.CONFLICT));

            // Other passenger's 2 seats remain intact!
            assertThat(publishedTrip.getBookedSeats()).isEqualTo(2);
        }

        @Test
        void rejects_cancellation_by_other_passenger() {
            Booking booking = new Booking(
                    "BK-OTHER",
                    publishedTrip,
                    passenger,
                    "idem-key-other",
                    1,
                    "Điểm đón A",
                    null,
                    null,
                    "Điểm trả B",
                    null,
                    null,
                    new BigDecimal("150000.00"),
                    true);
            setId(booking, 802L);

            when(bookingRepository.findByIdWithDetails(802L)).thenReturn(Optional.of(booking));

            assertThatThrownBy(() -> service.cancelBooking(
                    802L, "cancel-key-03", null, OTHER_PASSENGER_PRINCIPAL))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                            .isEqualTo(HttpStatus.FORBIDDEN));
        }

        @Test
        void company_owner_can_mark_no_show_and_release_seats() {
            publishedTrip.reserveSeats(2);
            Booking booking = new Booking(
                    "BK-NOSHOW",
                    publishedTrip,
                    passenger,
                    "idem-key-ns",
                    2,
                    "Điểm đón A",
                    null,
                    null,
                    "Điểm trả B",
                    null,
                    null,
                    new BigDecimal("300000.00"),
                    true);
            setId(booking, 803L);

            when(bookingRepository.findByIdWithDetails(803L)).thenReturn(Optional.of(booking));
            when(tripRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(publishedTrip));
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

            BookingResponse resp = service.markNoShow(
                    803L, new CancelBookingRequest("Khách không có mặt"), COMPANY_PRINCIPAL);

            assertThat(resp.status()).isEqualTo(BookingStatus.NO_SHOW);
            assertThat(publishedTrip.getBookedSeats()).isEqualTo(0);
        }
    }

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
