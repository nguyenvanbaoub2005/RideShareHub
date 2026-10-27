package com.ridesharehub.company;

import jakarta.validation.constraints.NotNull;

/** PUT /api/v1/companies/{companyId}/vehicles/{vehicleId}/status */
public record VehicleStatusRequest(@NotNull VehicleStatus status) { }
