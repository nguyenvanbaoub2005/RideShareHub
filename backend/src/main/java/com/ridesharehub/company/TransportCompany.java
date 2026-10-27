package com.ridesharehub.company;

import com.ridesharehub.auth.User;
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
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "transport_companies")
public class TransportCompany {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false, unique = true)
    private User owner;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "business_license_no", length = 50)
    private String businessLicenseNo;

    @Column(name = "tax_code", length = 30)
    private String taxCode;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(name = "contact_phone", nullable = false, length = 20)
    private String contactPhone;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "representative_name", nullable = false, length = 150)
    private String representativeName;

    @Column(name = "business_information", nullable = false, columnDefinition = "TEXT")
    private String businessInformation;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "company_status")
    private CompanyStatus status = CompanyStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "avg_rating", nullable = false, precision = 3, scale = 2)
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount = 0;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected TransportCompany() { }

    /** Called when a TRANSPORT_COMPANY user submits a registration. */
    public TransportCompany(User owner, String name, String address, String contactPhone,
            String representativeName, String businessInformation) {
        this.owner = owner;
        this.name = name;
        this.address = address;
        this.contactPhone = contactPhone;
        this.representativeName = representativeName;
        this.businessInformation = businessInformation;
    }

    // ------------------------------------------------------------------ mutators

    public void approve(User admin) {
        if (this.status != CompanyStatus.PENDING) {
            throw new IllegalStateException("Company is not in PENDING state");
        }
        this.status = CompanyStatus.APPROVED;
        this.approvedBy = admin;
        this.approvedAt = Instant.now();
        this.rejectReason = null;
        this.updatedAt = Instant.now();
    }

    public void reject(User admin, String reason) {
        if (this.status != CompanyStatus.PENDING) {
            throw new IllegalStateException("Company is not in PENDING state");
        }
        this.status = CompanyStatus.REJECTED;
        this.approvedBy = admin;
        this.approvedAt = Instant.now();
        this.rejectReason = reason;
        this.updatedAt = Instant.now();
    }

    public boolean isApproved() { return status == CompanyStatus.APPROVED; }

    // ------------------------------------------------------------------ accessors

    public Long getId()                    { return id; }
    public User getOwner()                 { return owner; }
    public String getName()                { return name; }
    public String getAddress()             { return address; }
    public String getContactPhone()        { return contactPhone; }
    public String getContactEmail()        { return contactEmail; }
    public String getRepresentativeName()  { return representativeName; }
    public String getBusinessInformation() { return businessInformation; }
    public String getDescription()         { return description; }
    public String getLogoUrl()             { return logoUrl; }
    public CompanyStatus getStatus()       { return status; }
    public User getApprovedBy()            { return approvedBy; }
    public Instant getApprovedAt()         { return approvedAt; }
    public String getRejectReason()        { return rejectReason; }
    public BigDecimal getAvgRating()       { return avgRating; }
    public int getRatingCount()            { return ratingCount; }
    public long getVersion()               { return version; }
    public Instant getCreatedAt()          { return createdAt; }
    public Instant getUpdatedAt()          { return updatedAt; }
}
