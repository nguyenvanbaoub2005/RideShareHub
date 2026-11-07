package com.ridesharehub.company.dto;

import java.math.BigDecimal;
import java.time.Instant;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.enums.CompanyStatus;

/** Read-only response view matching the Company schema in openapi.yaml. */
public record CompanyResponse(
        Long id,
        String name,
        String address,
        String contactPhone,
        String contactEmail,
        String representativeName,
        CompanyStatus status,
        String rejectReason,
        BigDecimal avgRating,
        int ratingCount,
        long version,
        Instant createdAt) {

    public static CompanyResponse from(TransportCompany c) {
        return new CompanyResponse(
                c.getId(),
                c.getName(),
                c.getAddress(),
                c.getContactPhone(),
                c.getContactEmail(),
                c.getRepresentativeName(),
                c.getStatus(),
                c.getRejectReason(),
                c.getAvgRating(),
                c.getRatingCount(),
                c.getVersion(),
                c.getCreatedAt());
    }
}
