package com.ridesharehub.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.ridesharehub.admin.dto.AdminDriverResponse;
import com.ridesharehub.admin.dto.AdminOverviewResponse;
import com.ridesharehub.admin.dto.AdminTripResponse;
import com.ridesharehub.admin.dto.AdminUserResponse;
import com.ridesharehub.admin.dto.PagedResponse;
import com.ridesharehub.admin.service.AdminDirectoryService;
import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.auth.enums.UserStatus;
import com.ridesharehub.auth.repository.UserRepository;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.enums.DriverStatus;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.rating.entity.Rating;
import com.ridesharehub.rating.repository.RatingRepository;
import com.ridesharehub.route.entity.Route;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.entity.TripIncident;
import com.ridesharehub.trip.enums.TripIncidentType;
import com.ridesharehub.trip.repository.TripIncidentRepository;
import com.ridesharehub.trip.repository.TripRepository;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AdminDirectoryServiceTest {

    @Mock CompanyRepository companyRepository;
    @Mock UserRepository userRepository;
    @Mock DriverRepository driverRepository;
    @Mock TripRepository tripRepository;
    @Mock BookingRepository bookingRepository;
    @Mock RatingRepository ratingRepository;
    @Mock TripIncidentRepository tripIncidentRepository;

    private AdminDirectoryService service;

    private User adminUser;
    private User ownerUser;
    private User paxUser;
    private User driverUser;
    private TransportCompany approvedCompany;
    private TransportCompany pendingCompany;
    private Driver d1;
    private Driver d2;
    private Trip activeTrip;
    private Trip completedTrip;
    private Booking completedBooking;
    private Rating rating;
    private TripIncident openIncident;

    @BeforeEach
    void setUp() {
        service = new AdminDirectoryService(
                companyRepository,
                userRepository,
                driverRepository,
                tripRepository,
                bookingRepository,
                ratingRepository,
                tripIncidentRepository);

        adminUser = new User("admin@rsh.vn", "hash", "System Admin", UserRole.ADMIN);
        setField(adminUser, "id", 1L);
        ownerUser = new User("owner@rsh.vn", "hash", "Chủ Xe A", UserRole.TRANSPORT_COMPANY);
        setField(ownerUser, "id", 2L);
        paxUser = new User("pax@rsh.vn", "hash", "Hành Khách Lan", UserRole.PASSENGER);
        setField(paxUser, "id", 3L);
        paxUser.updateProfile("Hành Khách Lan", "0935111222");
        driverUser = new User("driver@rsh.vn", "hash", "Tài Xế Hùng", UserRole.DRIVER);
        setField(driverUser, "id", 4L);
        driverUser.lock();

        approvedCompany = new TransportCompany(ownerUser, "Nhà Xe Miền Trung", "Đà Nẵng", "0905111111", "Ông A", "Biz");
        setField(approvedCompany, "id", 10L);
        approvedCompany.approve(adminUser);

        User pendingOwner = new User("pending@rsh.vn", "hash", "Chủ Xe B", UserRole.TRANSPORT_COMPANY);
        setField(pendingOwner, "id", 5L);
        pendingCompany = new TransportCompany(pendingOwner, "Nhà Xe Chờ Duyệt", "Huế", "0905222222", "Bà B", "Biz B");
        setField(pendingCompany, "id", 11L);

        Vehicle vehicle = new Vehicle(approvedCompany, "43A-55555", "Limousine", "Ford", "Transit", 9);
        setField(vehicle, "id", 20L);
        d1 = new Driver(approvedCompany, "Tài Xế Hùng", "0905333444", "D2-1111");
        setField(d1, "id", 30L);
        d1.updateStatus(DriverStatus.ON_TRIP);
        d2 = new Driver(approvedCompany, "Tài Xế Bình", "0905444555", "B2-2222");
        setField(d2, "id", 31L);
        d2.updateStatus(DriverStatus.INACTIVE);

        Route route = new Route(approvedCompany, "Đà Nẵng - Huế", "Đà Nẵng", "Huế", 120, new BigDecimal("150000"));
        setField(route, "id", 40L);

        activeTrip = new Trip(route, approvedCompany, vehicle, d1, Instant.now().plus(1, ChronoUnit.HOURS), new BigDecimal("150000"));
        setField(activeTrip, "id", 50L);
        activeTrip.publish();
        activeTrip.acceptAssignment();
        activeTrip.startTrip();

        completedTrip = new Trip(route, approvedCompany, vehicle, d2, Instant.now().plus(3, ChronoUnit.HOURS), new BigDecimal("150000"));
        setField(completedTrip, "id", 51L);
        completedTrip.publish();
        completedTrip.acceptAssignment();
        completedTrip.startTrip();
        completedTrip.completeTrip();

        completedBooking = new Booking(
                "BK-1001",
                completedTrip,
                paxUser,
                "key-1",
                2,
                "Đón A",
                new BigDecimal("16.05"),
                new BigDecimal("108.20"),
                "Trả B",
                new BigDecimal("16.46"),
                new BigDecimal("107.59"),
                new BigDecimal("300000"),
                true);
        setField(completedBooking, "id", 60L);
        completedBooking.markPickedUp();
        completedBooking.markCompleted();

        rating = new Rating(completedBooking, completedTrip, approvedCompany, d2, paxUser, 5, 5, 5, 5, "Tốt");
        setField(rating, "id", 70L);

        openIncident = new TripIncident(
                activeTrip, d1, driverUser.getId(), TripIncidentType.HEAVY_TRAFFIC, "Kẹt xe", null, null);
        setField(openIncident, "id", 80L);
    }

    @Test
    void getOverview_aggregatesAllPlatformMetricsCorrectly() {
        when(companyRepository.findAll()).thenReturn(List.of(approvedCompany, pendingCompany));
        when(userRepository.findAll()).thenReturn(List.of(adminUser, ownerUser, paxUser, driverUser));
        when(driverRepository.findAll()).thenReturn(List.of(d1, d2));
        when(tripRepository.findAll()).thenReturn(List.of(activeTrip, completedTrip));
        when(bookingRepository.findAll()).thenReturn(List.of(completedBooking));
        when(ratingRepository.findAllWithDetailsOrderByCreatedAtDesc()).thenReturn(List.of(rating));
        when(tripIncidentRepository.findAll()).thenReturn(List.of(openIncident));

        AdminOverviewResponse ov = service.getOverview();

        assertThat(ov.totalCompanies()).isEqualTo(2);
        assertThat(ov.pendingCompanies()).isEqualTo(1);
        assertThat(ov.approvedCompanies()).isEqualTo(1);
        assertThat(ov.totalUsers()).isEqualTo(4);
        assertThat(ov.lockedUsersCount()).isEqualTo(1);
        assertThat(ov.totalDrivers()).isEqualTo(2);
        assertThat(ov.onTripDrivers()).isEqualTo(1);
        assertThat(ov.inactiveDrivers()).isEqualTo(1);
        assertThat(ov.activeTrips()).isEqualTo(1);
        assertThat(ov.completedTrips()).isEqualTo(1);
        assertThat(ov.completedBookings()).isEqualTo(1);
        assertThat(ov.totalRatings()).isEqualTo(1);
        assertThat(ov.averageRating()).isEqualByComparingTo(new BigDecimal("5.00"));
        assertThat(ov.openIncidentsCount()).isEqualTo(1);
        assertThat(ov.pendingCompanyList()).hasSize(1);
        assertThat(ov.recentRatings()).hasSize(1);
    }

    @Test
    void listUsers_paginatesAndFiltersByRoleStatusAndQuery() {
        when(userRepository.findAll(any(Sort.class)))
                .thenReturn(List.of(driverUser, paxUser, ownerUser, adminUser));

        PagedResponse<AdminUserResponse> page0 = service.listUsers(0, 2, null, null, null);
        assertThat(page0.items()).hasSize(2);
        assertThat(page0.totalElements()).isEqualTo(4);
        assertThat(page0.totalPages()).isEqualTo(2);
        assertThat(page0.hasNext()).isTrue();
        assertThat(page0.hasPrevious()).isFalse();

        PagedResponse<AdminUserResponse> filtered = service.listUsers(0, 10, UserRole.PASSENGER, UserStatus.ACTIVE, "lan");
        assertThat(filtered.items()).hasSize(1);
        assertThat(filtered.items().get(0).email()).isEqualTo("pax@rsh.vn");
    }

    @Test
    void listDrivers_filtersAndIncludesTripCount() {
        when(tripRepository.findAll()).thenReturn(List.of(activeTrip, completedTrip));
        when(driverRepository.findAllWithCompanyOrderByCreatedAtDesc()).thenReturn(List.of(d1, d2));

        PagedResponse<AdminDriverResponse> onTrip = service.listDrivers(0, 10, DriverStatus.ON_TRIP, 10L, "hùng");
        assertThat(onTrip.items()).hasSize(1);
        assertThat(onTrip.items().get(0).totalTrips()).isEqualTo(1L);
    }

    @Test
    void listTrips_supportsStatusAndRejectsInvalidStatus() {
        when(tripRepository.findAllWithDetailsOrderByDepartureTimeDesc())
                .thenReturn(List.of(completedTrip, activeTrip));

        PagedResponse<AdminTripResponse> inProgress = service.listTrips(0, 10, "IN_PROGRESS", null, null);
        assertThat(inProgress.items()).hasSize(1);
        assertThat(inProgress.items().get(0).id()).isEqualTo(50L);

        assertThatThrownBy(() -> service.listTrips(0, 10, "BAD_STATUS", null, null))
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
