package com.ridesharehub.admin.dto;

import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.enums.DriverStatus;
import java.time.Instant;

/**
 * SP4-P1-01: Read-only driver directory row for Admin.
 */
public record AdminDriverResponse(
        Long id,
        Long userId,
        Long companyId,
        String companyName,
        String fullName,
        String phone,
        String licenseNumber,
        DriverStatus status,
        long totalTrips,
        Instant createdAt) {

    public static AdminDriverResponse from(Driver driver, long totalTrips) {
        return new AdminDriverResponse(
                driver.getId(),
                driver.getUserId(),
                driver.getCompany().getId(),
                driver.getCompany().getName(),
                driver.getFullName(),
                driver.getPhone(),
                driver.getLicenseNumber(),
                driver.getStatus(),
                totalTrips,
                driver.getCreatedAt());
    }
}
