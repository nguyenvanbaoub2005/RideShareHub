package com.ridesharehub.trip.controller;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.RejectProposalRequest;
import com.ridesharehub.trip.dto.RouteProposalResponse;
import com.ridesharehub.trip.dto.SyncTripStopsRequest;
import com.ridesharehub.trip.dto.TripStopResponse;
import com.ridesharehub.trip.service.RouteOptimizationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SP3-P1-01, SP3-P1-03 & SP3-P1-05:
 * TripStop synchronization/reordering, AI VRPPD route optimization, and proposal review endpoints.
 */
@RestController
@RequestMapping({"/api/v1/trips", "/api/trips"})
public class RouteOptimizationController {

    private final RouteOptimizationService routeOptimizationService;

    public RouteOptimizationController(RouteOptimizationService routeOptimizationService) {
        this.routeOptimizationService = routeOptimizationService;
    }

    @PostMapping("/{tripId}/stops")
    @PreAuthorize("hasAnyRole('TRANSPORT_COMPANY', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<TripStopResponse>>> syncOrReorderStops(
            @PathVariable Long tripId,
            @RequestBody(required = false) SyncTripStopsRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                routeOptimizationService.syncOrReorderTripStops(tripId, req, principal)));
    }

    @PostMapping("/{tripId}/optimize")
    @PreAuthorize("hasAnyRole('TRANSPORT_COMPANY', 'ADMIN')")
    public ResponseEntity<ApiResponse<RouteProposalResponse>> optimizeTripRoute(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                routeOptimizationService.optimizeTrip(tripId, principal)));
    }

    @GetMapping("/{tripId}/proposals")
    @PreAuthorize("hasAnyRole('TRANSPORT_COMPANY', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<RouteProposalResponse>>> listProposals(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                routeOptimizationService.listProposals(tripId, principal)));
    }

    @PostMapping("/{tripId}/proposals/{proposalId}/accept")
    @PreAuthorize("hasAnyRole('TRANSPORT_COMPANY', 'ADMIN')")
    public ResponseEntity<ApiResponse<RouteProposalResponse>> acceptProposal(
            @PathVariable Long tripId,
            @PathVariable Long proposalId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                routeOptimizationService.acceptProposal(tripId, proposalId, principal)));
    }

    @PostMapping("/{tripId}/proposals/{proposalId}/reject")
    @PreAuthorize("hasAnyRole('TRANSPORT_COMPANY', 'ADMIN')")
    public ResponseEntity<ApiResponse<RouteProposalResponse>> rejectProposal(
            @PathVariable Long tripId,
            @PathVariable Long proposalId,
            @Valid @RequestBody(required = false) RejectProposalRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                routeOptimizationService.rejectProposal(tripId, proposalId, req, principal)));
    }
}
