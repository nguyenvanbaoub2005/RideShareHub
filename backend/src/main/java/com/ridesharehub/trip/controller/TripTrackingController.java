package com.ridesharehub.trip.controller;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.TripLiveSnapshotResponse;
import com.ridesharehub.trip.dto.TripStopResponse;
import com.ridesharehub.trip.service.TripExecutionService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SP3-P2-02: Live tracking snapshot and ordered stops endpoints for passengers,
 * company owners, drivers, and admins.
 */
@RestController
@RequestMapping({"/api/v1/trips", "/api/trips"})
public class TripTrackingController {

    private final TripExecutionService tripExecutionService;

    public TripTrackingController(TripExecutionService tripExecutionService) {
        this.tripExecutionService = tripExecutionService;
    }

    @GetMapping("/{tripId}/live-snapshot")
    public ResponseEntity<ApiResponse<TripLiveSnapshotResponse>> getLiveSnapshot(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripExecutionService.getLiveSnapshot(tripId, principal)));
    }

    @GetMapping("/{tripId}/tracking")
    public ResponseEntity<ApiResponse<TripLiveSnapshotResponse>> getTrackingSnapshot(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripExecutionService.getLiveSnapshot(tripId, principal)));
    }

    @GetMapping("/{tripId}/stops")
    public ResponseEntity<ApiResponse<List<TripStopResponse>>> getTripStops(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripExecutionService.listTripStopsForViewer(tripId, principal)));
    }
}
