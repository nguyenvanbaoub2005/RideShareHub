package com.ridesharehub.driver.dto;

import jakarta.validation.constraints.NotNull;
import com.ridesharehub.driver.enums.DriverStatus;

/** PUT /api/v1/companies/{companyId}/drivers/{driverId}/status */
public record DriverStatusRequest(@NotNull DriverStatus status) { }

