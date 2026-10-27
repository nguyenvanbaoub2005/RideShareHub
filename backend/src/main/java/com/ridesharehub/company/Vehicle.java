package com.ridesharehub.company;

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
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private TransportCompany company;

    @Column(name = "plate_number", nullable = false, unique = true, length = 20)
    private String plateNumber;

    @Column(name = "vehicle_type", nullable = false, length = 50)
    private String vehicleType;

    @Column(length = 50)
    private String brand;

    @Column(length = 50)
    private String model;

    @Column(name = "seat_capacity", nullable = false)
    private int seatCapacity;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "vehicle_status")
    private VehicleStatus status = VehicleStatus.AVAILABLE;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Vehicle() { }

    public Vehicle(TransportCompany company, String plateNumber, String vehicleType,
            String brand, String model, int seatCapacity) {
        if (seatCapacity <= 0) throw new IllegalArgumentException("seat_capacity must be > 0");
        this.company = company;
        this.plateNumber = plateNumber;
        this.vehicleType = vehicleType;
        this.brand = brand;
        this.model = model;
        this.seatCapacity = seatCapacity;
    }

    // ------------------------------------------------------------------ mutators

    public void updateDetails(String vehicleType, String brand, String model,
            int seatCapacity, String description, String imageUrl) {
        if (seatCapacity <= 0) throw new IllegalArgumentException("seat_capacity must be > 0");
        this.vehicleType = vehicleType;
        this.brand = brand;
        this.model = model;
        this.seatCapacity = seatCapacity;
        this.description = description;
        this.imageUrl = imageUrl;
        this.updatedAt = Instant.now();
    }

    public void updateStatus(VehicleStatus newStatus) {
        this.status = newStatus;
        this.updatedAt = Instant.now();
    }

    // ------------------------------------------------------------------ accessors

    public Long getId()                { return id; }
    public TransportCompany getCompany() { return company; }
    public String getPlateNumber()     { return plateNumber; }
    public String getVehicleType()     { return vehicleType; }
    public String getBrand()           { return brand; }
    public String getModel()           { return model; }
    public int getSeatCapacity()       { return seatCapacity; }
    public String getDescription()     { return description; }
    public String getImageUrl()        { return imageUrl; }
    public VehicleStatus getStatus()   { return status; }
    public Instant getCreatedAt()      { return createdAt; }
    public Instant getUpdatedAt()      { return updatedAt; }
}
