package com.ridesharehub.trip.entity;

import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.trip.enums.TripIncidentStatus;
import com.ridesharehub.trip.enums.TripIncidentType;
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

/**
 * SP4-P2-01: Operational incident reported by an assigned driver during a trip.
 */
@Entity
@Table(name = "trip_incidents")
public class TripIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    @Column(name = "reported_by_user_id", nullable = false)
    private Long reportedByUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "incident_type", nullable = false, length = 40)
    private TripIncidentType incidentType;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripIncidentStatus status = TripIncidentStatus.OPEN;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @Column(name = "resolved_by_user_id")
    private Long resolvedByUserId;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected TripIncident() { }

    public TripIncident(
            Trip trip,
            Driver driver,
            Long reportedByUserId,
            TripIncidentType incidentType,
            String description,
            BigDecimal latitude,
            BigDecimal longitude) {
        this.trip = trip;
        this.driver = driver;
        this.reportedByUserId = reportedByUserId;
        this.incidentType = incidentType;
        this.description = description;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public void acknowledge() {
        if (this.status == TripIncidentStatus.OPEN) {
            this.status = TripIncidentStatus.ACKNOWLEDGED;
            this.updatedAt = Instant.now();
        }
    }

    public void resolve(Long resolverUserId, String note) {
        if (this.status == TripIncidentStatus.RESOLVED) {
            return; // Idempotent
        }
        this.status = TripIncidentStatus.RESOLVED;
        this.resolutionNote = note;
        this.resolvedByUserId = resolverUserId;
        this.resolvedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getId()                     { return id; }
    public Trip getTrip()                   { return trip; }
    public Driver getDriver()               { return driver; }
    public Long getReportedByUserId()       { return reportedByUserId; }
    public TripIncidentType getIncidentType() { return incidentType; }
    public String getDescription()          { return description; }
    public BigDecimal getLatitude()         { return latitude; }
    public BigDecimal getLongitude()        { return longitude; }
    public TripIncidentStatus getStatus()   { return status; }
    public String getResolutionNote()       { return resolutionNote; }
    public Long getResolvedByUserId()       { return resolvedByUserId; }
    public Instant getResolvedAt()          { return resolvedAt; }
    public Instant getCreatedAt()           { return createdAt; }
    public Instant getUpdatedAt()           { return updatedAt; }
}
