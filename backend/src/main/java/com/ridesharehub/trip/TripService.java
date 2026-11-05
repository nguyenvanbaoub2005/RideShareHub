package com.ridesharehub.trip;

import com.ridesharehub.auth.UserRole;
import com.ridesharehub.company.CompanyRepository;
import com.ridesharehub.company.TransportCompany;
import com.ridesharehub.company.Vehicle;
import com.ridesharehub.company.VehicleRepository;
import com.ridesharehub.driver.Driver;
import com.ridesharehub.driver.DriverRepository;
import com.ridesharehub.route.Route;
import com.ridesharehub.route.RouteRepository;
import com.ridesharehub.security.AuthPrincipal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

    public TripService(TripRepository tripRepository,
            CompanyRepository companyRepository,
            RouteRepository routeRepository,
            VehicleRepository vehicleRepository,
            DriverRepository driverRepository) {
        this.tripRepository = tripRepository;
        this.companyRepository = companyRepository;
        this.routeRepository = routeRepository;
        this.vehicleRepository = vehicleRepository;
        this.driverRepository = driverRepository;
    }

    // ================================================================== CRUD

    /** POST /api/v1/companies/{companyId}/trips */
    public TripResponse createTrip(Long companyId, TripRequest req, AuthPrincipal principal) {
        TransportCompany company = requireApprovedAndOwned(companyId, principal);

        Route route = requireRouteOfCompany(req.routeId(), companyId);
        Vehicle vehicle = requireVehicleOfCompany(req.vehicleId(), companyId);
        Driver driver = requireDriverOfCompany(req.driverId(), companyId);

        assertNoVehicleConflict(vehicle.getId(), null, req.departureTime());
        assertNoDriverConflict(driver.getId(), null, req.departureTime());

        Trip trip = tripRepository.save(
                new Trip(route, company, vehicle, driver, req.departureTime(), req.fare()));
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
        Trip trip = requireTripOfCompany(tripId, companyId);

        Vehicle vehicle = requireVehicleOfCompany(req.vehicleId(), companyId);
        Driver driver = requireDriverOfCompany(req.driverId(), companyId);

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

