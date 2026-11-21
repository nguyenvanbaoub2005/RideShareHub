package com.ridesharehub.trip.entity;

import com.ridesharehub.booking.entity.Booking;
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
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "route_proposal_stops")
public class RouteProposalStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposal_id", nullable = false)
    private RouteProposal proposal;

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

    @Column(name = "seat_delta", nullable = false)
    private int seatDelta;

    @Column(name = "cumulative_seats_on_board", nullable = false)
    private int cumulativeSeatsOnBoard;

    @Column(name = "distance_from_prev_km", nullable = false, precision = 10, scale = 2)
    private BigDecimal distanceFromPrevKm = BigDecimal.ZERO;

    @Column(name = "eta_offset_minutes", nullable = false)
    private int etaOffsetMinutes;

    @Column(name = "planned_arrival_at")
    private Instant plannedArrivalAt;

    protected RouteProposalStop() { }

    public RouteProposalStop(
            Booking booking,
            TripStopType stopType,
            int stopOrder,
            String address,
            BigDecimal latitude,
            BigDecimal longitude,
            int seatDelta,
            int cumulativeSeatsOnBoard,
            BigDecimal distanceFromPrevKm,
            int etaOffsetMinutes,
            Instant plannedArrivalAt) {
        this.booking = booking;
        this.stopType = stopType;
        this.stopOrder = stopOrder;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.seatDelta = seatDelta;
        this.cumulativeSeatsOnBoard = cumulativeSeatsOnBoard;
        this.distanceFromPrevKm = distanceFromPrevKm != null ? distanceFromPrevKm : BigDecimal.ZERO;
        this.etaOffsetMinutes = etaOffsetMinutes;
        this.plannedArrivalAt = plannedArrivalAt;
    }

    void assignProposal(RouteProposal proposal) {
        this.proposal = proposal;
    }

    public Long getId()                     { return id; }
    public RouteProposal getProposal()      { return proposal; }
    public Booking getBooking()             { return booking; }
    public TripStopType getStopType()       { return stopType; }
    public int getStopOrder()               { return stopOrder; }
    public String getAddress()              { return address; }
    public BigDecimal getLatitude()         { return latitude; }
    public BigDecimal getLongitude()        { return longitude; }
    public int getSeatDelta()               { return seatDelta; }
    public int getCumulativeSeatsOnBoard()  { return cumulativeSeatsOnBoard; }
    public BigDecimal getDistanceFromPrevKm() { return distanceFromPrevKm; }
    public int getEtaOffsetMinutes()        { return etaOffsetMinutes; }
    public Instant getPlannedArrivalAt()    { return plannedArrivalAt; }
}
