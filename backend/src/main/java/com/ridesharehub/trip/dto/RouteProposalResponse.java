package com.ridesharehub.trip.dto;

import com.ridesharehub.trip.entity.RouteProposal;
import com.ridesharehub.trip.enums.RouteProposalStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record RouteProposalResponse(
        Long id,
        Long tripId,
        RouteProposalStatus status,
        String solverEngine,
        String solverStatus,
        BigDecimal totalDistanceKm,
        BigDecimal baselineDistanceKm,
        BigDecimal distanceSavedKm,
        int totalDurationMinutes,
        int maxSeatsOnBoard,
        int vehicleCapacity,
        String rejectReason,
        Long createdByUserId,
        Long reviewedByUserId,
        Instant reviewedAt,
        Instant createdAt,
        List<RouteProposalStopResponse> stops) {

    public static RouteProposalResponse from(RouteProposal p) {
        List<RouteProposalStopResponse> stopDtos = p.getStops().stream()
                .sorted(Comparator.comparingInt(s -> s.getStopOrder()))
                .map(RouteProposalStopResponse::from)
                .toList();
        return new RouteProposalResponse(
                p.getId(),
                p.getTrip().getId(),
                p.getStatus(),
                p.getSolverEngine(),
                p.getSolverStatus(),
                p.getTotalDistanceKm(),
                p.getBaselineDistanceKm(),
                p.getDistanceSavedKm(),
                p.getTotalDurationMinutes(),
                p.getMaxSeatsOnBoard(),
                p.getVehicleCapacity(),
                p.getRejectReason(),
                p.getCreatedByUserId(),
                p.getReviewedByUserId(),
                p.getReviewedAt(),
                p.getCreatedAt(),
                stopDtos);
    }
}
