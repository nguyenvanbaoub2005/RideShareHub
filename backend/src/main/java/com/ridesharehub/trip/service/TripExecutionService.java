package com.ridesharehub.trip.service;

import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.enums.VehicleStatus;
import com.ridesharehub.company.repository.VehicleRepository;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.enums.DriverStatus;
import com.ridesharehub.driver.repository.DriverRepository;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.DriverLocationUpdateRequest;
import com.ridesharehub.trip.dto.StopStatusUpdateRequest;
import com.ridesharehub.trip.dto.TripLiveSnapshotResponse;
import com.ridesharehub.trip.dto.TripResponse;
import com.ridesharehub.trip.dto.TripStopResponse;
import com.ridesharehub.trip.entity.RouteProposal;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.entity.TripStop;
import com.ridesharehub.trip.enums.DriverAssignmentStatus;
import com.ridesharehub.trip.enums.RouteProposalStatus;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.enums.TripStopStatus;
import com.ridesharehub.trip.enums.TripStopType;
import com.ridesharehub.trip.realtime.TripRealtimeBroadcaster;
import com.ridesharehub.trip.repository.RouteProposalRepository;
import com.ridesharehub.trip.repository.TripRepository;
import com.ridesharehub.trip.repository.TripStopRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * SP3-P2-01, SP3-P2-01b & SP3-P2-02:
 * Driver Trip execution lifecycle (ACCEPT / REJECT / START / COMPLETE),
 * Stop transitions (ARRIVED / PICKED_UP / DROPPED_OFF),
 * Location ingestion, and authoritative Realtime Snapshot + WebSocket broadcast.
 */
@Service
@Transactional
public class TripExecutionService {

    /** Location samples older than 45 seconds during IN_PROGRESS are flagged as stale. */
    private static final long LOCATION_STALE_SECONDS = 45L;

    /** Default average speed (km/h) used to estimate ETA to next stop when speed is not reported. */
    private static final double DEFAULT_SPEED_KMH = 40.0;

    private final TripRepository tripRepository;
    private final TripStopRepository tripStopRepository;
    private final BookingRepository bookingRepository;
    private final DriverRepository driverRepository;
    private final VehicleRepository vehicleRepository;
    private final TripRealtimeBroadcaster realtimeBroadcaster;
    private final RouteProposalRepository routeProposalRepository;

    public TripExecutionService(
            TripRepository tripRepository,
            TripStopRepository tripStopRepository,
            BookingRepository bookingRepository,
            DriverRepository driverRepository,
            VehicleRepository vehicleRepository,
            TripRealtimeBroadcaster realtimeBroadcaster) {
        this(
                tripRepository,
                tripStopRepository,
                bookingRepository,
                driverRepository,
                vehicleRepository,
                realtimeBroadcaster,
                null);
    }

    @Autowired
    public TripExecutionService(
            TripRepository tripRepository,
            TripStopRepository tripStopRepository,
            BookingRepository bookingRepository,
            DriverRepository driverRepository,
            VehicleRepository vehicleRepository,
            TripRealtimeBroadcaster realtimeBroadcaster,
            RouteProposalRepository routeProposalRepository) {
        this.tripRepository = tripRepository;
        this.tripStopRepository = tripStopRepository;
        this.bookingRepository = bookingRepository;
        this.driverRepository = driverRepository;
        this.vehicleRepository = vehicleRepository;
        this.realtimeBroadcaster = realtimeBroadcaster;
        this.routeProposalRepository = routeProposalRepository;
    }

    // ================================================================== SP3-P2-01b: Accept / Reject

    /** POST /api/v1/driver/trips/{tripId}/accept */
    public TripResponse acceptTrip(Long tripId, AuthPrincipal principal) {
        Trip trip = requireAssignedDriverTrip(tripId, principal);
        try {
            trip.acceptAssignment();
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }
        Trip saved = tripRepository.save(trip);
        ensureStopsMaterialized(saved);
        broadcastSnapshot(saved, "TRIP_ACCEPTED");
        return TripResponse.from(saved);
    }

    /** POST /api/v1/driver/trips/{tripId}/reject */
    public TripResponse rejectTrip(Long tripId, AuthPrincipal principal) {
        Trip trip = requireAssignedDriverTrip(tripId, principal);
        try {
            trip.rejectAssignment();
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }
        Trip saved = tripRepository.save(trip);
        broadcastSnapshot(saved, "TRIP_REJECTED");
        return TripResponse.from(saved);
    }

    // ================================================================== SP3-P2-01: Start / Complete Trip

    /** POST /api/v1/driver/trips/{tripId}/start */
    public TripResponse startTrip(Long tripId, AuthPrincipal principal) {
        Trip trip = requireAssignedDriverTrip(tripId, principal);
        try {
            trip.startTrip();
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }

        Driver driver = trip.getDriver();
        driver.updateStatus(DriverStatus.ON_TRIP);
        driverRepository.save(driver);

        var vehicle = trip.getVehicle();
        vehicle.updateStatus(VehicleStatus.IN_USE);
        if (vehicleRepository != null) {
            vehicleRepository.save(vehicle);
        }

        List<TripStop> stops = ensureStopsMaterialized(trip);
        // Seed initial GPS coordinate from the first pickup stop if driver hasn't sent GPS yet
        if (trip.getLastLat() == null && !stops.isEmpty()) {
            TripStop firstWithCoords = stops.stream()
                    .filter(s -> s.getLatitude() != null && s.getLongitude() != null)
                    .findFirst()
                    .orElse(null);
            if (firstWithCoords != null) {
                trip.updateDriverLocation(
                        firstWithCoords.getLatitude(),
                        firstWithCoords.getLongitude(),
                        BigDecimal.ZERO,
                        BigDecimal.valueOf(35));
            }
        }

        Trip saved = tripRepository.save(trip);
        broadcastSnapshot(saved, "TRIP_STARTED");
        return TripResponse.from(saved);
    }

    /** POST /api/v1/driver/trips/{tripId}/complete */
    public TripResponse completeTrip(Long tripId, AuthPrincipal principal) {
        Trip trip = requireAssignedDriverTrip(tripId, principal);
        if (trip.getStatus() == TripStatus.COMPLETED) {
            return TripResponse.from(trip); // Idempotent
        }
        if (trip.getStatus() != TripStatus.IN_PROGRESS) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ có thể hoàn thành chuyến khi đang ở trạng thái Đang chạy (IN_PROGRESS)");
        }

        List<TripStop> activeStops = getActiveStops(trip);
        boolean hasUnresolvedStops = activeStops.stream()
                .anyMatch(s -> s.getStatus() != TripStopStatus.COMPLETED
                        && s.getStatus() != TripStopStatus.SKIPPED);
        if (hasUnresolvedStops) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể hoàn thành chuyến đi khi vẫn còn điểm đón/trả hành khách chưa xử lý xong");
        }

        try {
            trip.completeTrip();
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }

        Driver driver = trip.getDriver();
        driver.updateStatus(DriverStatus.AVAILABLE);
        driverRepository.save(driver);

        var vehicle = trip.getVehicle();
        vehicle.updateStatus(VehicleStatus.AVAILABLE);
        if (vehicleRepository != null) {
            vehicleRepository.save(vehicle);
        }

        Trip saved = tripRepository.save(trip);
        broadcastSnapshot(saved, "TRIP_COMPLETED");
        return TripResponse.from(saved);
    }

    // ================================================================== SP3-P2-01: Stop Transitions

    /** GET /api/v1/driver/trips/{tripId}/stops */
    public List<TripStopResponse> listTripStopsForDriver(Long tripId, AuthPrincipal principal) {
        Trip trip = requireAssignedDriverTrip(tripId, principal);
        return getActiveStops(trip).stream()
                .map(TripStopResponse::from)
                .toList();
    }

    /** GET /api/v1/trips/{tripId}/stops */
    public List<TripStopResponse> listTripStopsForViewer(Long tripId, AuthPrincipal principal) {
        Trip trip = requireTripForViewer(tripId, principal);
        List<TripStop> activeStops = getActiveStops(trip);
        if (principal.role() == UserRole.PASSENGER) {
            Long acceptedProposalId = findAcceptedProposalId(tripId);
            return projectStopsForPassenger(activeStops, principal.userId(), acceptedProposalId != null);
        }
        return activeStops.stream()
                .map(TripStopResponse::from)
                .toList();
    }

    /**
     * POST /api/v1/driver/trips/{tripId}/stops/{stopId}/status
     * Updates a stop to ARRIVED, PICKED_UP, or DROPPED_OFF (COMPLETED).
     */
    public TripStopResponse updateStopStatus(
            Long tripId,
            Long stopId,
            StopStatusUpdateRequest req,
            AuthPrincipal principal) {

        Trip trip = requireAssignedDriverTrip(tripId, principal);
        if (trip.getStatus() != TripStatus.IN_PROGRESS) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chuyến đi phải ở trạng thái Đang chạy (IN_PROGRESS) mới có thể cập nhật điểm đón/trả");
        }

        TripStop stop = tripStopRepository.findByIdWithDetails(stopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TripStop not found"));
        if (!stop.getTrip().getId().equals(tripId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Điểm dừng không thuộc chuyến đi này");
        }

        Booking booking = stop.getBooking();
        if (booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.NO_SHOW) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể cập nhật điểm dừng của đặt chỗ đã hủy hoặc vắng mặt");
        }

        String action = req != null ? req.effectiveAction() : "";
        String eventType;

        switch (action) {
            case "ARRIVED" -> {
                stop.markArrived();
                if (stop.getLatitude() != null && stop.getLongitude() != null) {
                    trip.updateDriverLocation(
                            stop.getLatitude(),
                            stop.getLongitude(),
                            trip.getLastHeading(),
                            BigDecimal.ZERO);
                    tripRepository.save(trip);
                }
                eventType = "STOP_ARRIVED";
            }
            case "PICKED_UP" -> {
                if (stop.getStopType() != TripStopType.PICKUP) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Chỉ có thể đánh dấu PICKED_UP tại điểm đón (PICKUP)");
                }
                stop.markCompleted();
                booking.markPickedUp();
                bookingRepository.save(booking);
                if (stop.getLatitude() != null && stop.getLongitude() != null) {
                    trip.updateDriverLocation(
                            stop.getLatitude(),
                            stop.getLongitude(),
                            trip.getLastHeading(),
                            BigDecimal.valueOf(35));
                    tripRepository.save(trip);
                }
                eventType = "STOP_PICKED_UP";
            }
            case "DROPPED_OFF", "COMPLETED" -> {
                if (stop.getStopType() == TripStopType.PICKUP && "COMPLETED".equals(action)) {
                    stop.markCompleted();
                    booking.markPickedUp();
                    bookingRepository.save(booking);
                    eventType = "STOP_PICKED_UP";
                } else {
                    if (stop.getStopType() != TripStopType.DROPOFF) {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Chỉ có thể đánh dấu DROPPED_OFF tại điểm trả (DROPOFF)");
                    }
                    // Hard invariant: PICKUP of this booking MUST be COMPLETED before DROPOFF
                    Optional<TripStop> pickupStop = tripStopRepository.findByBooking_IdAndStopType(
                            booking.getId(), TripStopType.PICKUP);
                    boolean pickupDone = pickupStop
                            .map(s -> s.getStatus() == TripStopStatus.COMPLETED)
                            .orElse(booking.getStatus() == BookingStatus.PICKED_UP
                                    || booking.getStatus() == BookingStatus.COMPLETED);
                    if (!pickupDone || (booking.getStatus() != BookingStatus.PICKED_UP
                            && booking.getStatus() != BookingStatus.COMPLETED)) {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Không thể trả khách (DROPPED_OFF) khi chưa xác nhận đón khách (PICKED_UP)");
                    }
                    stop.markCompleted();
                    booking.markCompleted();
                    bookingRepository.save(booking);
                    if (stop.getLatitude() != null && stop.getLongitude() != null) {
                        trip.updateDriverLocation(
                                stop.getLatitude(),
                                stop.getLongitude(),
                                trip.getLastHeading(),
                                BigDecimal.valueOf(30));
                        tripRepository.save(trip);
                    }
                    eventType = "STOP_DROPPED_OFF";
                }
            }
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Hành động không hợp lệ: '" + action + "'. Hỗ trợ: ARRIVED, PICKED_UP, DROPPED_OFF");
        }

        TripStop savedStop = tripStopRepository.save(stop);
        broadcastSnapshot(trip, eventType);
        return TripStopResponse.from(savedStop);
    }

    // ================================================================== SP3-P2-02: Location & Snapshot

    /** POST /api/v1/driver/trips/{tripId}/location */
    public TripLiveSnapshotResponse updateDriverLocation(
            Long tripId,
            DriverLocationUpdateRequest req,
            AuthPrincipal principal) {

        Trip trip = requireAssignedDriverTrip(tripId, principal);
        if (trip.getStatus() == TripStatus.CANCELLED || trip.getStatus() == TripStatus.COMPLETED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể cập nhật vị trí GPS khi chuyến đã kết thúc hoặc đã hủy");
        }

        trip.updateDriverLocation(
                req.latitude(),
                req.longitude(),
                req.heading(),
                req.speedKmh());
        Trip saved = tripRepository.save(trip);
        TripLiveSnapshotResponse snapshot = buildSnapshot(saved, "LOCATION_UPDATED");
        if (realtimeBroadcaster != null) {
            realtimeBroadcaster.broadcast(tripId, snapshot);
        }
        return snapshot;
    }

    /** GET /api/v1/trips/{tripId}/live-snapshot & /tracking */
    public TripLiveSnapshotResponse getLiveSnapshot(Long tripId, AuthPrincipal principal) {
        Trip trip = requireTripForViewer(tripId, principal);
        return buildSnapshot(trip, "SNAPSHOT", principal);
    }

    /** Called by RouteOptimizationService when a proposal is ACCEPTED. */
    public void broadcastRouteUpdated(Trip trip) {
        broadcastSnapshot(trip, "ROUTE_PROPOSAL_ACCEPTED");
    }

    /** Called by TripIncidentService when a driver reports an operational incident. */
    public void broadcastIncidentReported(Trip trip) {
        broadcastSnapshot(trip, "INCIDENT_REPORTED");
    }

    /** Used by WebSocket handshake/connection handler to authorize subscription. */
    @Transactional(readOnly = true)
    public boolean canObserveTrip(Long tripId, AuthPrincipal principal) {
        if (principal == null) return false;
        Optional<Trip> opt = tripRepository.findById(tripId);
        if (opt.isEmpty()) return false;
        Trip trip = opt.get();
        return isAuthorizedForTrip(trip, principal);
    }

    // ================================================================== Helpers

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

    private Trip requireTripForViewer(Long tripId, AuthPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        if (!isAuthorizedForTrip(trip, principal)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Bạn không có quyền theo dõi chuyến đi này");
        }
        return trip;
    }

    private boolean isAuthorizedForTrip(Trip trip, AuthPrincipal principal) {
        if (principal.role() == UserRole.ADMIN) {
            return true;
        }
        if (trip.getCompany().getOwner().getId().equals(principal.userId())) {
            return true;
        }
        if (principal.role() == UserRole.DRIVER) {
            Long driverUserId = trip.getDriver().getUserId();
            if (driverUserId != null && driverUserId.equals(principal.userId())) {
                return true;
            }
            return driverRepository.findByUserId(principal.userId())
                    .map(d -> d.getId().equals(trip.getDriver().getId()))
                    .orElse(false);
        }
        // Passenger: must have at least one booking on this trip
        return bookingRepository.findAllByTrip_IdOrderByCreatedAtAsc(trip.getId())
                .stream()
                .anyMatch(b -> b.getPassenger().getId().equals(principal.userId()));
    }

    /**
     * Ensures that every active booking (CONFIRMED / PICKED_UP / COMPLETED) on {@code trip}
     * has a corresponding PICKUP stop and DROPOFF stop in {@code trip_stops}.
     */
    public List<TripStop> ensureStopsMaterialized(Trip trip) {
        List<Booking> bookings = bookingRepository.findAllByTrip_IdOrderByCreatedAtAsc(trip.getId());
        List<Booking> activeBookings = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED
                        || b.getStatus() == BookingStatus.PICKED_UP
                        || b.getStatus() == BookingStatus.COMPLETED)
                .toList();

        List<TripStop> existingStops = tripStopRepository.findAllByTripIdWithBooking(trip.getId());
        int nextPickupOrder = 1;
        int nextDropoffOrder = 100;
        for (TripStop s : existingStops) {
            if (s.getStopType() == TripStopType.PICKUP) {
                nextPickupOrder = Math.max(nextPickupOrder, s.getStopOrder() + 1);
            } else {
                nextDropoffOrder = Math.max(nextDropoffOrder, s.getStopOrder() + 1);
            }
        }

        boolean createdAny = false;
        for (Booking b : activeBookings) {
            boolean hasPickup = existingStops.stream()
                    .anyMatch(s -> s.getBooking().getId().equals(b.getId())
                            && s.getStopType() == TripStopType.PICKUP);
            if (!hasPickup) {
                TripStop pickup = new TripStop(
                        trip,
                        b,
                        TripStopType.PICKUP,
                        nextPickupOrder++,
                        b.getPickupAddress(),
                        b.getPickupLat(),
                        b.getPickupLng());
                if (b.getStatus() == BookingStatus.PICKED_UP || b.getStatus() == BookingStatus.COMPLETED) {
                    pickup.markCompleted();
                }
                tripStopRepository.save(pickup);
                createdAny = true;
            }

            boolean hasDropoff = existingStops.stream()
                    .anyMatch(s -> s.getBooking().getId().equals(b.getId())
                            && s.getStopType() == TripStopType.DROPOFF);
            if (!hasDropoff) {
                TripStop dropoff = new TripStop(
                        trip,
                        b,
                        TripStopType.DROPOFF,
                        nextDropoffOrder++,
                        b.getDropoffAddress(),
                        b.getDropoffLat(),
                        b.getDropoffLng());
                if (b.getStatus() == BookingStatus.COMPLETED) {
                    dropoff.markCompleted();
                }
                tripStopRepository.save(dropoff);
                createdAny = true;
            }
        }

        if (createdAny) {
            existingStops = tripStopRepository.findAllByTripIdWithBooking(trip.getId());
        }
        return existingStops;
    }

    private List<TripStop> getActiveStops(Trip trip) {
        List<TripStop> all = ensureStopsMaterialized(trip);
        List<TripStop> active = all.stream()
                .filter(s -> s.getBooking().getStatus() != BookingStatus.CANCELLED
                        && s.getBooking().getStatus() != BookingStatus.NO_SHOW)
                .sorted(Comparator.comparingInt(TripStop::getStopOrder).thenComparing(TripStop::getId))
                .toList();
        return active;
    }

    private void broadcastSnapshot(Trip trip, String eventType) {
        if (realtimeBroadcaster == null) return;
        TripLiveSnapshotResponse snapshot = buildSnapshot(trip, eventType, null);
        realtimeBroadcaster.broadcast(trip.getId(), snapshot);
    }

    private TripLiveSnapshotResponse buildSnapshot(Trip trip, String eventType) {
        return buildSnapshot(trip, eventType, null);
    }

    private TripLiveSnapshotResponse buildSnapshot(
            Trip trip, String eventType, AuthPrincipal viewer) {
        List<TripStop> activeStops = getActiveStops(trip);
        Long acceptedProposalId = findAcceptedProposalId(trip.getId());
        boolean routeOptimized = acceptedProposalId != null;

        boolean isPassengerViewer = viewer != null && viewer.role() == UserRole.PASSENGER;
        List<TripStopResponse> stopDtos = isPassengerViewer
                ? projectStopsForPassenger(activeStops, viewer.userId(), routeOptimized)
                : activeStops.stream().map(TripStopResponse::from).toList();

        int completedCount = (int) stopDtos.stream()
                .filter(s -> s.status() == TripStopStatus.COMPLETED)
                .count();
        TripStopResponse nextStop = stopDtos.stream()
                .filter(s -> s.status() != TripStopStatus.COMPLETED && s.status() != TripStopStatus.SKIPPED)
                .findFirst()
                .orElse(null);

        TripStopResponse myNextStop = null;
        if (isPassengerViewer) {
            myNextStop = stopDtos.stream()
                    .filter(s -> Boolean.TRUE.equals(s.ownStop())
                            && s.status() != TripStopStatus.COMPLETED
                            && s.status() != TripStopStatus.SKIPPED)
                    .findFirst()
                    .orElse(null);
        }

        Instant locTime = trip.getLastLocationAt();
        boolean isStale = false;
        if (trip.getStatus() == TripStatus.IN_PROGRESS) {
            if (locTime == null) {
                isStale = true;
            } else {
                long ageSeconds = Duration.between(locTime, Instant.now()).getSeconds();
                isStale = ageSeconds > LOCATION_STALE_SECONDS;
            }
        }

        Integer etaMinutes = computeEtaMinutes(trip, nextStop);
        Integer etaToMyStop = myNextStop != null ? computeEtaMinutes(trip, myNextStop) : null;
        List<String> recentEvents = buildRecentEvents(trip, stopDtos);

        return new TripLiveSnapshotResponse(
                eventType,
                trip.getId(),
                trip.getRoute().getName(),
                trip.getRoute().getOrigin(),
                trip.getRoute().getDestination(),
                trip.getDepartureTime(),
                trip.getRoute().getEstimatedMinutes(),
                trip.getStatus(),
                trip.getAssignmentStatus() != null ? trip.getAssignmentStatus() : DriverAssignmentStatus.ASSIGNED,
                trip.getCompany().getName(),
                trip.getVehicle().getPlateNumber(),
                trip.getVehicle().getVehicleType(),
                trip.getDriver().getFullName(),
                trip.getDriver().getPhone(),
                trip.getLastLat(),
                trip.getLastLng(),
                trip.getLastHeading(),
                trip.getLastSpeedKmh(),
                locTime,
                isStale,
                nextStop,
                etaMinutes,
                completedCount,
                stopDtos.size(),
                stopDtos,
                recentEvents,
                Instant.now(),
                acceptedProposalId,
                routeOptimized,
                myNextStop,
                etaToMyStop);
    }

    private Long findAcceptedProposalId(Long tripId) {
        if (routeProposalRepository == null) return null;
        return routeProposalRepository
                .findFirstByTrip_IdAndStatusOrderByReviewedAtDescIdDesc(tripId, RouteProposalStatus.ACCEPTED)
                .map(RouteProposal::getId)
                .orElse(null);
    }

    /**
     * SP3-P1-04:
     * - When an ACCEPTED optimization proposal exists, expose the full approved stop sequence
     *   with sensitive info of other passengers masked.
     * - Before any proposal is ACCEPTED, expose only the viewer's own stops so unapproved routes
     *   and other passengers' locations are never leaked.
     */
    private List<TripStopResponse> projectStopsForPassenger(
            List<TripStop> activeStops, Long viewerUserId, boolean hasAcceptedProposal) {
        return activeStops.stream()
                .filter(s -> hasAcceptedProposal || s.getBooking().getPassenger().getId().equals(viewerUserId))
                .map(s -> TripStopResponse.forPassenger(s, viewerUserId))
                .toList();
    }

    private static Integer computeEtaMinutes(Trip trip, TripStopResponse nextStop) {
        if (nextStop == null) return null;
        if (nextStop.status() == TripStopStatus.ARRIVED) {
            return 0;
        }
        if (trip.getLastLat() != null
                && trip.getLastLng() != null
                && nextStop.latitude() != null
                && nextStop.longitude() != null) {
            double distKm = haversineKm(
                    trip.getLastLat().doubleValue(),
                    trip.getLastLng().doubleValue(),
                    nextStop.latitude().doubleValue(),
                    nextStop.longitude().doubleValue());
            double speed = (trip.getLastSpeedKmh() != null && trip.getLastSpeedKmh().doubleValue() > 5.0)
                    ? trip.getLastSpeedKmh().doubleValue()
                    : DEFAULT_SPEED_KMH;
            int mins = (int) Math.max(1L, Math.round((distKm / speed) * 60.0));
            return Math.min(mins, trip.getRoute().getEstimatedMinutes());
        }
        return Math.max(5, trip.getRoute().getEstimatedMinutes() / 4);
    }

    private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private static List<String> buildRecentEvents(Trip trip, List<TripStopResponse> stops) {
        List<String> events = new ArrayList<>();
        if (trip.getStatus() == TripStatus.COMPLETED) {
            events.add("Chuyến đi đã hoàn thành an toàn.");
        }
        for (int i = stops.size() - 1; i >= 0; i--) {
            TripStopResponse s = stops.get(i);
            String typeLabel = s.stopType() == TripStopType.PICKUP ? "đón" : "trả";
            if (s.status() == TripStopStatus.COMPLETED) {
                events.add("Tài xế đã " + typeLabel + " khách " + s.passengerName() + " tại " + s.address());
            } else if (s.status() == TripStopStatus.ARRIVED) {
                events.add("Tài xế đã đến điểm " + typeLabel + " của " + s.passengerName() + " (" + s.address() + ")");
            }
        }
        if (trip.getStatus() == TripStatus.IN_PROGRESS) {
            events.add("Tài xế " + trip.getDriver().getFullName() + " đã bắt đầu hành trình.");
        }
        if (trip.getAssignmentStatus() == DriverAssignmentStatus.ACCEPTED) {
            events.add("Tài xế " + trip.getDriver().getFullName() + " đã xác nhận nhận chuyến.");
        } else if (trip.getAssignmentStatus() == DriverAssignmentStatus.REJECTED) {
            events.add("Tài xế đã từ chối nhận chuyến, đang chờ nhà xe điều phối lại.");
        }
        if (events.isEmpty()) {
            events.add("Chuyến xe đã mở bán và phân công tài xế " + trip.getDriver().getFullName() + ".");
        }
        return events.stream().limit(8).toList();
    }
}
