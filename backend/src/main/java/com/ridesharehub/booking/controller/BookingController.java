package com.ridesharehub.booking.controller;

import com.ridesharehub.booking.dto.BookingResponse;
import com.ridesharehub.booking.dto.CancelBookingRequest;
import com.ridesharehub.booking.dto.CreateBookingRequest;
import com.ridesharehub.booking.service.BookingService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SP2-P2-01 & SP2-P2-02: Booking endpoints.
 *
 * <p>Routes:
 * <ul>
 *   <li>POST /api/v1/trips/{tripId}/bookings         — Passenger creates booking (idempotent)
 *   <li>GET  /api/v1/trips/{tripId}/bookings         — Company/Driver/Admin lists trip bookings
 *   <li>GET  /api/v1/bookings/me                     — Passenger lists own bookings
 *   <li>GET  /api/v1/bookings/{bookingId}            — Authorized viewer gets booking detail
 *   <li>POST /api/v1/bookings/{bookingId}/cancel     — Passenger/Company/Admin cancels booking
 *   <li>POST /api/v1/bookings/{bookingId}/confirm    — Company/Admin confirms pending booking
 *   <li>POST /api/v1/bookings/{bookingId}/no-show    — Company/Driver/Admin marks no-show
 * </ul>
 */
@RestController
@RequestMapping({"/api/v1", "/api"})
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/trips/{tripId}/bookings")
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            @PathVariable Long tripId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateBookingRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        BookingResponse body = bookingService.createBooking(tripId, idempotencyKey, req, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(body));
    }

    @GetMapping("/trips/{tripId}/bookings")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> listTripBookings(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingService.listTripBookings(tripId, principal)));
    }

    @GetMapping("/bookings/me")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> listMyBookings(
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingService.listMyBookings(principal)));
    }

    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingService.getBooking(bookingId, principal)));
    }

    @PostMapping("/bookings/{bookingId}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            @PathVariable Long bookingId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody(required = false) CancelBookingRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingService.cancelBooking(bookingId, idempotencyKey, req, principal)));
    }

    @PostMapping("/bookings/{bookingId}/confirm")
    public ResponseEntity<ApiResponse<BookingResponse>> confirmBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingService.confirmBooking(bookingId, principal)));
    }

    @PostMapping("/bookings/{bookingId}/no-show")
    public ResponseEntity<ApiResponse<BookingResponse>> markNoShow(
            @PathVariable Long bookingId,
            @Valid @RequestBody(required = false) CancelBookingRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                bookingService.markNoShow(bookingId, req, principal)));
    }
}

