package com.ridesharehub.route;

import com.ridesharehub.company.TransportCompany;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "routes")
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private TransportCompany company;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 200)
    private String origin;

    @Column(nullable = false, length = 200)
    private String destination;

    @Column(name = "estimated_minutes", nullable = false)
    private int estimatedMinutes;

    @Column(name = "base_fare", nullable = false, precision = 12, scale = 2)
    private BigDecimal baseFare = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Route() { }

    public Route(TransportCompany company, String name, String origin,
            String destination, int estimatedMinutes, BigDecimal baseFare) {
        if (estimatedMinutes <= 0) throw new IllegalArgumentException("estimatedMinutes must be > 0");
        if (baseFare.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("baseFare must be >= 0");
        this.company = company;
        this.name = name;
        this.origin = origin;
        this.destination = destination;
        this.estimatedMinutes = estimatedMinutes;
        this.baseFare = baseFare;
    }

    // ------------------------------------------------------------------ mutators

    public void updateDetails(String name, String origin, String destination,
            int estimatedMinutes, BigDecimal baseFare, String description) {
        if (estimatedMinutes <= 0) throw new IllegalArgumentException("estimatedMinutes must be > 0");
        if (baseFare.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException("baseFare must be >= 0");
        this.name = name;
        this.origin = origin;
        this.destination = destination;
        this.estimatedMinutes = estimatedMinutes;
        this.baseFare = baseFare;
        this.description = description;
        this.updatedAt = Instant.now();
    }

    // ------------------------------------------------------------------ accessors

    public Long getId()                  { return id; }
    public TransportCompany getCompany() { return company; }
    public String getName()              { return name; }
    public String getOrigin()            { return origin; }
    public String getDestination()       { return destination; }
    public int getEstimatedMinutes()     { return estimatedMinutes; }
    public BigDecimal getBaseFare()      { return baseFare; }
    public String getDescription()       { return description; }
    public Instant getCreatedAt()        { return createdAt; }
    public Instant getUpdatedAt()        { return updatedAt; }
}

