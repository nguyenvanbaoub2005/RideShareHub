package com.ridesharehub.admin.service;

import com.ridesharehub.admin.dto.AdminDriverResponse;
import com.ridesharehub.admin.dto.AdminOverviewResponse;
import com.ridesharehub.admin.dto.AdminOverviewResponse.PendingCompanyItem;
import com.ridesharehub.admin.dto.AdminOverviewResponse.RecentRatingItem;
import com.ridesharehub.admin.dto.AdminTripResponse;
import com.ridesharehub.admin.dto.AdminUserResponse;
import com.ridesharehub.admin.dto.PagedResponse;
import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.auth.enums.UserStatus;
import com.ridesharehub.auth.repository.UserRepository;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.enums.CompanyStatus;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.enums.DriverStatus;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.rating.entity.Rating;
import com.ridesharehub.rating.repository.RatingRepository;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.entity.TripIncident;
import com.ridesharehub.trip.enums.TripIncidentStatus;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.repository.TripIncidentRepository;
import com.ridesharehub.trip.repository.TripRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * SP4-P1-01: Read-only Admin dashboard KPIs and paginated directory queries.
 */
@Service
@Transactional(readOnly = true)
public class AdminDirectoryService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;
    private final BookingRepository bookingRepository;
    private final RatingRepository ratingRepository;
    private final TripIncidentRepository tripIncidentRepository;

    public AdminDirectoryService(
            CompanyRepository companyRepository,
            UserRepository userRepository,
            DriverRepository driverRepository,
            TripRepository tripRepository,
            BookingRepository bookingRepository,
            RatingRepository ratingRepository,
            TripIncidentRepository tripIncidentRepository) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.driverRepository = driverRepository;
        this.tripRepository = tripRepository;
        this.bookingRepository = bookingRepository;
        this.ratingRepository = ratingRepository;
        this.tripIncidentRepository = tripIncidentRepository;
    }

    public AdminOverviewResponse getOverview() {
        List<TransportCompany> companies = companyRepository.findAll();
        List<User> users = userRepository.findAll();
        List<Driver> drivers = driverRepository.findAll();
        List<Trip> trips = tripRepository.findAll();
        List<Booking> bookings = bookingRepository.findAll();
        List<Rating> ratings = ratingRepository.findAllWithDetailsOrderByCreatedAtDesc();
        List<TripIncident> incidents = tripIncidentRepository.findAll();

        long pendingCompanies = companies.stream().filter(c -> c.getStatus() == CompanyStatus.PENDING).count();
        long approvedCompanies = companies.stream().filter(c -> c.getStatus() == CompanyStatus.APPROVED).count();
        long rejectedCompanies = companies.stream().filter(c -> c.getStatus() == CompanyStatus.REJECTED).count();

        long passengerCount = users.stream().filter(u -> u.getRole() == UserRole.PASSENGER).count();
        long driverUserCount = users.stream().filter(u -> u.getRole() == UserRole.DRIVER).count();
        long companyOwnerCount = users.stream().filter(u -> u.getRole() == UserRole.TRANSPORT_COMPANY).count();
        long adminCount = users.stream().filter(u -> u.getRole() == UserRole.ADMIN).count();
        long lockedUsersCount = users.stream().filter(u -> u.getStatus() == UserStatus.LOCKED).count();

        long availableDrivers = drivers.stream().filter(d -> d.getStatus() == DriverStatus.AVAILABLE).count();
        long onTripDrivers = drivers.stream().filter(d -> d.getStatus() == DriverStatus.ON_TRIP).count();
        long inactiveDrivers = drivers.stream().filter(d -> d.getStatus() == DriverStatus.INACTIVE).count();

        long activeTrips = trips.stream().filter(t -> t.getStatus() == TripStatus.IN_PROGRESS).count();
        long upcomingTrips = trips.stream()
                .filter(t -> t.getStatus() == TripStatus.PUBLISHED || t.getStatus() == TripStatus.FULL)
                .count();
        long completedTrips = trips.stream().filter(t -> t.getStatus() == TripStatus.COMPLETED).count();
        long cancelledTrips = trips.stream().filter(t -> t.getStatus() == TripStatus.CANCELLED).count();
        long draftTrips = trips.stream().filter(t -> t.getStatus() == TripStatus.DRAFT).count();

        long confirmedBookings = bookings.stream().filter(b -> b.getStatus() == BookingStatus.CONFIRMED).count();
        long pickedUpBookings = bookings.stream().filter(b -> b.getStatus() == BookingStatus.PICKED_UP).count();
        long completedBookings = bookings.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count();
        long cancelledBookings = bookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count();
        long noShowBookings = bookings.stream().filter(b -> b.getStatus() == BookingStatus.NO_SHOW).count();

        long openIncidentsCount = incidents.stream()
                .filter(i -> i.getStatus() != TripIncidentStatus.RESOLVED)
                .count();

        BigDecimal averageRating = ratings.isEmpty()
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.valueOf(ratings.stream().mapToInt(Rating::getScore).average().orElse(0.0))
                        .setScale(2, RoundingMode.HALF_UP);

        List<PendingCompanyItem> pendingList = companies.stream()
                .filter(c -> c.getStatus() == CompanyStatus.PENDING)
                .sorted(Comparator.comparing(TransportCompany::getCreatedAt).reversed())
                .limit(5)
                .map(c -> new PendingCompanyItem(
                        c.getId(),
                        c.getName(),
                        c.getRepresentativeName(),
                        c.getContactPhone(),
                        c.getContactEmail(),
                        c.getAddress(),
                        c.getCreatedAt()))
                .toList();

        List<RecentRatingItem> recentRatings = ratings.stream()
                .limit(5)
                .map(r -> new RecentRatingItem(
                        r.getId(),
                        r.getBooking().getBookingCode(),
                        r.getCompany().getName(),
                        r.getDriver().getFullName(),
                        r.getPassenger().getFullName(),
                        r.getScore(),
                        r.getComment(),
                        r.getCreatedAt()))
                .toList();

        return new AdminOverviewResponse(
                companies.size(),
                pendingCompanies,
                approvedCompanies,
                rejectedCompanies,
                users.size(),
                passengerCount,
                driverUserCount,
                companyOwnerCount,
                adminCount,
                lockedUsersCount,
                drivers.size(),
                availableDrivers,
                onTripDrivers,
                inactiveDrivers,
                trips.size(),
                activeTrips,
                upcomingTrips,
                completedTrips,
                cancelledTrips,
                draftTrips,
                bookings.size(),
                confirmedBookings,
                pickedUpBookings,
                completedBookings,
                cancelledBookings,
                noShowBookings,
                ratings.size(),
                averageRating,
                openIncidentsCount,
                pendingList,
                recentRatings);
    }

    public PagedResponse<AdminUserResponse> listUsers(
            int page,
            int size,
            UserRole role,
            UserStatus status,
            String query) {
        String normalizedQuery = normalizeQuery(query);
        List<AdminUserResponse> matched = userRepository
                .findAll(Sort.by(Sort.Direction.DESC, "id"))
                .stream()
                .filter(u -> role == null || u.getRole() == role)
                .filter(u -> status == null || u.getStatus() == status)
                .filter(u -> matchesUser(u, normalizedQuery))
                .map(AdminUserResponse::from)
                .toList();
        return PagedResponse.of(matched, page, size);
    }

    public PagedResponse<AdminDriverResponse> listDrivers(
            int page,
            int size,
            DriverStatus status,
            Long companyId,
            String query) {
        String normalizedQuery = normalizeQuery(query);
        Map<Long, Long> tripCountsByDriverId = tripRepository.findAll().stream()
                .filter(t -> t.getDriver() != null)
                .collect(Collectors.groupingBy(t -> t.getDriver().getId(), Collectors.counting()));

        List<AdminDriverResponse> matched = driverRepository.findAllWithCompanyOrderByCreatedAtDesc()
                .stream()
                .filter(d -> status == null || d.getStatus() == status)
                .filter(d -> companyId == null || Objects.equals(d.getCompany().getId(), companyId))
                .filter(d -> matchesDriver(d, normalizedQuery))
                .map(d -> AdminDriverResponse.from(d, tripCountsByDriverId.getOrDefault(d.getId(), 0L)))
                .toList();
        return PagedResponse.of(matched, page, size);
    }

    public PagedResponse<AdminTripResponse> listTrips(
            int page,
            int size,
            String status,
            Long companyId,
            String query) {
        String normalizedQuery = normalizeQuery(query);
        TripStatusFilter statusFilter = parseTripStatusFilter(status);

        List<AdminTripResponse> matched = tripRepository.findAllWithDetailsOrderByDepartureTimeDesc()
                .stream()
                .filter(t -> statusFilter.matches(t.getStatus()))
                .filter(t -> companyId == null || Objects.equals(t.getCompany().getId(), companyId))
                .filter(t -> matchesTrip(t, normalizedQuery))
                .map(AdminTripResponse::from)
                .toList();
        return PagedResponse.of(matched, page, size);
    }

    private static String normalizeQuery(String query) {
        return (query == null || query.isBlank()) ? null : query.strip().toLowerCase(Locale.ROOT);
    }

    private static boolean matchesUser(User u, String q) {
        if (q == null) return true;
        return contains(u.getFullName(), q)
                || contains(u.getEmail(), q)
                || contains(u.getPhone(), q)
                || contains(String.valueOf(u.getId()), q);
    }

    private static boolean matchesDriver(Driver d, String q) {
        if (q == null) return true;
        return contains(d.getFullName(), q)
                || contains(d.getPhone(), q)
                || contains(d.getLicenseNumber(), q)
                || contains(d.getCompany().getName(), q)
                || contains(String.valueOf(d.getId()), q);
    }

    private static boolean matchesTrip(Trip t, String q) {
        if (q == null) return true;
        return contains(String.valueOf(t.getId()), q)
                || contains(t.getRoute().getName(), q)
                || contains(t.getRoute().getOrigin(), q)
                || contains(t.getRoute().getDestination(), q)
                || contains(t.getCompany().getName(), q)
                || contains(t.getDriver().getFullName(), q)
                || contains(t.getVehicle().getPlateNumber(), q);
    }

    private static boolean contains(String source, String q) {
        return source != null && source.toLowerCase(Locale.ROOT).contains(q);
    }

    private sealed interface TripStatusFilter permits AllTripFilter, UpcomingTripFilter, ExactTripFilter {
        boolean matches(TripStatus s);
    }

    private record AllTripFilter() implements TripStatusFilter {
        @Override public boolean matches(TripStatus s) { return true; }
    }

    private record UpcomingTripFilter() implements TripStatusFilter {
        @Override public boolean matches(TripStatus s) {
            return s == TripStatus.PUBLISHED || s == TripStatus.FULL;
        }
    }

    private record ExactTripFilter(TripStatus target) implements TripStatusFilter {
        @Override public boolean matches(TripStatus s) { return s == target; }
    }

    private static TripStatusFilter parseTripStatusFilter(String raw) {
        if (raw == null || raw.isBlank() || "ALL".equalsIgnoreCase(raw.strip())) {
            return new AllTripFilter();
        }
        String trimmed = raw.strip().toUpperCase(Locale.ROOT);
        if ("UPCOMING".equals(trimmed)) {
            return new UpcomingTripFilter();
        }
        try {
            return new ExactTripFilter(TripStatus.valueOf(trimmed));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT,
                    "Invalid trip status filter: " + raw);
        }
    }
}
