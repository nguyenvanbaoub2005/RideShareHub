package com.ridesharehub.trip.controller;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.dto.ReportIncidentRequest;
import com.ridesharehub.trip.dto.ResolveIncidentRequest;
import com.ridesharehub.trip.dto.TripIncidentResponse;
import com.ridesharehub.trip.dto.TripMonitoringSummaryResponse;
import com.ridesharehub.trip.enums.TripIncidentStatus;
import com.ridesharehub.trip.service.TripIncidentService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * SP4-P2-01 & SP4-P2-02:
 * Driver incident reporting + Company & Admin operational trip monitoring endpoints.
 */
@RestController
@RequestMapping("/api/v1")
public class TripIncidentController {

    private final TripIncidentService tripIncidentService;

    public TripIncidentController(TripIncidentService tripIncidentService) {
        this.tripIncidentService = tripIncidentService;
    }

    // ---- Driver endpoints (DR-09) ----

    @PostMapping("/driver/trips/{tripId}/incidents")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<TripIncidentResponse>> reportIncident(
            @PathVariable Long tripId,
            @Valid @RequestBody ReportIncidentRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(tripIncidentService.reportIncident(tripId, req, principal)));
    }

    @GetMapping("/driver/trips/{tripId}/incidents")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<List<TripIncidentResponse>>> listDriverTripIncidents(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                tripIncidentService.listDriverTripIncidents(tripId, principal)));
    }

    // ---- Shared Trip Incident endpoints ----

    @GetMapping("/trips/{tripId}/incidents")
    @PreAuthorize("hasAnyRole('DRIVER', 'TRANSPORT_COMPANY', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<TripIncidentResponse>>> listTripIncidents(
            @PathVariable Long tripId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                tripIncidentService.listTripIncidents(tripId, principal)));
    }

    @PostMapping("/trips/{tripId}/incidents/{incidentId}/resolve")
    @PreAuthorize("hasAnyRole('TRANSPORT_COMPANY', 'ADMIN')")
    public ResponseEntity<ApiResponse<TripIncidentResponse>> resolveIncident(
            @PathVariable Long tripId,
            @PathVariable Long incidentId,
            @Valid @RequestBody(required = false) ResolveIncidentRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                tripIncidentService.resolveIncident(tripId, incidentId, req, principal)));
    }

    // ---- Company monitoring & incidents ----

    @GetMapping("/companies/{companyId}/incidents")
    @PreAuthorize("hasAnyRole('TRANSPORT_COMPANY', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<TripIncidentResponse>>> listCompanyIncidents(
            @PathVariable Long companyId,
            @RequestParam(required = false) TripIncidentStatus status,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                tripIncidentService.listCompanyIncidents(companyId, status, principal)));
    }

    @GetMapping("/companies/{companyId}/monitoring/trips")
    @PreAuthorize("hasAnyRole('TRANSPORT_COMPANY', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<TripMonitoringSummaryResponse>>> listCompanyMonitoringTrips(
            @PathVariable Long companyId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                tripIncidentService.listCompanyMonitoringTrips(companyId, principal)));
    }

    // ---- Admin monitoring & incidents ----

    @GetMapping("/admin/incidents")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<TripIncidentResponse>>> listAdminIncidents(
            @RequestParam(required = false) TripIncidentStatus status) {
        return ResponseEntity.ok(ApiResponse.success(
                tripIncidentService.listAdminIncidents(status)));
    }

    @GetMapping("/admin/monitoring/trips")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<TripMonitoringSummaryResponse>>> listAdminMonitoringTrips() {
        return ResponseEntity.ok(ApiResponse.success(
                tripIncidentService.listAdminMonitoringTrips()));
    }
}
