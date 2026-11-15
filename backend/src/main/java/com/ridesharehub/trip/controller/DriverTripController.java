package com.ridesharehub.trip.controller;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.TripResponse;
import com.ridesharehub.trip.service.TripService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SP1-P2-05: Driver-scoped trip endpoints.
 *
 * <p>Routes:
 * <ul>
 *   <li>GET /api/v1/driver/trips — authenticated DRIVER lists own assigned trips
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
    public ResponseEntity<ApiResponse<List<TripResponse>>> listMyTrips(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(tripService.listDriverTrips(principal)));
    }
}
