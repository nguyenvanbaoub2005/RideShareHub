package com.ridesharehub.trip.service;

import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.company.enums.VehicleStatus;
import com.ridesharehub.company.repository.VehicleRepository;
import com.ridesharehub.driver.dto.DriverResponse;
import com.ridesharehub.driver.dto.DriverStatusRequest;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.enums.DriverStatus;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.route.entity.Route;
import com.ridesharehub.route.repository.RouteRepository;
import com.ridesharehub.security.AuthPrincipal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.ridesharehub.trip.dto.TripRequest;
import com.ridesharehub.trip.dto.TripResponse;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.repository.TripRepository;

@Service
@Transactional
public class TripService {

    /** Buffer window used for conflict detection: ±6 hours around departure. */
    private static final long CONFLICT_WINDOW_HOURS = 6;

    private final TripRepository tripRepository;
    private final CompanyRepository companyRepository;
    private final RouteRepository routeRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final BookingRepository bookingRepository;

    @Autowired
    public TripService(TripRepository tripRepository,
            CompanyRepository companyRepository,
            RouteRepository routeRepository,
            VehicleRepository vehicleRepository,
            DriverRepository driverRepository,
            BookingRepository bookingRepository) {
        this.tripRepository = tripRepository;
        this.companyRepository = companyRepository;
        this.routeRepository = routeRepository;
        this.vehicleRepository = vehicleRepository;
        this.driverRepository = driverRepository;
        this.bookingRepository = bookingRepository;
    }

    public TripService(TripRepository tripRepository,
            CompanyRepository companyRepository,
            RouteRepository routeRepository,
            VehicleRepository vehicleRepository,
            DriverRepository driverRepository) {
        this(tripRepository, companyRepository, routeRepository, vehicleRepository, driverRepository, null);
    }

    // ================================================================== CRUD

    /** POST /api/v1/companies/{companyId}/trips */
    public TripResponse createTrip(Long companyId, TripRequest req, AuthPrincipal principal) {
        TransportCompany company = requireApprovedAndOwned(companyId, principal);
        assertDepartureInFuture(req.departureTime());

        Route route = requireRouteOfCompany(req.routeId(), companyId);
        Vehicle vehicle = requireVehicleOfCompany(req.vehicleId(), companyId);
        Driver driver = requireDriverOfCompany(req.driverId(), companyId);

        assertVehicleOperational(vehicle);
        assertDriverOperational(driver);
        assertNoVehicleConflict(vehicle.getId(), null, req.departureTime());
        assertNoDriverConflict(driver.getId(), null, req.departureTime());

        Trip trip = tripRepository.save(
                new Trip(route, company, vehicle, driver, req.departureTime(), req.fare(), req.note()));
        return TripResponse.from(trip);
    }

    /** GET /api/v1/companies/{companyId}/trips */
    @Transactional(readOnly = true)
    public List<TripResponse> listTrips(Long companyId, AuthPrincipal principal) {
        requireOwnedOrAdmin(companyId, principal);
        return tripRepository.findAllByCompany_Id(companyId).stream()
                .map(TripResponse::from)
                .toList();
    }

    /** GET /api/v1/driver/trips — authenticated DRIVER lists own trips */
    @Transactional(readOnly = true)
    public List<TripResponse> listDriverTrips(AuthPrincipal principal) {
        Driver driver = driverRepository.findByUserId(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Driver profile not found for this user"));
        return tripRepository.findAllByDriver_IdOrderByDepartureTimeAsc(driver.getId()).stream()
                .map(TripResponse::from)
                .toList();
    }

    /** GET /api/v1/driver/me — authenticated DRIVER fetches own driver profile */
    @Transactional(readOnly = true)
    public DriverResponse getMyDriverProfile(AuthPrincipal principal) {
        Driver driver = driverRepository.findByUserId(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Driver profile not found for this user"));
        return DriverResponse.from(driver);
    }

    /** PUT /api/v1/driver/status — authenticated DRIVER toggles AVAILABLE / INACTIVE status */
    public DriverResponse updateMyDriverStatus(DriverStatusRequest req, AuthPrincipal principal) {
        Driver driver = driverRepository.findByUserId(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Driver profile not found for this user"));
        if (driver.getStatus() == DriverStatus.ON_TRIP) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Không thể đổi trạng thái khi đang thực hiện chuyến đi");
        }
        if (req.status() == DriverStatus.ON_TRIP) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "Tài xế chỉ có thể bật Sẵn sàng (AVAILABLE) hoặc Tạm nghỉ (INACTIVE)");
        }
        driver.updateStatus(req.status());
        return DriverResponse.from(driverRepository.save(driver));
    }

    /** GET /api/v1/companies/{companyId}/trips/{tripId} */
    @Transactional(readOnly = true)
    public TripResponse getTrip(Long companyId, Long tripId, AuthPrincipal principal) {
        requireOwnedOrAdmin(companyId, principal);
        return TripResponse.from(requireTripOfCompany(tripId, companyId));
    }

    /** PUT /api/v1/companies/{companyId}/trips/{tripId} — only DRAFT allowed */
    public TripResponse updateTrip(Long companyId, Long tripId,
            TripRequest req, AuthPrincipal principal) {
        requireApprovedAndOwned(companyId, principal);
        assertDepartureInFuture(req.departureTime());
        Trip trip = requireTripOfCompany(tripId, companyId);

        Vehicle vehicle = requireVehicleOfCompany(req.vehicleId(), companyId);
        Driver driver = requireDriverOfCompany(req.driverId(), companyId);

        assertVehicleOperational(vehicle);
        assertDriverOperational(driver);
        assertNoVehicleConflict(vehicle.getId(), tripId, req.departureTime());
        assertNoDriverConflict(driver.getId(), tripId, req.departureTime());

        try {
            trip.updateDetails(vehicle, driver, req.departureTime(), req.fare(), req.note());
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }
        return TripResponse.from(tripRepository.save(trip));
    }

    /** POST /api/v1/companies/{companyId}/trips/{tripId}/publish */
    public TripResponse publishTrip(Long companyId, Long tripId, AuthPrincipal principal) {
        requireApprovedAndOwned(companyId, principal);
        Trip trip = requireTripOfCompany(tripId, companyId);
        assertDepartureInFuture(trip.getDepartureTime());
        assertVehicleOperational(trip.getVehicle());
        assertDriverOperational(trip.getDriver());
        assertNoVehicleConflict(trip.getVehicle().getId(), trip.getId(), trip.getDepartureTime());
        assertNoDriverConflict(trip.getDriver().getId(), trip.getId(), trip.getDepartureTime());
        try {
            trip.publish();
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }
        return TripResponse.from(tripRepository.save(trip));
    }

    /** POST /api/v1/companies/{companyId}/trips/{tripId}/cancel */
    public TripResponse cancelTrip(Long companyId, Long tripId, AuthPrincipal principal) {
        requireApprovedAndOwned(companyId, principal);
        Trip trip = requireTripOfCompany(tripId, companyId);
        try {
            trip.cancel();
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }
        if (bookingRepository != null) {
            List<Booking> activeBookings = bookingRepository.findAllByTrip_IdOrderByCreatedAtAsc(tripId)
                    .stream()
                    .filter(b -> b.getStatus() == BookingStatus.PENDING
                            || b.getStatus() == BookingStatus.CONFIRMED)
                    .toList();
            for (Booking booking : activeBookings) {
                booking.cancel("Chuyến xe bị hủy bởi nhà xe");
                bookingRepository.save(booking);
            }
        }
        return TripResponse.from(tripRepository.save(trip));
    }

    // ================================================================== helpers

    private TransportCompany requireCompany(Long companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));
    }

    private TransportCompany requireOwnedOrAdmin(Long companyId, AuthPrincipal principal) {
        TransportCompany company = requireCompany(companyId);
        boolean isAdmin = principal.role() == UserRole.ADMIN;
        boolean isOwner = company.getOwner().getId().equals(principal.userId());
        if (!isAdmin && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied to this company's resources");
        }
        return company;
    }

    private TransportCompany requireApprovedAndOwned(Long companyId, AuthPrincipal principal) {
        TransportCompany company = requireOwnedOrAdmin(companyId, principal);
        if (!company.isApproved()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Company must be APPROVED before managing trips");
        }
        return company;
    }

    private Trip requireTripOfCompany(Long tripId, Long companyId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        if (!trip.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Trip does not belong to this company");
        }
        return trip;
    }

    private Route requireRouteOfCompany(Long routeId, Long companyId) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found"));
        if (!route.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Route does not belong to this company");
        }
        return route;
    }

    private Vehicle requireVehicleOfCompany(Long vehicleId, Long companyId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found"));
        if (!vehicle.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Vehicle does not belong to this company");
        }
        return vehicle;
    }

    private Driver requireDriverOfCompany(Long driverId, Long companyId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found"));
        if (!driver.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Driver does not belong to this company");
        }
        return driver;
    }

    private void assertVehicleOperational(Vehicle vehicle) {
        if (vehicle.getStatus() == VehicleStatus.MAINTENANCE
                || vehicle.getStatus() == VehicleStatus.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Phương tiện đang bảo dưỡng hoặc ngưng hoạt động, không thể gán cho chuyến đi");
        }
    }

    private void assertDriverOperational(Driver driver) {
        if (driver.getStatus() == DriverStatus.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tài xế đang ở trạng thái ngưng hoạt động, không thể gán cho chuyến đi");
        }
    }

    /** Throws CONFLICT if the vehicle has an overlapping active trip. */
    private void assertNoVehicleConflict(Long vehicleId, Long excludeTripId, Instant departure) {
        Long exclude = excludeTripId != null ? excludeTripId : -1L;
        Instant from = departure.minus(CONFLICT_WINDOW_HOURS, ChronoUnit.HOURS);
        Instant to = departure.plus(CONFLICT_WINDOW_HOURS, ChronoUnit.HOURS);
        if (tripRepository.existsVehicleConflict(vehicleId, exclude, from, to)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Vehicle is already assigned to another active trip in this time window");
        }
    }

    private void assertDepartureInFuture(Instant departureTime) {
        if (departureTime == null || !departureTime.isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Thời gian khởi hành phải nằm ở tương lai.");
        }
    }

    /** Throws CONFLICT if the driver has an overlapping active trip. */
    private void assertNoDriverConflict(Long driverId, Long excludeTripId, Instant departure) {
        Long exclude = excludeTripId != null ? excludeTripId : -1L;
        Instant from = departure.minus(CONFLICT_WINDOW_HOURS, ChronoUnit.HOURS);
        Instant to = departure.plus(CONFLICT_WINDOW_HOURS, ChronoUnit.HOURS);
        if (tripRepository.existsDriverConflict(driverId, exclude, from, to)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Driver is already assigned to another active trip in this time window");
        }
    }
}

