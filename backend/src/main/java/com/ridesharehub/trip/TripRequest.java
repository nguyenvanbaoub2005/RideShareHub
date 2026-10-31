package com.ridesharehub.trip;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

/** POST/PUT /api/v1/companies/{companyId}/trips */
public record TripRequest(
        @NotNull              Long routeId,
        @NotNull              Long vehicleId,
        @NotNull              Long driverId,
        @NotNull @Future      Instant departureTime,
        @NotNull @DecimalMin("0") BigDecimal fare,
        String note) { }

