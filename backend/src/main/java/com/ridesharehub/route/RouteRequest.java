package com.ridesharehub.route;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** POST/PUT /api/v1/companies/{companyId}/routes */
public record RouteRequest(
        @NotBlank @Size(max = 200) String name,
        @NotBlank @Size(max = 200) String origin,
        @NotBlank @Size(max = 200) String destination,
        @NotNull @Min(1)           Integer estimatedMinutes,
        @NotNull @DecimalMin("0")  BigDecimal baseFare,
        @Size(max = 2000)          String description) { }

