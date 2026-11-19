package com.ridesharehub.trip.controller;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.driver.dto.DriverResponse;
import com.ridesharehub.driver.dto.DriverStatusRequest;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.DriverLocationUpdateRequest;
import com.ridesharehub.trip.dto.StopStatusUpdateRequest;
import com.ridesharehub.trip.dto.TripLiveSnapshotResponse;
import com.ridesharehub.trip.dto.TripResponse;
import com.ridesharehub.trip.dto.TripStopResponse;
import com.ridesharehub.trip.service.TripExecutionService;
import com.ridesharehub.trip.service.TripService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SP1-P2-05, SP3-P2-01, SP3-P2-01b & SP3-P2-02: Driver-scoped trip execution,
 * assignment accept/reject, stop transitions, and GPS location endpoints.
 */
@RestController
@RequestMapping("/api/v1/driver")
public class DriverTripController {

    private final TripService tripService;
    private final TripExecutionService tripExecutionService;

    public DriverTripController(TripService tripService, TripExecutionService tripExecutionService) {
        this.tripService = tripService;
        this.tripExecutionService = tripExecutionService;
    }

    @GetMapping("/trips")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<List<TripResponse>>> listMyTrips(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripService.listDriverTrips(principal)));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<DriverResponse>> getMyProfile(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripService.getMyDriverProfile(principal)));
    }

    @PutMapping("/status")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<DriverResponse>> updateMyStatus(
            @Valid @RequestBody DriverStatusRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripService.updateMyDriverStatus(req, principal)));
    }

    @PostMapping("/trips/{tripId}/accept")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<TripResponse>> acceptTrip(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripExecutionService.acceptTrip(tripId, principal)));
    }

    @PostMapping("/trips/{tripId}/reject")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<TripResponse>> rejectTrip(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripExecutionService.rejectTrip(tripId, principal)));
    }

    @PostMapping("/trips/{tripId}/start")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<TripResponse>> startTrip(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripExecutionService.startTrip(tripId, principal)));
    }

    @PostMapping("/trips/{tripId}/complete")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<TripResponse>> completeTrip(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripExecutionService.completeTrip(tripId, principal)));
    }

    @GetMapping("/trips/{tripId}/stops")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<List<TripStopResponse>>> listTripStops(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripExecutionService.listTripStopsForDriver(tripId, principal)));
    }

    @PostMapping("/trips/{tripId}/stops/{stopId}/status")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<TripStopResponse>> updateStopStatus(
            @PathVariable Long tripId,
            @PathVariable Long stopId,
            @Valid @RequestBody StopStatusUpdateRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                tripExecutionService.updateStopStatus(tripId, stopId, req, principal)));
    }

    @PostMapping("/trips/{tripId}/location")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<TripLiveSnapshotResponse>> updateLocation(
            @PathVariable Long tripId,
            @Valid @RequestBody DriverLocationUpdateRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                tripExecutionService.updateDriverLocation(tripId, req, principal)));
    }
}
