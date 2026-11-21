package com.ridesharehub.rating;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.rating.dto.CreateRatingRequest;
import com.ridesharehub.rating.dto.RatingResponse;
import com.ridesharehub.rating.entity.Rating;
import com.ridesharehub.rating.repository.RatingRepository;
import com.ridesharehub.rating.service.RatingService;
import com.ridesharehub.route.entity.Route;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.enums.TripStatus;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class RatingServiceTest {

    @Mock RatingRepository ratingRepository;
    @Mock BookingRepository bookingRepository;
    @Mock CompanyRepository companyRepository;

    private RatingService service;

    private static final AuthPrincipal PASSENGER_PRINCIPAL =
            new AuthPrincipal(101L, "pax@example.com", UserRole.PASSENGER);
    private static final AuthPrincipal OTHER_PASSENGER =
            new AuthPrincipal(102L, "other@example.com", UserRole.PASSENGER);
    private static final AuthPrincipal DRIVER_PRINCIPAL =
            new AuthPrincipal(30L, "driver@example.com", UserRole.DRIVER);

    private User passenger;
    private TransportCompany company;
    private Driver driver;
    private Trip trip;
    private Booking booking;

    @BeforeEach
    void setUp() {
        service = new RatingService(ratingRepository, bookingRepository, companyRepository);

        User owner = new User("company@example.com", "hash", "Owner", UserRole.TRANSPORT_COMPANY);
        setField(owner, "id", 10L);
        User admin = new User("admin@example.com", "hash", "Admin", UserRole.ADMIN);
        setField(admin, "id", 99L);
        passenger = new User("pax@example.com", "hash", "Nguyễn Thị Lan", UserRole.PASSENGER);
        setField(passenger, "id", 101L);

        company = new TransportCompany(owner, "Nhà xe Miền Trung", "Đà Nẵng", "0905123456", "Đại diện", "Info");
        setField(company, "id", 1L);
        company.approve(admin);

        Vehicle vehicle = new Vehicle(company, "43A-12345", "Limousine 7 chỗ", "Toyota", "Innova", 7);
        setField(vehicle, "id", 20L);
        driver = new Driver(company, "Trần Văn Tài", "0905999999", "D2-12345");
        setField(driver, "id", 30L);
        Route route = new Route(company, "Đà Nẵng - Huế", "Đà Nẵng", "Huế", 120, new BigDecimal("180000.00"));
        setField(route, "id", 40L);

        trip = new Trip(route, company, vehicle, driver, Instant.now().plus(2, ChronoUnit.HOURS), new BigDecimal("180000.00"));
        setField(trip, "id", 50L);
        trip.publish();
        trip.acceptAssignment();
        trip.startTrip();
        trip.completeTrip();

        booking = new Booking(
                "BK-RATE01",
                trip,
                passenger,
                "idem-rate-01",
                2,
                "Bến xe Đà Nẵng",
                new BigDecimal("16.054400"),
                new BigDecimal("108.202200"),
                "TP. Huế",
                new BigDecimal("16.463700"),
                new BigDecimal("107.590900"),
                new BigDecimal("360000.00"),
                true);
        setField(booking, "id", 200L);
        booking.markPickedUp();
        booking.markCompleted();
    }

    @Test
    void createRating_persistsRatingAndRecalculatesCompanyAverage() {
        when(bookingRepository.findByIdWithDetails(200L)).thenReturn(Optional.of(booking));
        when(ratingRepository.existsByBooking_Id(200L)).thenReturn(false);
        when(ratingRepository.saveAndFlush(any(Rating.class))).thenAnswer(inv -> {
            Rating r = inv.getArgument(0);
            setField(r, "id", 700L);
            return r;
        });
        when(ratingRepository.countByCompany_Id(1L)).thenReturn(3L);
        when(ratingRepository.averageScoreByCompanyId(1L)).thenReturn(4.6667);

        RatingResponse res = service.createRating(
                200L,
                new CreateRatingRequest(null, 5, 5, 4, "  Xe sạch sẽ, đón đúng giờ!  "),
                PASSENGER_PRINCIPAL);

        assertThat(res.id()).isEqualTo(700L);
        assertThat(res.score()).isEqualTo(5); // round((5+5+4)/3.0) = 5
        assertThat(res.tripScore()).isEqualTo(5);
        assertThat(res.driverScore()).isEqualTo(5);
        assertThat(res.companyScore()).isEqualTo(4);
        assertThat(res.comment()).isEqualTo("Xe sạch sẽ, đón đúng giờ!");
        assertThat(company.getRatingCount()).isEqualTo(3);
        assertThat(company.getAvgRating()).isEqualByComparingTo(new BigDecimal("4.67"));
        verify(companyRepository).save(company);
    }

    @Test
    void createRating_rejectsDuplicateRatingWith409() {
        when(bookingRepository.findByIdWithDetails(200L)).thenReturn(Optional.of(booking));
        when(ratingRepository.existsByBooking_Id(200L)).thenReturn(true);

        assertThatThrownBy(() -> service.createRating(
                        200L, new CreateRatingRequest(5, null, null, null, null), PASSENGER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void createRating_rejectsNonCompletedTripOrBookingWith409() {
        setField(trip, "status", TripStatus.IN_PROGRESS);
        when(bookingRepository.findByIdWithDetails(200L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.createRating(
                        200L, new CreateRatingRequest(5, null, null, null, null), PASSENGER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void createRating_rejectsOtherPassengerAndNonPassengerRoleWith403() {
        when(bookingRepository.findByIdWithDetails(200L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.createRating(
                        200L, new CreateRatingRequest(5, null, null, null, null), OTHER_PASSENGER))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        assertThatThrownBy(() -> service.createRating(
                        200L, new CreateRatingRequest(5, null, null, null, null), DRIVER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void createRating_rejectsOutOfRangeScoreAndOverlengthCommentWith422() {
        when(bookingRepository.findByIdWithDetails(200L)).thenReturn(Optional.of(booking));
        when(ratingRepository.existsByBooking_Id(200L)).thenReturn(false);

        assertThatThrownBy(() -> service.createRating(
                        200L, new CreateRatingRequest(6, null, null, null, null), PASSENGER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT));

        assertThatThrownBy(() -> service.createRating(
                        200L,
                        new CreateRatingRequest(5, 5, 5, 5, "a".repeat(501)),
                        PASSENGER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT));
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field f = target.getClass().getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
