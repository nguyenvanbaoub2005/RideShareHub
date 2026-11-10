package com.ridesharehub.booking.service;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.auth.repository.UserRepository;
import com.ridesharehub.booking.dto.BookingResponse;
import com.ridesharehub.booking.dto.CancelBookingRequest;
import com.ridesharehub.booking.dto.CreateBookingRequest;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.enums.TripStatus;
import com.ridesharehub.trip.repository.TripRepository;
import com.ridesharehub.trip.service.TripSearchService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * SP2-P2-01: Booking lifecycle (create, get, list, confirm, cancel, no-show).
 * SP2-P2-02: Atomic seat capacity reservation/release with pessimistic row locking
 *            and idempotency-key deduplication.
 */
@Service
@Transactional
public class BookingService {

    private static final int MIN_IDEMPOTENCY_KEY_LEN = 8;
    private static final int MAX_IDEMPOTENCY_KEY_LEN = 100;

    private final BookingRepository bookingRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final TripSearchService tripSearchService;
    private final boolean autoConfirm;

    @Autowired
    public BookingService(
            BookingRepository bookingRepository,
            TripRepository tripRepository,
            UserRepository userRepository,
            TripSearchService tripSearchService,
            @Value("${booking.policy.auto-confirm:true}") boolean autoConfirm) {
        this.bookingRepository = bookingRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.tripSearchService = tripSearchService;
        this.autoConfirm = autoConfirm;
    }

    public BookingService(
            BookingRepository bookingRepository,
            TripRepository tripRepository,
            UserRepository userRepository,
            TripSearchService tripSearchService) {
        this(bookingRepository, tripRepository, userRepository, tripSearchService, true);
    }

    // ================================================================== Create Booking

    /**
     * POST /api/v1/trips/{tripId}/bookings
     * Atomically reserves requested seats under a pessimistic Trip lock and creates the Booking.
     */
    public BookingResponse createBooking(
            Long tripId,
            String idempotencyKey,
            CreateBookingRequest req,
            AuthPrincipal principal) {

        requirePassengerRole(principal);
        String key = validateIdempotencyKey(idempotencyKey);
        validateBookingRequest(req);

        // Fast-path idempotency check before acquiring Trip row lock
        Optional<Booking> existing = bookingRepository.findByPassenger_IdAndIdempotencyKey(
                principal.userId(), key);
        if (existing.isPresent()) {
            return verifySameTripAndMap(existing.get(), tripId);
        }

        User passenger = requireActiveUser(principal.userId());

        // Acquire row-level pessimistic write lock on Trip (ADR-002 / SP2-P2-02)
        Trip trip = tripRepository.findByIdForUpdate(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        // Re-check idempotency after acquiring lock to guard against same-key race
        Optional<Booking> existingAfterLock = bookingRepository.findByPassenger_IdAndIdempotencyKey(
                principal.userId(), key);
        if (existingAfterLock.isPresent()) {
            return verifySameTripAndMap(existingAfterLock.get(), tripId);
        }

        if (trip.getStatus() == TripStatus.FULL) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Trip is already full — no seats available");
        }
        if (trip.getStatus() != TripStatus.PUBLISHED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Trip is not open for booking (status: " + trip.getStatus() + ")");
        }
        if (trip.getAvailableSeats() < req.seatCount()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Insufficient available seats: requested " + req.seatCount()
                            + ", available " + trip.getAvailableSeats());
        }

        int capacity = trip.getVehicle().getSeatCapacity();
        int bookedBefore = trip.getBookedSeats();
        BigDecimal unitFare = tripSearchService.estimateFare(trip.getFare(), capacity, bookedBefore);
        BigDecimal totalEstimatedFare = unitFare
                .multiply(BigDecimal.valueOf(req.seatCount()))
                .setScale(2, RoundingMode.HALF_UP);

        // Claim seats atomically in the same transaction
        try {
            trip.reserveSeats(req.seatCount());
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }
        tripRepository.save(trip);

        Booking booking = new Booking(
                generateBookingCode(),
                trip,
                passenger,
                key,
                req.seatCount(),
                req.pickup().label().strip(),
                req.pickup().latitude(),
                req.pickup().longitude(),
                req.dropoff().label().strip(),
                req.dropoff().latitude(),
                req.dropoff().longitude(),
                totalEstimatedFare,
                autoConfirm);

        Booking saved = bookingRepository.save(booking);
        return BookingResponse.from(saved);
    }

    // ================================================================== Queries

    /** GET /api/v1/bookings/me */
    @Transactional(readOnly = true)
    public List<BookingResponse> listMyBookings(AuthPrincipal principal) {
        requireAuthenticated(principal);
        return bookingRepository.findAllByPassenger_IdOrderByCreatedAtDesc(principal.userId())
                .stream()
                .map(BookingResponse::from)
                .toList();
    }

    /** GET /api/v1/trips/{tripId}/bookings */
    @Transactional(readOnly = true)
    public List<BookingResponse> listTripBookings(Long tripId, AuthPrincipal principal) {
        requireAuthenticated(principal);
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        requireTripOperatorOrAdmin(trip, principal);
        return bookingRepository.findAllByTrip_IdOrderByCreatedAtAsc(tripId)
                .stream()
                .map(BookingResponse::from)
                .toList();
    }

    /** GET /api/v1/bookings/{bookingId} */
    @Transactional(readOnly = true)
    public BookingResponse getBooking(Long bookingId, AuthPrincipal principal) {
        requireAuthenticated(principal);
        Booking booking = requireBooking(bookingId);
        requireBookingViewer(booking, principal);
        return BookingResponse.from(booking);
    }

    // ================================================================== Lifecycle Transitions

    /**
     * POST /api/v1/bookings/{bookingId}/cancel
     * Cancels a PENDING or CONFIRMED booking and releases its reserved seats once.
     */
    public BookingResponse cancelBooking(
            Long bookingId,
            String idempotencyKey,
            CancelBookingRequest req,
            AuthPrincipal principal) {

        requireAuthenticated(principal);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            validateIdempotencyKey(idempotencyKey);
        }

        Booking booking = requireBooking(bookingId);
        requireBookingCanceller(booking, principal);

        // Lock Trip row to release seats atomically
        Trip trip = tripRepository.findByIdForUpdate(booking.getTrip().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        if (trip.getStatus() == TripStatus.COMPLETED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Cannot cancel booking for a completed trip");
        }
        if (booking.getStatus() != BookingStatus.PENDING
                && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Booking cannot be cancelled in status: " + booking.getStatus());
        }

        String reason = req != null ? req.reason() : null;
        booking.cancel(reason);
        trip.releaseSeats(booking.getSeatCount());

        tripRepository.save(trip);
        Booking saved = bookingRepository.save(booking);
        return BookingResponse.from(saved);
    }

    /**
     * POST /api/v1/bookings/{bookingId}/confirm
     * Confirms a PENDING booking (used when auto-confirm policy is disabled).
     */
    public BookingResponse confirmBooking(Long bookingId, AuthPrincipal principal) {
        requireAuthenticated(principal);
        Booking booking = requireBooking(bookingId);
        requireTripOperatorOrAdmin(booking.getTrip(), principal);

        try {
            booking.confirm();
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }
        return BookingResponse.from(bookingRepository.save(booking));
    }

    /**
     * POST /api/v1/bookings/{bookingId}/no-show
     * Marks a booking as NO_SHOW and releases its seats once.
     */
    public BookingResponse markNoShow(
            Long bookingId,
            CancelBookingRequest req,
            AuthPrincipal principal) {

        requireAuthenticated(principal);
        Booking booking = requireBooking(bookingId);
        requireTripOperatorOrAdmin(booking.getTrip(), principal);

        Trip trip = tripRepository.findByIdForUpdate(booking.getTrip().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        if (booking.getStatus() != BookingStatus.PENDING
                && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Booking cannot be marked NO_SHOW in status: " + booking.getStatus());
        }

        String reason = req != null ? req.reason() : null;
        booking.markNoShow(reason);
        trip.releaseSeats(booking.getSeatCount());

        tripRepository.save(trip);
        Booking saved = bookingRepository.save(booking);
        return BookingResponse.from(saved);
    }

    // ================================================================== Helpers

    private Booking requireBooking(Long bookingId) {
        return bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
    }

    private User requireActiveUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User account is locked");
        }
        return user;
    }

    private static void requireAuthenticated(AuthPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
    }

    private static void requirePassengerRole(AuthPrincipal principal) {
        requireAuthenticated(principal);
        if (principal.role() != UserRole.PASSENGER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Only PASSENGER accounts can create bookings");
        }
    }

    private static void requireBookingViewer(Booking booking, AuthPrincipal principal) {
        boolean isPassengerOwner = booking.getPassenger().getId().equals(principal.userId());
        boolean isCompanyOwner = booking.getTrip().getCompany().getOwner().getId().equals(principal.userId());
        boolean isDriverRole = principal.role() == UserRole.DRIVER;
        boolean isAdmin = principal.role() == UserRole.ADMIN;

        if (!isPassengerOwner && !isCompanyOwner && !isDriverRole && !isAdmin) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Access denied to this booking");
        }
    }

    private static void requireBookingCanceller(Booking booking, AuthPrincipal principal) {
        boolean isPassengerOwner = booking.getPassenger().getId().equals(principal.userId());
        boolean isCompanyOwner = booking.getTrip().getCompany().getOwner().getId().equals(principal.userId());
        boolean isAdmin = principal.role() == UserRole.ADMIN;

        if (!isPassengerOwner && !isCompanyOwner && !isAdmin) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Not authorized to cancel this booking");
        }
    }

    private static void requireTripOperatorOrAdmin(Trip trip, AuthPrincipal principal) {
        boolean isCompanyOwner = trip.getCompany().getOwner().getId().equals(principal.userId());
        boolean isDriverRole = principal.role() == UserRole.DRIVER;
        boolean isAdmin = principal.role() == UserRole.ADMIN;

        if (!isCompanyOwner && !isDriverRole && !isAdmin) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Access denied to this trip's bookings");
        }
    }

    private static String validateIdempotencyKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Idempotency-Key header is required");
        }
        String trimmed = idempotencyKey.strip();
        if (trimmed.length() < MIN_IDEMPOTENCY_KEY_LEN || trimmed.length() > MAX_IDEMPOTENCY_KEY_LEN) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Idempotency-Key must be between 8 and 100 characters");
        }
        return trimmed;
    }

    private static void validateBookingRequest(CreateBookingRequest req) {
        if (req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        if (req.seatCount() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT, "seatCount must be at least 1");
        }
        if (req.pickup() == null || req.pickup().label() == null || req.pickup().label().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT, "Pickup address is required");
        }
        if (req.dropoff() == null || req.dropoff().label() == null || req.dropoff().label().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT, "Dropoff address is required");
        }
        String pickupLabel = req.pickup().label().strip();
        String dropoffLabel = req.dropoff().label().strip();
        if (pickupLabel.equalsIgnoreCase(dropoffLabel)) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT,
                    "Pickup and dropoff addresses must be different");
        }
    }

    private static BookingResponse verifySameTripAndMap(Booking existing, Long requestedTripId) {
        if (!existing.getTrip().getId().equals(requestedTripId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Idempotency-Key was already used for another trip");
        }
        return BookingResponse.from(existing);
    }

    private static String generateBookingCode() {
        String randomPart = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "BK-" + randomPart;
    }
}
