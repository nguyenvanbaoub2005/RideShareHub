package com.ridesharehub.admin.controller;

import com.ridesharehub.admin.dto.AdminDriverResponse;
import com.ridesharehub.admin.dto.AdminOverviewResponse;
import com.ridesharehub.admin.dto.AdminTripResponse;
import com.ridesharehub.admin.dto.AdminUserResponse;
import com.ridesharehub.admin.dto.PagedResponse;
import com.ridesharehub.admin.service.AdminDirectoryService;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.auth.enums.UserStatus;
import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.driver.enums.DriverStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * SP4-P1-01: Read-only Admin Dashboard KPIs & paginated directory endpoints.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDirectoryController {

    private final AdminDirectoryService adminDirectoryService;

    public AdminDirectoryController(AdminDirectoryService adminDirectoryService) {
        this.adminDirectoryService = adminDirectoryService;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AdminOverviewResponse>> getOverview() {
        return ResponseEntity.ok(ApiResponse.success(adminDirectoryService.getOverview()));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PagedResponse<AdminUserResponse>>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) String query) {
        return ResponseEntity.ok(ApiResponse.success(
                adminDirectoryService.listUsers(page, size, role, status, query)));
    }

    @GetMapping("/drivers")
    public ResponseEntity<ApiResponse<PagedResponse<AdminDriverResponse>>> listDrivers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) DriverStatus status,
            @RequestParam(required = false) Long companyId,
            @RequestParam(required = false) String query) {
        return ResponseEntity.ok(ApiResponse.success(
                adminDirectoryService.listDrivers(page, size, status, companyId, query)));
    }

    @GetMapping("/trips")
    public ResponseEntity<ApiResponse<PagedResponse<AdminTripResponse>>> listTrips(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long companyId,
            @RequestParam(required = false) String query) {
        return ResponseEntity.ok(ApiResponse.success(
                adminDirectoryService.listTrips(page, size, status, companyId, query)));
    }
}
