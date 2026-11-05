package com.ridesharehub.driver;

import jakarta.validation.constraints.NotNull;

/** PUT /api/v1/companies/{companyId}/drivers/{driverId}/status */
public record DriverStatusRequest(@NotNull DriverStatus status) { }

