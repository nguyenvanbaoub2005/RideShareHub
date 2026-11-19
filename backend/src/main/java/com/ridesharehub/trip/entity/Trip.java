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
import com.ridesharehub.trip.enums.DriverAssignmentStatus;
import com.ridesharehub.trip.enums.TripStatus;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "trip_status")
    private TripStatus status = TripStatus.DRAFT;

    @Column(name = "booked_seats", nullable = false)
    private int bookedSeats = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_status", nullable = false, length = 20)
    private DriverAssignmentStatus assignmentStatus = DriverAssignmentStatus.ASSIGNED;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "last_lat", precision = 10, scale = 7)
    private BigDecimal lastLat;

    @Column(name = "last_lng", precision = 10, scale = 7)
    private BigDecimal lastLng;

    @Column(name = "last_heading", precision = 6, scale = 2)
    private BigDecimal lastHeading;

    @Column(name = "last_speed_kmh", precision = 6, scale = 2)
    private BigDecimal lastSpeedKmh;

    @Column(name = "last_location_at")
    private Instant lastLocationAt;

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
        this(route, company, vehicle, driver, departureTime, fare, null);
    }

    public Trip(Route route, TransportCompany company, Vehicle vehicle, Driver driver,
            Instant departureTime, BigDecimal fare, String note) {
        if (fare.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("fare must be >= 0");
        this.route = route;
        this.company = company;
        this.vehicle = vehicle;
        this.driver = driver;
        this.departureTime = departureTime;
        this.fare = fare;
        this.note = (note != null && !note.isBlank()) ? note.strip() : null;
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
     * Cancels a trip — allowed from DRAFT, PUBLISHED or FULL (before departure/in-progress).
     */
    public void cancel() {
        if (this.status == TripStatus.IN_PROGRESS
                || this.status == TripStatus.COMPLETED
                || this.status == TripStatus.CANCELLED) {
            throw new IllegalStateException("Trip cannot be cancelled in state: " + this.status);
        }
        this.status = TripStatus.CANCELLED;
        this.bookedSeats = 0;
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
        this.assignmentStatus = DriverAssignmentStatus.ASSIGNED;
        this.acceptedAt = null;
        this.departureTime = departureTime;
        this.fare = fare;
        this.note = note;
        this.updatedAt = Instant.now();
    }

    /**
     * SP3-P2-01b: Driver accepts the assigned trip. Idempotent if already ACCEPTED.
     */
    public void acceptAssignment() {
        if (this.status == TripStatus.CANCELLED || this.status == TripStatus.COMPLETED) {
            throw new IllegalStateException("Cannot accept assignment on a terminal trip: " + this.status);
        }
        if (this.assignmentStatus == DriverAssignmentStatus.ACCEPTED) {
            return; // Idempotent
        }
        if (this.assignmentStatus == DriverAssignmentStatus.REJECTED) {
            throw new IllegalStateException("Assignment was already rejected");
        }
        this.assignmentStatus = DriverAssignmentStatus.ACCEPTED;
        this.acceptedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * SP3-P2-01b: Driver rejects the assigned trip before accepting/starting it.
     */
    public void rejectAssignment() {
        if (this.status == TripStatus.IN_PROGRESS
                || this.status == TripStatus.COMPLETED
                || this.status == TripStatus.CANCELLED) {
            throw new IllegalStateException("Cannot reject assignment when trip is in status: " + this.status);
        }
        if (this.assignmentStatus == DriverAssignmentStatus.REJECTED) {
            return; // Idempotent
        }
        if (this.assignmentStatus == DriverAssignmentStatus.ACCEPTED) {
            throw new IllegalStateException("Cannot reject a trip that has already been accepted");
        }
        this.assignmentStatus = DriverAssignmentStatus.REJECTED;
        this.updatedAt = Instant.now();
    }

    /**
     * SP3-P2-01: Driver starts the trip (PUBLISHED / FULL -> IN_PROGRESS).
     */
    public void startTrip() {
        if (this.status == TripStatus.IN_PROGRESS) {
            return; // Idempotent
        }
        if (this.status != TripStatus.PUBLISHED && this.status != TripStatus.FULL) {
            throw new IllegalStateException("Trip can only be started from PUBLISHED or FULL status (current: " + this.status + ")");
        }
        if (this.assignmentStatus != DriverAssignmentStatus.ACCEPTED) {
            throw new IllegalStateException("Driver must ACCEPT the trip assignment before starting the trip");
        }
        this.status = TripStatus.IN_PROGRESS;
        this.startedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * SP3-P2-01: Driver completes the trip (IN_PROGRESS -> COMPLETED) after all required stops resolve.
     */
    public void completeTrip() {
        if (this.status == TripStatus.COMPLETED) {
            return; // Idempotent
        }
        if (this.status != TripStatus.IN_PROGRESS) {
            throw new IllegalStateException("Only IN_PROGRESS trips can be completed (current: " + this.status + ")");
        }
        this.status = TripStatus.COMPLETED;
        this.completedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /**
     * SP3-P2-02: Records latest driver GPS location sample on the Trip.
     */
    public void updateDriverLocation(
            BigDecimal latitude,
            BigDecimal longitude,
            BigDecimal heading,
            BigDecimal speedKmh) {
        this.lastLat = latitude;
        this.lastLng = longitude;
        this.lastHeading = heading;
        this.lastSpeedKmh = speedKmh;
        this.lastLocationAt = Instant.now();
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
    public DriverAssignmentStatus getAssignmentStatus() { return assignmentStatus; }
    public Instant getAcceptedAt()       { return acceptedAt; }
    public Instant getStartedAt()        { return startedAt; }
    public Instant getCompletedAt()      { return completedAt; }
    public BigDecimal getLastLat()       { return lastLat; }
    public BigDecimal getLastLng()       { return lastLng; }
    public BigDecimal getLastHeading()   { return lastHeading; }
    public BigDecimal getLastSpeedKmh()  { return lastSpeedKmh; }
    public Instant getLastLocationAt()   { return lastLocationAt; }
    public int getBookedSeats()          { return bookedSeats; }
    public int getAvailableSeats()       { return vehicle.getSeatCapacity() - bookedSeats; }
    public long getVersion()             { return version; }
    public Instant getCreatedAt()        { return createdAt; }
    public Instant getUpdatedAt()        { return updatedAt; }
}

