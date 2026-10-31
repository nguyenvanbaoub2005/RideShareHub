package com.ridesharehub.trip;

import com.ridesharehub.company.TransportCompany;
import com.ridesharehub.company.Vehicle;
import com.ridesharehub.driver.Driver;
import com.ridesharehub.route.Route;
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
@Table(name = "trips")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private TransportCompany company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    @Column(name = "departure_time", nullable = false)
    private Instant departureTime;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal fare;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "trip_status")
    private TripStatus status = TripStatus.DRAFT;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Trip() { }

    public Trip(Route route, TransportCompany company, Vehicle vehicle, Driver driver,
            Instant departureTime, BigDecimal fare) {
        if (fare.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("fare must be >= 0");
        this.route = route;
        this.company = company;
        this.vehicle = vehicle;
        this.driver = driver;
        this.departureTime = departureTime;
        this.fare = fare;
    }

    // ------------------------------------------------------------------ mutators

    /**
     * Publishes a DRAFT trip so passengers can see it.
     * Only APPROVED companies may publish (enforced in service layer).
     */
    public void publish() {
        if (this.status != TripStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT trips can be published");
        }
        this.status = TripStatus.PUBLISHED;
        this.updatedAt = Instant.now();
    }

    /**
     * Cancels a trip — allowed from DRAFT or PUBLISHED.
     */
    public void cancel() {
        if (this.status == TripStatus.COMPLETED || this.status == TripStatus.CANCELLED) {
            throw new IllegalStateException("Trip is already in terminal state: " + this.status);
        }
        this.status = TripStatus.CANCELLED;
        this.updatedAt = Instant.now();
    }

    public void updateDetails(Vehicle vehicle, Driver driver, Instant departureTime,
            BigDecimal fare, String note) {
        if (this.status != TripStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT trips can be updated freely");
        }
        if (fare.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("fare must be >= 0");
        this.vehicle = vehicle;
        this.driver = driver;
        this.departureTime = departureTime;
        this.fare = fare;
        this.note = note;
        this.updatedAt = Instant.now();
    }

    // ------------------------------------------------------------------ accessors

    public Long getId()                  { return id; }
    public Route getRoute()              { return route; }
    public TransportCompany getCompany() { return company; }
    public Vehicle getVehicle()          { return vehicle; }
    public Driver getDriver()            { return driver; }
    public Instant getDepartureTime()    { return departureTime; }
    public BigDecimal getFare()          { return fare; }
    public String getNote()              { return note; }
    public TripStatus getStatus()        { return status; }
    public Instant getCreatedAt()        { return createdAt; }
    public Instant getUpdatedAt()        { return updatedAt; }
}

