package com.ridesharehub.company;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * POST /api/v1/admin/companies/{companyId}/decision
 * Aligned with openapi.yaml decision schema.
 */
public record CompanyDecisionRequest(
        @NotNull DecisionType decision,
        @Size(max = 500) String reason) { }
