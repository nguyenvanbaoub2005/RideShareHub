package com.ridesharehub.rating.entity;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.trip.entity.Trip;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * SP4-P1-01: Single 1-5 star passenger rating per completed booking.
 */
@Entity
@Table(name = "ratings")
public class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private TransportCompany company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id", nullable = false)
    private User passenger;

    @Column(nullable = false)
    private int score;

    @Column(name = "trip_score", nullable = false)
    private int tripScore;

    @Column(name = "driver_score", nullable = false)
    private int driverScore;

    @Column(name = "company_score", nullable = false)
    private int companyScore;

    @Column(length = 500)
    private String comment;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Rating() { }

    public Rating(
            Booking booking,
            Trip trip,
            TransportCompany company,
            Driver driver,
            User passenger,
            int score,
            int tripScore,
            int driverScore,
            int companyScore,
            String comment) {
        this.booking = booking;
        this.trip = trip;
        this.company = company;
        this.driver = driver;
        this.passenger = passenger;
        this.score = score;
        this.tripScore = tripScore;
        this.driverScore = driverScore;
        this.companyScore = companyScore;
        this.comment = comment;
    }

    public Long getId()                    { return id; }
    public Booking getBooking()            { return booking; }
    public Trip getTrip()                  { return trip; }
    public TransportCompany getCompany()   { return company; }
    public Driver getDriver()              { return driver; }
    public User getPassenger()             { return passenger; }
    public int getScore()                  { return score; }
    public int getTripScore()              { return tripScore; }
    public int getDriverScore()            { return driverScore; }
    public int getCompanyScore()           { return companyScore; }
    public String getComment()             { return comment; }
    public Instant getCreatedAt()          { return createdAt; }
}
