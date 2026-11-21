package com.ridesharehub.rating.controller;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.rating.dto.CreateRatingRequest;
import com.ridesharehub.rating.dto.RatingResponse;
import com.ridesharehub.rating.service.RatingService;
import com.ridesharehub.security.AuthPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
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
 * SP4-P1-01: Passenger ratings endpoints.
 */
@RestController
@RequestMapping("/api/v1")
public class RatingController {

    private final RatingService ratingService;

    public RatingController(RatingService ratingService) {
        this.ratingService = ratingService;
    }

    @PostMapping("/bookings/{bookingId}/rating")
    @PreAuthorize("hasRole('PASSENGER')")
    public ResponseEntity<ApiResponse<RatingResponse>> createRating(
            @PathVariable Long bookingId,
            @Valid @RequestBody CreateRatingRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        RatingResponse created = ratingService.createRating(bookingId, req, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @GetMapping("/bookings/{bookingId}/rating")
    public ResponseEntity<ApiResponse<RatingResponse>> getBookingRating(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(ratingService.getBookingRating(bookingId, principal)));
    }

    @GetMapping("/companies/{companyId}/ratings")
    public ResponseEntity<ApiResponse<List<RatingResponse>>> listCompanyRatings(
            @PathVariable Long companyId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(ratingService.listCompanyRatings(companyId, principal)));
    }
}
