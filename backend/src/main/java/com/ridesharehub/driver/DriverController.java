package com.ridesharehub.driver;

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
 * Driver management endpoints.
 *
 * <p>Routes:
 * <ul>
 *   <li>POST  /api/v1/companies/{id}/drivers              — TRANSPORT_COMPANY (approved)
 *   <li>GET   /api/v1/companies/{id}/drivers              — owner or ADMIN
 *   <li>GET   /api/v1/companies/{id}/drivers/{did}        — owner or ADMIN
 *   <li>PUT   /api/v1/companies/{id}/drivers/{did}        — owner (approved)
 *   <li>PUT   /api/v1/companies/{id}/drivers/{did}/status — owner (approved)
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/companies/{companyId}/drivers")
public class DriverController {

    private final DriverService driverService;

    public DriverController(DriverService driverService) {
        this.driverService = driverService;
    }

    @PostMapping
    ResponseEntity<ApiResponse<DriverResponse>> addDriver(
            @PathVariable Long companyId,
            @Valid @RequestBody DriverRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        DriverResponse body = driverService.addDriver(companyId, req, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(body));
    }

    @GetMapping
    ResponseEntity<ApiResponse<List<DriverResponse>>> listDrivers(
            @PathVariable Long companyId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(driverService.listDrivers(companyId, principal)));
    }

    @GetMapping("/{driverId}")
    ResponseEntity<ApiResponse<DriverResponse>> getDriver(
            @PathVariable Long companyId,
            @PathVariable Long driverId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(driverService.getDriver(companyId, driverId, principal)));
    }

    @PutMapping("/{driverId}")
    ResponseEntity<ApiResponse<DriverResponse>> updateDriver(
            @PathVariable Long companyId,
            @PathVariable Long driverId,
            @Valid @RequestBody DriverRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                driverService.updateDriver(companyId, driverId, req, principal)));
    }

    @PutMapping("/{driverId}/status")
    ResponseEntity<ApiResponse<DriverResponse>> updateDriverStatus(
            @PathVariable Long companyId,
            @PathVariable Long driverId,
            @Valid @RequestBody DriverStatusRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                driverService.updateDriverStatus(companyId, driverId, req, principal)));
    }
}

