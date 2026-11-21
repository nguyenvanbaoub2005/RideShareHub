package com.ridesharehub.trip.entity;

import com.ridesharehub.trip.enums.RouteProposalStatus;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * SP3-P1-03 & SP3-P1-05: Route optimization proposal produced by the Python OR-Tools service.
 * The optimizer never mutates Trip/TripStop directly; only accepting a PROPOSED proposal applies it.
 */
@Entity
@Table(name = "route_proposals")
public class RouteProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RouteProposalStatus status = RouteProposalStatus.PROPOSED;

    @Column(name = "solver_engine", nullable = false, length = 64)
    private String solverEngine;

    @Column(name = "solver_status", nullable = false, length = 32)
    private String solverStatus = "OPTIMAL";

    @Column(name = "total_distance_km", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalDistanceKm = BigDecimal.ZERO;

    @Column(name = "baseline_distance_km", nullable = false, precision = 10, scale = 2)
    private BigDecimal baselineDistanceKm = BigDecimal.ZERO;

    @Column(name = "distance_saved_km", nullable = false, precision = 10, scale = 2)
    private BigDecimal distanceSavedKm = BigDecimal.ZERO;

    @Column(name = "total_duration_minutes", nullable = false)
    private int totalDurationMinutes;

    @Column(name = "max_seats_on_board", nullable = false)
    private int maxSeatsOnBoard;

    @Column(name = "vehicle_capacity", nullable = false)
    private int vehicleCapacity = 1;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "reviewed_by_user_id")
    private Long reviewedByUserId;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "proposal", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stopOrder ASC")
    private List<RouteProposalStop> stops = new ArrayList<>();

    protected RouteProposal() { }

    public RouteProposal(
            Trip trip,
            String solverEngine,
            String solverStatus,
            BigDecimal totalDistanceKm,
            BigDecimal baselineDistanceKm,
            BigDecimal distanceSavedKm,
            int totalDurationMinutes,
            int maxSeatsOnBoard,
            int vehicleCapacity,
            Long createdByUserId) {
        this.trip = trip;
        this.solverEngine = solverEngine;
        this.solverStatus = solverStatus;
        this.totalDistanceKm = totalDistanceKm != null ? totalDistanceKm : BigDecimal.ZERO;
        this.baselineDistanceKm = baselineDistanceKm != null ? baselineDistanceKm : BigDecimal.ZERO;
        this.distanceSavedKm = distanceSavedKm != null ? distanceSavedKm : BigDecimal.ZERO;
        this.totalDurationMinutes = totalDurationMinutes;
        this.maxSeatsOnBoard = maxSeatsOnBoard;
        this.vehicleCapacity = vehicleCapacity;
        this.createdByUserId = createdByUserId;
    }

    public void addStop(RouteProposalStop stop) {
        stop.assignProposal(this);
        this.stops.add(stop);
    }

    public void accept(Long reviewerUserId) {
        if (this.status == RouteProposalStatus.ACCEPTED) {
            return; // Idempotent
        }
        if (this.status != RouteProposalStatus.PROPOSED) {
            throw new IllegalStateException(
                    "Chỉ có thể duyệt phương án đang ở trạng thái PROPOSED (hiện tại: " + this.status + ")");
        }
        this.status = RouteProposalStatus.ACCEPTED;
        this.reviewedByUserId = reviewerUserId;
        this.reviewedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void reject(Long reviewerUserId, String reason) {
        if (this.status == RouteProposalStatus.REJECTED) {
            return; // Idempotent
        }
        if (this.status != RouteProposalStatus.PROPOSED) {
            throw new IllegalStateException(
                    "Chỉ có thể từ chối phương án đang ở trạng thái PROPOSED (hiện tại: " + this.status + ")");
        }
        this.status = RouteProposalStatus.REJECTED;
        this.rejectReason = reason;
        this.reviewedByUserId = reviewerUserId;
        this.reviewedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void markSuperseded() {
        if (this.status == RouteProposalStatus.SUPERSEDED) {
            return;
        }
        this.status = RouteProposalStatus.SUPERSEDED;
        this.updatedAt = Instant.now();
    }

    public Long getId()                         { return id; }
    public Trip getTrip()                       { return trip; }
    public RouteProposalStatus getStatus()      { return status; }
    public String getSolverEngine()             { return solverEngine; }
    public String getSolverStatus()             { return solverStatus; }
    public BigDecimal getTotalDistanceKm()      { return totalDistanceKm; }
    public BigDecimal getBaselineDistanceKm()   { return baselineDistanceKm; }
    public BigDecimal getDistanceSavedKm()      { return distanceSavedKm; }
    public int getTotalDurationMinutes()        { return totalDurationMinutes; }
    public int getMaxSeatsOnBoard()             { return maxSeatsOnBoard; }
    public int getVehicleCapacity()             { return vehicleCapacity; }
    public String getRejectReason()             { return rejectReason; }
    public Long getCreatedByUserId()            { return createdByUserId; }
    public Long getReviewedByUserId()           { return reviewedByUserId; }
    public Instant getReviewedAt()              { return reviewedAt; }
    public Instant getCreatedAt()               { return createdAt; }
    public Instant getUpdatedAt()               { return updatedAt; }
    public List<RouteProposalStop> getStops()   { return stops; }
}
