package com.ridesharehub.booking.entity;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.trip.entity.Trip;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * SP2-P2-01 & SP2-P2-02: Passenger Booking entity with idempotency scope
 * and explicit lifecycle transitions.
 */
@Entity
@Table(
        name = "bookings",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uq_bookings_passenger_idempotency",
                    columnNames = {"passenger_id", "idempotency_key"})
        })
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_code", nullable = false, unique = true, length = 20)
    private String bookingCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id", nullable = false)
    private User passenger;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "seat_count", nullable = false)
    private int seatCount;

    @Column(name = "pickup_address", nullable = false, length = 500)
    private String pickupAddress;

    @Column(name = "pickup_lat", precision = 10, scale = 7)
    private BigDecimal pickupLat;

    @Column(name = "pickup_lng", precision = 10, scale = 7)
    private BigDecimal pickupLng;

    @Column(name = "dropoff_address", nullable = false, length = 500)
    private String dropoffAddress;

    @Column(name = "dropoff_lat", precision = 10, scale = 7)
    private BigDecimal dropoffLat;

    @Column(name = "dropoff_lng", precision = 10, scale = 7)
    private BigDecimal dropoffLng;

    @Column(name = "estimated_fare", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedFare;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "booking_status")
    private BookingStatus status = BookingStatus.PENDING;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "picked_up_at")
    private Instant pickedUpAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Version
    @Column(nullable = false)
    private long version = 0L;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Booking() { }

    public Booking(
            String bookingCode,
            Trip trip,
            User passenger,
            String idempotencyKey,
            int seatCount,
            String pickupAddress,
            BigDecimal pickupLat,
            BigDecimal pickupLng,
            String dropoffAddress,
            BigDecimal dropoffLat,
            BigDecimal dropoffLng,
            BigDecimal estimatedFare,
            boolean autoConfirm) {
        if (seatCount <= 0) {
            throw new IllegalArgumentException("seatCount must be > 0");
        }
        if (estimatedFare == null || estimatedFare.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("estimatedFare must be >= 0");
        }
        this.bookingCode = bookingCode;
        this.trip = trip;
        this.passenger = passenger;
        this.idempotencyKey = idempotencyKey;
        this.seatCount = seatCount;
        this.pickupAddress = pickupAddress;
        this.pickupLat = pickupLat;
        this.pickupLng = pickupLng;
        this.dropoffAddress = dropoffAddress;
        this.dropoffLat = dropoffLat;
        this.dropoffLng = dropoffLng;
        this.estimatedFare = estimatedFare;
        if (autoConfirm) {
            this.status = BookingStatus.CONFIRMED;
            this.confirmedAt = Instant.now();
        } else {
            this.status = BookingStatus.PENDING;
        }
    }

    // ------------------------------------------------------------------ transitions

    /**
     * Transitions a PENDING booking to CONFIRMED.
     */
    public void confirm() {
        if (this.status != BookingStatus.PENDING) {
            throw new IllegalStateException(
                    "Only PENDING bookings can be confirmed (current: " + this.status + ")");
        }
        this.status = BookingStatus.CONFIRMED;
        this.confirmedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * Cancels a PENDING or CONFIRMED booking before pickup.
     */
    public void cancel(String reason) {
        if (this.status != BookingStatus.PENDING && this.status != BookingStatus.CONFIRMED) {
            throw new IllegalStateException(
                    "Booking cannot be cancelled in status: " + this.status);
        }
        this.status = BookingStatus.CANCELLED;
        this.cancelReason = (reason != null && !reason.isBlank()) ? reason.strip() : null;
        this.cancelledAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * Marks a PENDING or CONFIRMED booking as NO_SHOW when the passenger fails to board.
     */
    public void markNoShow(String reason) {
        if (this.status != BookingStatus.PENDING && this.status != BookingStatus.CONFIRMED) {
            throw new IllegalStateException(
                    "Booking cannot be marked NO_SHOW in status: " + this.status);
        }
        this.status = BookingStatus.NO_SHOW;
        this.cancelReason = (reason != null && !reason.isBlank()) ? reason.strip() : null;
        this.updatedAt = Instant.now();
    }

    // ------------------------------------------------------------------ accessors

    public Long getId()                   { return id; }
    public String getBookingCode()        { return bookingCode; }
    public Trip getTrip()                 { return trip; }
    public User getPassenger()            { return passenger; }
    public String getIdempotencyKey()     { return idempotencyKey; }
    public int getSeatCount()             { return seatCount; }
    public String getPickupAddress()      { return pickupAddress; }
    public BigDecimal getPickupLat()      { return pickupLat; }
    public BigDecimal getPickupLng()      { return pickupLng; }
    public String getDropoffAddress()     { return dropoffAddress; }
    public BigDecimal getDropoffLat()     { return dropoffLat; }
    public BigDecimal getDropoffLng()     { return dropoffLng; }
    public BigDecimal getEstimatedFare()  { return estimatedFare; }
    public BookingStatus getStatus()      { return status; }
    public String getCancelReason()       { return cancelReason; }
    public Instant getCancelledAt()       { return cancelledAt; }
    public Instant getConfirmedAt()       { return confirmedAt; }
    public Instant getPickedUpAt()        { return pickedUpAt; }
    public Instant getCompletedAt()       { return completedAt; }
    public long getVersion()              { return version; }
    public Instant getCreatedAt()         { return createdAt; }
    public Instant getUpdatedAt()         { return updatedAt; }
}

