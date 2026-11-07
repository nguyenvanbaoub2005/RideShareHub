package com.ridesharehub.driver.dto;

import java.time.Instant;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.enums.DriverStatus;

/** Read-only response view for Driver. */
public record DriverResponse(
        Long id,
        Long companyId,
        String fullName,
        String phone,
        String licenseNumber,
        DriverStatus status,
        Instant createdAt) {

    public static DriverResponse from(Driver d) {
        return new DriverResponse(
                d.getId(),
                d.getCompany().getId(),
                d.getFullName(),
                d.getPhone(),
                d.getLicenseNumber(),
                d.getStatus(),
                d.getCreatedAt());
    }
}

