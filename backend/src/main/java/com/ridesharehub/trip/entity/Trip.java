package com.ridesharehub.trip.entity;

import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.entity.Vehicle;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.route.entity.Route;
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
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import com.ridesharehub.trip.enums.TripStatus;

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

    @Column(name = "booked_seats", nullable = false)
    private int bookedSeats = 0;

    @Version
    @Column(nullable = false)
    private long version = 0L;

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

    /**
     * Atomically claims {@code count} seats on a PUBLISHED trip.
     * Transitions the trip to FULL when all vehicle capacity is claimed.
     */
    public void reserveSeats(int count) {
        if (count <= 0) {
            throw new IllegalArgumentException("seatCount must be > 0");
        }
        if (this.status != TripStatus.PUBLISHED) {
            throw new IllegalStateException("Trip is not bookable in status: " + this.status);
        }
        int capacity = this.vehicle.getSeatCapacity();
        if (this.bookedSeats + count > capacity) {
            throw new IllegalStateException(
                    "Insufficient available seats: requested " + count
                            + ", available " + (capacity - this.bookedSeats));
        }
        this.bookedSeats += count;
        if (this.bookedSeats == capacity) {
            this.status = TripStatus.FULL;
        }
        this.updatedAt = Instant.now();
    }

    /**
     * Releases {@code count} previously held seats upon final cancellation or no-show.
     * Transitions a FULL trip back to PUBLISHED when seats become available again.
     */
    public void releaseSeats(int count) {
        if (count <= 0) {
            throw new IllegalArgumentException("seatCount must be > 0");
        }
        if (this.bookedSeats < count) {
            throw new IllegalStateException("Cannot release more seats than currently booked");
        }
        this.bookedSeats -= count;
        if (this.status == TripStatus.FULL && this.bookedSeats < this.vehicle.getSeatCapacity()) {
            this.status = TripStatus.PUBLISHED;
        }
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
    public int getBookedSeats()          { return bookedSeats; }
    public int getAvailableSeats()       { return vehicle.getSeatCapacity() - bookedSeats; }
    public long getVersion()             { return version; }
    public Instant getCreatedAt()        { return createdAt; }
    public Instant getUpdatedAt()        { return updatedAt; }
}

