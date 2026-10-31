package com.ridesharehub.driver;

import com.ridesharehub.company.TransportCompany;
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
import java.time.Instant;

@Entity
@Table(name = "drivers")
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private TransportCompany company;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "license_number", nullable = false, length = 50)
    private String licenseNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "driver_status")
    private DriverStatus status = DriverStatus.AVAILABLE;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Driver() { }

    public Driver(TransportCompany company, String fullName, String phone, String licenseNumber) {
        this.company = company;
        this.fullName = fullName;
        this.phone = phone;
        this.licenseNumber = licenseNumber;
    }

    // ------------------------------------------------------------------ mutators

    public void updateDetails(String fullName, String phone, String licenseNumber) {
        this.fullName = fullName;
        this.phone = phone;
        this.licenseNumber = licenseNumber;
        this.updatedAt = Instant.now();
    }

    public void updateStatus(DriverStatus newStatus) {
        this.status = newStatus;
        this.updatedAt = Instant.now();
    }

    // ------------------------------------------------------------------ accessors

    public Long getId()                    { return id; }
    public TransportCompany getCompany()   { return company; }
    public String getFullName()            { return fullName; }
    public String getPhone()               { return phone; }
    public String getLicenseNumber()       { return licenseNumber; }
    public DriverStatus getStatus()        { return status; }
    public Instant getCreatedAt()          { return createdAt; }
    public Instant getUpdatedAt()          { return updatedAt; }
}

