package com.ridesharehub.route;

import java.math.BigDecimal;
import java.time.Instant;

/** Read-only response view for Route. */
public record RouteResponse(
        Long id,
        Long companyId,
        String name,
        String origin,
        String destination,
        int estimatedMinutes,
        BigDecimal baseFare,
        String description,
        Instant createdAt) {

    public static RouteResponse from(Route r) {
        return new RouteResponse(
                r.getId(),
                r.getCompany().getId(),
                r.getName(),
                r.getOrigin(),
                r.getDestination(),
                r.getEstimatedMinutes(),
                r.getBaseFare(),
                r.getDescription(),
                r.getCreatedAt());
    }
}

