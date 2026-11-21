package com.ridesharehub.trip.entity;

import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.trip.enums.TripStopStatus;
import com.ridesharehub.trip.enums.TripStopType;
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
 * SP3-P2-01: Operational pickup/dropoff stop for a passenger booking on a Trip.
 */
@Entity
@Table(
        name = "trip_stops",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uq_trip_stops_booking_type",
                    columnNames = {"booking_id", "stop_type"})
        })
public class TripStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "stop_type", nullable = false, length = 20)
    private TripStopType stopType;

    @Column(name = "stop_order", nullable = false)
    private int stopOrder;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripStopStatus status = TripStopStatus.PENDING;

    @Column(name = "arrived_at")
    private Instant arrivedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "planned_arrival_at")
    private Instant plannedArrivalAt;

    @Column(name = "proposal_id")
    private Long proposalId;

    @Version
    @Column(nullable = false)
    private long version = 0L;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected TripStop() { }

    public TripStop(
            Trip trip,
            Booking booking,
            TripStopType stopType,
            int stopOrder,
            String address,
            BigDecimal latitude,
            BigDecimal longitude) {
        this.trip = trip;
        this.booking = booking;
        this.stopType = stopType;
        this.stopOrder = stopOrder;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public void markArrived() {
        if (this.status == TripStopStatus.ARRIVED || this.status == TripStopStatus.COMPLETED) {
            return; // Idempotent
        }
        this.status = TripStopStatus.ARRIVED;
        this.arrivedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void markCompleted() {
        if (this.status == TripStopStatus.COMPLETED) {
            return; // Idempotent
        }
        if (this.arrivedAt == null) {
            this.arrivedAt = Instant.now();
        }
        this.status = TripStopStatus.COMPLETED;
        this.completedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void updateStopOrder(int newOrder) {
        this.stopOrder = newOrder;
        this.updatedAt = Instant.now();
    }

    public void applyOptimization(int newOrder, Instant plannedArrivalAt, Long proposalId) {
        this.stopOrder = newOrder;
        this.plannedArrivalAt = plannedArrivalAt;
        this.proposalId = proposalId;
        this.updatedAt = Instant.now();
    }

    public Long getId()                { return id; }
    public Trip getTrip()              { return trip; }
    public Booking getBooking()        { return booking; }
    public TripStopType getStopType()  { return stopType; }
    public int getStopOrder()          { return stopOrder; }
    public String getAddress()         { return address; }
    public BigDecimal getLatitude()    { return latitude; }
    public BigDecimal getLongitude()   { return longitude; }
    public TripStopStatus getStatus()  { return status; }
    public Instant getArrivedAt()      { return arrivedAt; }
    public Instant getCompletedAt()    { return completedAt; }
    public Instant getPlannedArrivalAt() { return plannedArrivalAt; }
    public Long getProposalId()        { return proposalId; }
    public long getVersion()           { return version; }
    public Instant getCreatedAt()      { return createdAt; }
    public Instant getUpdatedAt()      { return updatedAt; }
}
