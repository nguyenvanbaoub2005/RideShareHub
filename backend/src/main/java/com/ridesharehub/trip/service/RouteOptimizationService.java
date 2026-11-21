package com.ridesharehub.trip.service;

import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.RejectProposalRequest;
import com.ridesharehub.trip.dto.RouteProposalResponse;
import com.ridesharehub.trip.dto.SyncTripStopsRequest;
import com.ridesharehub.trip.dto.TripStopResponse;
import com.ridesharehub.trip.entity.RouteProposal;
import com.ridesharehub.trip.entity.RouteProposalStop;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.entity.TripStop;
import com.ridesharehub.trip.enums.RouteProposalStatus;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.enums.TripStopType;
import com.ridesharehub.trip.optimizer.OptimizerClient;
import com.ridesharehub.trip.repository.RouteProposalRepository;
import com.ridesharehub.trip.repository.TripRepository;
import com.ridesharehub.trip.repository.TripStopRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * SP3-P1-01, SP3-P1-03 & SP3-P1-05:
 * - Materialize and reorder TripStop pairs (enforcing PICKUP before DROPOFF & locking COMPLETED trips)
 * - Invoke Python FastAPI + OR-Tools VRPPD optimizer and persist RouteProposal in PROPOSED state
 * - Review proposals (ACCEPT -> apply stop_order + planned_arrival_at & supersede older proposals; REJECT)
 */
@Service
@Transactional
public class RouteOptimizationService {

    private static final double DEFAULT_SPEED_KMH = 40.0;
    private static final double DEFAULT_TIME_LIMIT_SECONDS = 5.0;

    private static final Map<String, double[]> REGION_COORDS = Map.of(
            "đà nẵng", new double[] {16.054407, 108.202167},
            "huế", new double[] {16.463713, 107.590866},
            "hội an", new double[] {15.880058, 108.338047},
            "tam kỳ", new double[] {15.573640, 108.474030},
            "quảng ngãi", new double[] {15.121387, 108.804414},
            "quảng nam", new double[] {15.539354, 108.019102},
            "hà nội", new double[] {21.027763, 105.834160},
            "hồ chí minh", new double[] {10.823099, 106.629662});

    private final TripRepository tripRepository;
    private final BookingRepository bookingRepository;
    private final TripStopRepository tripStopRepository;
    private final RouteProposalRepository routeProposalRepository;
    private final OptimizerClient optimizerClient;
    private final TripExecutionService tripExecutionService;

    public RouteOptimizationService(
            TripRepository tripRepository,
            BookingRepository bookingRepository,
            TripStopRepository tripStopRepository,
            RouteProposalRepository routeProposalRepository,
            OptimizerClient optimizerClient,
            TripExecutionService tripExecutionService) {
        this.tripRepository = tripRepository;
        this.bookingRepository = bookingRepository;
        this.tripStopRepository = tripStopRepository;
        this.routeProposalRepository = routeProposalRepository;
        this.optimizerClient = optimizerClient;
        this.tripExecutionService = tripExecutionService;
    }

    // ================================================================== SP3-P1-01: Manage TripStops

    /**
     * POST /api/v1/trips/{tripId}/stops
     * Materializes PICKUP/DROPOFF TripStop pairs for all active bookings and optionally applies
     * a validated stop ordering while enforcing PICKUP before DROPOFF per booking.
     */
    public List<TripStopResponse> syncOrReorderTripStops(
            Long tripId,
            SyncTripStopsRequest req,
            AuthPrincipal principal) {

        Trip trip = requireAuthorizedManagerTrip(tripId, principal);
        ensureTripEditableForStops(trip);

        List<TripStop> allStops = tripExecutionService.ensureStopsMaterialized(trip);
        List<TripStop> activeStops = allStops.stream()
                .filter(s -> isActiveBooking(s.getBooking()))
                .sorted(Comparator.comparingInt(TripStop::getStopOrder).thenComparing(TripStop::getId))
                .toList();

        if (req != null && req.orderedStopIds() != null && !req.orderedStopIds().isEmpty()) {
            List<Long> requestedIds = req.orderedStopIds();
            if (requestedIds.size() != activeStops.size()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Danh sách orderedStopIds phải chứa đầy đủ tất cả " + activeStops.size()
                                + " điểm dừng đang hoạt động trên chuyến");
            }
            Set<Long> uniqueIds = new HashSet<>(requestedIds);
            if (uniqueIds.size() != requestedIds.size()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Danh sách orderedStopIds không được chứa ID trùng lặp");
            }

            Map<Long, TripStop> byId = activeStops.stream()
                    .collect(Collectors.toMap(TripStop::getId, Function.identity()));

            List<TripStop> reordered = new ArrayList<>(requestedIds.size());
            for (Long stopId : requestedIds) {
                TripStop s = byId.get(stopId);
                if (s == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Điểm dừng #" + stopId + " không thuộc danh sách hoạt động của chuyến #" + tripId);
                }
                reordered.add(s);
            }

            // Hard Invariant: PICKUP must come before DROPOFF for every booking
            validatePickupBeforeDropoff(reordered);

            for (int i = 0; i < reordered.size(); i++) {
                TripStop stop = reordered.get(i);
                stop.updateStopOrder(i + 1);
                tripStopRepository.save(stop);
            }
            activeStops = reordered;
        }

        return activeStops.stream()
                .sorted(Comparator.comparingInt(TripStop::getStopOrder).thenComparing(TripStop::getId))
                .map(TripStopResponse::from)
                .toList();
    }

    // ================================================================== SP3-P1-03: Optimize Trip Route

    /**
     * POST /api/v1/trips/{tripId}/optimize
     * Invokes Python FastAPI + OR-Tools VRPPD optimizer and persists a RouteProposal in PROPOSED state.
     * Never directly mutates Trip, Booking, or TripStop order until explicitly accepted.
     */
    public RouteProposalResponse optimizeTrip(Long tripId, AuthPrincipal principal) {
        Trip trip = requireAuthorizedManagerTrip(tripId, principal);
        ensureTripEditableForStops(trip);

        // Ensure TripStop pairs exist for all active bookings
        tripExecutionService.ensureStopsMaterialized(trip);

        List<Booking> activeBookings = bookingRepository.findAllByTrip_IdOrderByCreatedAtAsc(tripId)
                .stream()
                .filter(this::isActiveBooking)
                .toList();

        if (activeBookings.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chuyến đi chưa có đặt chỗ hợp lệ (CONFIRMED/PICKED_UP) để tối ưu lộ trình");
        }

        double[] originCoord = guessRegionCoords(trip.getRoute().getOrigin(), new double[] {16.054407, 108.202167});
        double[] destCoord = guessRegionCoords(trip.getRoute().getDestination(), new double[] {16.463713, 107.590866});

        List<OptimizerClient.BookingStopInput> bookingInputs = new ArrayList<>();
        Map<Long, Booking> bookingMap = new HashMap<>();
        for (Booking b : activeBookings) {
            bookingMap.put(b.getId(), b);
            double pickupLat = b.getPickupLat() != null ? b.getPickupLat().doubleValue() : originCoord[0];
            double pickupLng = b.getPickupLng() != null ? b.getPickupLng().doubleValue() : originCoord[1];
            double dropoffLat = b.getDropoffLat() != null ? b.getDropoffLat().doubleValue() : destCoord[0];
            double dropoffLng = b.getDropoffLng() != null ? b.getDropoffLng().doubleValue() : destCoord[1];

            bookingInputs.add(new OptimizerClient.BookingStopInput(
                    b.getId(),
                    b.getSeatCount(),
                    new OptimizerClient.LocationPoint(
                            b.getPickupAddress() != null ? b.getPickupAddress() : trip.getRoute().getOrigin(),
                            pickupLat,
                            pickupLng),
                    new OptimizerClient.LocationPoint(
                            b.getDropoffAddress() != null ? b.getDropoffAddress() : trip.getRoute().getDestination(),
                            dropoffLat,
                            dropoffLng)));
        }

        int vehicleCapacity = trip.getVehicle().getSeatCapacity();
        OptimizerClient.OptimizerRouteRequest optimizerRequest = new OptimizerClient.OptimizerRouteRequest(
                trip.getId(),
                vehicleCapacity,
                new OptimizerClient.LocationPoint(trip.getRoute().getOrigin(), originCoord[0], originCoord[1]),
                new OptimizerClient.LocationPoint(trip.getRoute().getDestination(), destCoord[0], destCoord[1]),
                DEFAULT_SPEED_KMH,
                DEFAULT_TIME_LIMIT_SECONDS,
                bookingInputs);

        OptimizerClient.OptimizerRouteResponse result = optimizerClient.optimizeTripRoute(optimizerRequest);

        // Validate solver result obeys PICKUP-before-DROPOFF and capacity before saving
        validateOptimizerResponse(result, bookingMap, vehicleCapacity);

        RouteProposal proposal = new RouteProposal(
                trip,
                result.solver_engine() != null ? result.solver_engine() : "OR-TOOLS-VRPPD",
                result.solver_status() != null ? result.solver_status() : "OPTIMAL",
                result.total_distance_km(),
                result.baseline_distance_km(),
                result.distance_saved_km(),
                result.total_duration_minutes(),
                result.max_seats_on_board(),
                result.vehicle_capacity(),
                principal.userId());

        Instant baseDeparture = trip.getDepartureTime() != null ? trip.getDepartureTime() : Instant.now();
        for (OptimizerClient.OptimizedStopOutput out : result.ordered_stops()) {
            Booking b = bookingMap.get(out.booking_id());
            TripStopType stopType = TripStopType.valueOf(out.stop_type().toUpperCase());
            Instant plannedArrival = baseDeparture.plus(out.eta_offset_minutes(), ChronoUnit.MINUTES);
            proposal.addStop(new RouteProposalStop(
                    b,
                    stopType,
                    out.stop_order(),
                    out.label(),
                    BigDecimal.valueOf(out.latitude()),
                    BigDecimal.valueOf(out.longitude()),
                    out.seat_delta(),
                    out.cumulative_seats_on_board(),
                    out.distance_from_prev_km(),
                    out.eta_offset_minutes(),
                    plannedArrival));
        }

        RouteProposal saved = routeProposalRepository.save(proposal);
        return RouteProposalResponse.from(saved);
    }

    // ================================================================== SP3-P1-05: Review Proposals

    /** GET /api/v1/trips/{tripId}/proposals */
    @Transactional(readOnly = true)
    public List<RouteProposalResponse> listProposals(Long tripId, AuthPrincipal principal) {
        requireAuthorizedManagerTrip(tripId, principal);
        return routeProposalRepository.findAllByTripIdWithStops(tripId)
                .stream()
                .map(RouteProposalResponse::from)
                .toList();
    }

    /**
     * POST /api/v1/trips/{tripId}/proposals/{proposalId}/accept
     * Marks older ACCEPTED/PROPOSED proposals as SUPERSEDED, accepts this proposal,
     * and applies stop_order + planned_arrival_at onto trip_stops.
     */
    public RouteProposalResponse acceptProposal(Long tripId, Long proposalId, AuthPrincipal principal) {
        Trip trip = requireAuthorizedManagerTrip(tripId, principal);
        ensureTripEditableForStops(trip);

        RouteProposal proposal = routeProposalRepository.findByIdAndTripIdWithStops(proposalId, tripId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đề xuất lộ trình #" + proposalId));

        if (proposal.getStatus() == RouteProposalStatus.ACCEPTED) {
            return RouteProposalResponse.from(proposal); // Idempotent
        }
        if (proposal.getStatus() != RouteProposalStatus.PROPOSED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ có thể duyệt phương án đang ở trạng thái PROPOSED (hiện tại: " + proposal.getStatus() + ")");
        }

        // Supersede all previous ACCEPTED or other PROPOSED proposals on this trip
        List<RouteProposal> olderProposals = routeProposalRepository.findAllByTrip_IdAndStatusIn(
                tripId, List.of(RouteProposalStatus.ACCEPTED, RouteProposalStatus.PROPOSED));
        for (RouteProposal other : olderProposals) {
            if (!other.getId().equals(proposal.getId())) {
                other.markSuperseded();
                routeProposalRepository.save(other);
            }
        }

        proposal.accept(principal.userId());
        RouteProposal savedProposal = routeProposalRepository.save(proposal);

        // Apply proposal ordering & planned arrival times to materialized TripStops
        List<TripStop> existingStops = tripExecutionService.ensureStopsMaterialized(trip);
        Map<String, TripStop> stopByKey = new HashMap<>();
        for (TripStop s : existingStops) {
            stopByKey.put(s.getBooking().getId() + ":" + s.getStopType().name(), s);
        }

        List<RouteProposalStop> orderedProposalStops = savedProposal.getStops().stream()
                .sorted(Comparator.comparingInt(RouteProposalStop::getStopOrder))
                .toList();

        int maxAppliedOrder = 0;
        Set<Long> updatedStopIds = new HashSet<>();
        for (RouteProposalStop ps : orderedProposalStops) {
            String key = ps.getBooking().getId() + ":" + ps.getStopType().name();
            TripStop stop = stopByKey.get(key);
            if (stop != null) {
                stop.applyOptimization(ps.getStopOrder(), ps.getPlannedArrivalAt(), savedProposal.getId());
                tripStopRepository.save(stop);
                updatedStopIds.add(stop.getId());
                maxAppliedOrder = Math.max(maxAppliedOrder, ps.getStopOrder());
            }
        }

        // Any newly added booking stops not in this proposal are appended safely after optimized stops
        for (TripStop s : existingStops) {
            if (!updatedStopIds.contains(s.getId()) && isActiveBooking(s.getBooking())) {
                maxAppliedOrder++;
                s.updateStopOrder(maxAppliedOrder);
                tripStopRepository.save(s);
            }
        }

        // Notify live viewers (Driver / Passenger / Web) that an optimized route was accepted
        tripExecutionService.broadcastRouteUpdated(trip);

        return RouteProposalResponse.from(savedProposal);
    }

    /** POST /api/v1/trips/{tripId}/proposals/{proposalId}/reject */
    public RouteProposalResponse rejectProposal(
            Long tripId,
            Long proposalId,
            RejectProposalRequest req,
            AuthPrincipal principal) {
        requireAuthorizedManagerTrip(tripId, principal);

        RouteProposal proposal = routeProposalRepository.findByIdAndTripIdWithStops(proposalId, tripId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đề xuất lộ trình #" + proposalId));

        try {
            String reason = req != null ? req.reason() : null;
            proposal.reject(principal.userId(), reason);
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }

        return RouteProposalResponse.from(routeProposalRepository.save(proposal));
    }

    // ================================================================== Validation Helpers

    private Trip requireAuthorizedManagerTrip(Long tripId, AuthPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        boolean isAdmin = principal.role() == UserRole.ADMIN;
        boolean isCompanyOwner = principal.role() == UserRole.TRANSPORT_COMPANY
                && trip.getCompany().getOwner().getId().equals(principal.userId());
        if (!isAdmin && !isCompanyOwner) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ Nhà xe sở hữu chuyến hoặc Quản trị viên mới có quyền quản lý điểm dừng và tối ưu lộ trình");
        }
        return trip;
    }

    private void ensureTripEditableForStops(Trip trip) {
        if (trip.getStatus() == TripStatus.COMPLETED || trip.getStatus() == TripStatus.CANCELLED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể chỉnh sửa điểm dừng hoặc tối ưu lộ trình khi chuyến đã kết thúc hoặc đã hủy ("
                            + trip.getStatus() + ")");
        }
    }

    private boolean isActiveBooking(Booking booking) {
        return booking.getStatus() == BookingStatus.CONFIRMED
                || booking.getStatus() == BookingStatus.PICKED_UP
                || booking.getStatus() == BookingStatus.COMPLETED;
    }

    private void validatePickupBeforeDropoff(List<TripStop> orderedStops) {
        Set<Long> pickedUpBookings = new HashSet<>();
        for (TripStop stop : orderedStops) {
            Long bookingId = stop.getBooking().getId();
            if (stop.getStopType() == TripStopType.PICKUP) {
                pickedUpBookings.add(bookingId);
            } else if (stop.getStopType() == TripStopType.DROPOFF) {
                if (!pickedUpBookings.contains(bookingId)) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Vi phạm ràng buộc thứ tự: Điểm đón (PICKUP) của đặt chỗ #" + bookingId
                                    + " phải đứng trước điểm trả (DROPOFF)");
                }
            }
        }
    }

    private void validateOptimizerResponse(
            OptimizerClient.OptimizerRouteResponse response,
            Map<Long, Booking> bookingMap,
            int vehicleCapacity) {
        if (response == null || response.ordered_stops() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "Dịch vụ tối ưu lộ trình trả về dữ liệu trống");
        }
        Set<Long> pickedUp = new HashSet<>();
        int seatsOnBoard = 0;
        for (OptimizerClient.OptimizedStopOutput stop : response.ordered_stops()) {
            Booking b = bookingMap.get(stop.booking_id());
            if (b == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Optimizer trả về booking_id không hợp lệ: " + stop.booking_id());
            }
            if ("PICKUP".equalsIgnoreCase(stop.stop_type())) {
                pickedUp.add(stop.booking_id());
                seatsOnBoard += b.getSeatCount();
            } else if ("DROPOFF".equalsIgnoreCase(stop.stop_type())) {
                if (!pickedUp.contains(stop.booking_id())) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Optimizer vi phạm ràng buộc đón trước trả sau cho booking #" + stop.booking_id());
                }
                seatsOnBoard -= b.getSeatCount();
            }
            if (seatsOnBoard < 0 || seatsOnBoard > vehicleCapacity) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Optimizer vi phạm sức chứa phương tiện (" + seatsOnBoard + "/" + vehicleCapacity + ")");
            }
        }
    }

    private static double[] guessRegionCoords(String text, double[] fallback) {
        if (text == null) return fallback;
        String lower = text.toLowerCase();
        for (var entry : REGION_COORDS.entrySet()) {
            if (lower.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return fallback;
    }
}
