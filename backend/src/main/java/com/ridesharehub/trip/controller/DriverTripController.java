package com.ridesharehub.trip.controller;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.driver.dto.DriverResponse;
import com.ridesharehub.driver.dto.DriverStatusRequest;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.TripResponse;
import com.ridesharehub.trip.service.TripService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SP1-P2-05: Driver-scoped trip and availability endpoints.
 *
 * <p>Routes:
 * <ul>
 *   <li>GET /api/v1/driver/trips  — authenticated DRIVER lists own assigned trips
 *   <li>GET /api/v1/driver/me     — authenticated DRIVER gets own driver profile
 *   <li>PUT /api/v1/driver/status — authenticated DRIVER toggles AVAILABLE / INACTIVE
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/driver")
public class DriverTripController {

    private final TripService tripService;

    public DriverTripController(TripService tripService) {
        this.tripService = tripService;
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
}

