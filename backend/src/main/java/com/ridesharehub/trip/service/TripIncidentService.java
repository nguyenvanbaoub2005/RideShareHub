package com.ridesharehub.trip.service;

import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.ReportIncidentRequest;
import com.ridesharehub.trip.dto.ResolveIncidentRequest;
import com.ridesharehub.trip.dto.TripIncidentResponse;
import com.ridesharehub.trip.dto.TripMonitoringSummaryResponse;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.entity.TripIncident;
import com.ridesharehub.trip.entity.TripStop;
import com.ridesharehub.trip.enums.DriverAssignmentStatus;
import com.ridesharehub.trip.enums.TripIncidentStatus;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.enums.TripStopStatus;
import com.ridesharehub.trip.repository.TripIncidentRepository;
import com.ridesharehub.trip.repository.TripRepository;
import com.ridesharehub.trip.repository.TripStopRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * SP4-P2-01 & SP4-P2-02:
 * Driver incident reporting + Company & Admin live trip monitoring summaries.
 */
@Service
@Transactional
public class TripIncidentService {

    private static final long LOCATION_STALE_SECONDS = 45L;

    private final TripIncidentRepository tripIncidentRepository;
    private final TripRepository tripRepository;
    private final TripStopRepository tripStopRepository;
    private final DriverRepository driverRepository;
    private final CompanyRepository companyRepository;
    private final TripExecutionService tripExecutionService;

    public TripIncidentService(
            TripIncidentRepository tripIncidentRepository,
            TripRepository tripRepository,
            TripStopRepository tripStopRepository,
            DriverRepository driverRepository,
            CompanyRepository companyRepository,
            TripExecutionService tripExecutionService) {
        this.tripIncidentRepository = tripIncidentRepository;
        this.tripRepository = tripRepository;
        this.tripStopRepository = tripStopRepository;
        this.driverRepository = driverRepository;
        this.companyRepository = companyRepository;
        this.tripExecutionService = tripExecutionService;
    }

    // ================================================================== SP4-P2-01: Driver Incident Report

    public TripIncidentResponse reportIncident(
            Long tripId,
            ReportIncidentRequest req,
            AuthPrincipal principal) {
        Trip trip = requireAssignedDriverTrip(tripId, principal);
        if (trip.getStatus() == TripStatus.CANCELLED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể báo cáo sự cố cho chuyến đi đã bị hủy");
        }

        BigDecimal lat = req.latitude() != null ? req.latitude() : trip.getLastLat();
        BigDecimal lng = req.longitude() != null ? req.longitude() : trip.getLastLng();

        TripIncident incident = new TripIncident(
                trip,
                trip.getDriver(),
                principal.userId(),
                req.incidentType(),
                req.description().strip(),
                lat,
                lng);
        TripIncident saved = tripIncidentRepository.save(incident);

        if (tripExecutionService != null) {
            tripExecutionService.broadcastIncidentReported(trip);
        }
        return TripIncidentResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<TripIncidentResponse> listDriverTripIncidents(Long tripId, AuthPrincipal principal) {
        requireAssignedDriverTrip(tripId, principal);
        return tripIncidentRepository.findAllByTripIdWithDetails(tripId).stream()
                .map(TripIncidentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TripIncidentResponse> listTripIncidents(Long tripId, AuthPrincipal principal) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        ensureTripIncidentViewer(trip, principal);
        return tripIncidentRepository.findAllByTripIdWithDetails(tripId).stream()
                .map(TripIncidentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TripIncidentResponse> listCompanyIncidents(
            Long companyId,
            TripIncidentStatus status,
            AuthPrincipal principal) {
        ensureCompanyManager(companyId, principal);
        return tripIncidentRepository.findAllByCompanyIdWithDetails(companyId, status).stream()
                .map(TripIncidentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TripIncidentResponse> listAdminIncidents(TripIncidentStatus status) {
        return tripIncidentRepository.findAllWithDetails(status).stream()
                .map(TripIncidentResponse::from)
                .toList();
    }

    public TripIncidentResponse resolveIncident(
            Long tripId,
            Long incidentId,
            ResolveIncidentRequest req,
            AuthPrincipal principal) {
        TripIncident incident = tripIncidentRepository.findByIdAndTripIdWithDetails(incidentId, tripId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy báo cáo sự cố #" + incidentId));

        ensureCompanyOrAdmin(incident.getTrip(), principal);
        String note = (req != null && req.resolutionNote() != null && !req.resolutionNote().isBlank())
                ? req.resolutionNote().strip()
                : "Đã tiếp nhận và xử lý sự cố";
        incident.resolve(principal.userId(), note);
        return TripIncidentResponse.from(tripIncidentRepository.save(incident));
    }

    // ================================================================== SP4-P2-02: Trip Monitoring Summaries

    @Transactional(readOnly = true)
    public List<TripMonitoringSummaryResponse> listCompanyMonitoringTrips(
            Long companyId,
            AuthPrincipal principal) {
        ensureCompanyManager(companyId, principal);
        List<Trip> trips = tripRepository.findAllByCompanyIdWithDetailsOrderByDepartureTimeDesc(companyId);
        return trips.stream()
                .map(this::toMonitoringSummary)
                .sorted(MONITORING_ORDER)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TripMonitoringSummaryResponse> listAdminMonitoringTrips() {
        List<Trip> trips = tripRepository.findAllWithDetailsOrderByDepartureTimeDesc();
        return trips.stream()
                .map(this::toMonitoringSummary)
                .sorted(MONITORING_ORDER)
                .toList();
    }

    private TripMonitoringSummaryResponse toMonitoringSummary(Trip trip) {
        List<TripStop> activeStops = tripStopRepository.findAllByTripIdWithBooking(trip.getId())
                .stream()
                .filter(s -> s.getBooking().getStatus() != BookingStatus.CANCELLED
                        && s.getBooking().getStatus() != BookingStatus.NO_SHOW)
                .sorted(Comparator.comparingInt(TripStop::getStopOrder).thenComparing(TripStop::getId))
                .toList();

        int completedCount = (int) activeStops.stream()
                .filter(s -> s.getStatus() == TripStopStatus.COMPLETED)
                .count();

        TripStop nextStop = activeStops.stream()
                .filter(s -> s.getStatus() != TripStopStatus.COMPLETED && s.getStatus() != TripStopStatus.SKIPPED)
                .findFirst()
                .orElse(null);

        Instant locTime = trip.getLastLocationAt();
        boolean isStale = false;
        if (trip.getStatus() == TripStatus.IN_PROGRESS) {
            if (locTime == null) {
                isStale = true;
            } else {
                isStale = Duration.between(locTime, Instant.now()).getSeconds() > LOCATION_STALE_SECONDS;
            }
        }

        List<TripIncident> incidents = tripIncidentRepository.findAllByTripIdWithDetails(trip.getId());
        int openIncidents = (int) incidents.stream()
                .filter(i -> i.getStatus() != TripIncidentStatus.RESOLVED)
                .count();

        return new TripMonitoringSummaryResponse(
                trip.getId(),
                trip.getRoute().getName(),
                trip.getRoute().getOrigin(),
                trip.getRoute().getDestination(),
                trip.getCompany().getId(),
                trip.getCompany().getName(),
                trip.getDriver().getFullName(),
                trip.getDriver().getPhone(),
                trip.getVehicle().getPlateNumber(),
                trip.getVehicle().getVehicleType(),
                trip.getDepartureTime(),
                trip.getRoute().getEstimatedMinutes(),
                trip.getStatus(),
                trip.getAssignmentStatus() != null
                        ? trip.getAssignmentStatus()
                        : DriverAssignmentStatus.ASSIGNED,
                trip.getBookedSeats(),
                trip.getVehicle().getSeatCapacity(),
                trip.getLastLat(),
                trip.getLastLng(),
                trip.getLastSpeedKmh(),
                locTime,
                isStale,
                completedCount,
                activeStops.size(),
                nextStop != null ? nextStop.getAddress() : null,
                nextStop != null ? nextStop.getStopType() : null,
                openIncidents,
                incidents.size());
    }

    private static int statusPriority(TripStatus status) {
        return switch (status) {
            case IN_PROGRESS -> 0;
            case PUBLISHED, FULL -> 1;
            case DRAFT -> 2;
            case COMPLETED -> 3;
            case CANCELLED -> 4;
        };
    }

    private static final Comparator<TripMonitoringSummaryResponse> MONITORING_ORDER =
            Comparator.comparingInt((TripMonitoringSummaryResponse s) -> statusPriority(s.status()))
                    .thenComparing(
                            TripMonitoringSummaryResponse::departureTime,
                            Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(TripMonitoringSummaryResponse::tripId, Comparator.reverseOrder());

    // ================================================================== Authorization Helpers

    private Trip requireAssignedDriverTrip(Long tripId, AuthPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        Driver driver = driverRepository.findByUserId(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Tài khoản chưa được liên kết hồ sơ tài xế"));
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        if (!trip.getDriver().getId().equals(driver.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Bạn không phải tài xế được phân công cho chuyến đi này");
        }
        return trip;
    }

    private void ensureCompanyManager(Long companyId, AuthPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        var company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));
        if (principal.role() == UserRole.ADMIN) {
            return;
        }
        if (principal.role() == UserRole.TRANSPORT_COMPANY
                && company.getOwner().getId().equals(principal.userId())) {
            return;
        }
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập giám sát của nhà xe này");
    }

    private void ensureCompanyOrAdmin(Trip trip, AuthPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        if (principal.role() == UserRole.ADMIN) {
            return;
        }
        if (principal.role() == UserRole.TRANSPORT_COMPANY
                && trip.getCompany().getOwner().getId().equals(principal.userId())) {
            return;
        }
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "Chỉ Nhà xe sở hữu chuyến hoặc Admin mới được xử lý sự cố");
    }

    private void ensureTripIncidentViewer(Trip trip, AuthPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        if (principal.role() == UserRole.ADMIN) {
            return;
        }
        if (principal.role() == UserRole.TRANSPORT_COMPANY
                && trip.getCompany().getOwner().getId().equals(principal.userId())) {
            return;
        }
        if (principal.role() == UserRole.DRIVER) {
            Long driverUserId = trip.getDriver().getUserId();
            if (driverUserId != null && driverUserId.equals(principal.userId())) {
                return;
            }
            boolean match = driverRepository.findByUserId(principal.userId())
                    .map(d -> d.getId().equals(trip.getDriver().getId()))
                    .orElse(false);
            if (match) return;
        }
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "Bạn không có quyền xem sự cố của chuyến đi này");
    }
}
