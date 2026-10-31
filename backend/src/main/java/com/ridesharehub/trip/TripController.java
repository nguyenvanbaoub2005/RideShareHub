package com.ridesharehub.trip;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.security.AuthPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Trip management endpoints.
 *
 * <p>Routes:
 * <ul>
 *   <li>POST /api/v1/companies/{id}/trips                    — create (DRAFT)
 *   <li>GET  /api/v1/companies/{id}/trips                    — list all
 *   <li>GET  /api/v1/companies/{id}/trips/{tid}              — get one
 *   <li>PUT  /api/v1/companies/{id}/trips/{tid}              — update (DRAFT only)
 *   <li>POST /api/v1/companies/{id}/trips/{tid}/publish      — DRAFT → PUBLISHED
 *   <li>POST /api/v1/companies/{id}/trips/{tid}/cancel       — → CANCELLED
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/companies/{companyId}/trips")
public class TripController {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @PostMapping
    ResponseEntity<ApiResponse<TripResponse>> createTrip(
            @PathVariable Long companyId,
            @Valid @RequestBody TripRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        TripResponse body = tripService.createTrip(companyId, req, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(body));
    }

    @GetMapping
    ResponseEntity<ApiResponse<List<TripResponse>>> listTrips(
            @PathVariable Long companyId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripService.listTrips(companyId, principal)));
    }

    @GetMapping("/{tripId}")
    ResponseEntity<ApiResponse<TripResponse>> getTrip(
            @PathVariable Long companyId,
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripService.getTrip(companyId, tripId, principal)));
    }

    @PutMapping("/{tripId}")
    ResponseEntity<ApiResponse<TripResponse>> updateTrip(
            @PathVariable Long companyId,
            @PathVariable Long tripId,
            @Valid @RequestBody TripRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                tripService.updateTrip(companyId, tripId, req, principal)));
    }

    @PostMapping("/{tripId}/publish")
    ResponseEntity<ApiResponse<TripResponse>> publishTrip(
            @PathVariable Long companyId,
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripService.publishTrip(companyId, tripId, principal)));
    }

    @PostMapping("/{tripId}/cancel")
    ResponseEntity<ApiResponse<TripResponse>> cancelTrip(
            @PathVariable Long companyId,
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripService.cancelTrip(companyId, tripId, principal)));
    }
}

