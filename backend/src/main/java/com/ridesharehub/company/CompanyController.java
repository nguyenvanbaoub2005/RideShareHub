package com.ridesharehub.company;

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
 * Company registration and vehicle management endpoints.
 *
 * <p>Routes:
 * <ul>
 *   <li>POST   /api/v1/companies/registrations         — TRANSPORT_COMPANY submits profile
 *   <li>GET    /api/v1/companies/registrations         — ADMIN lists all
 *   <li>GET    /api/v1/companies/{id}                  — owner or ADMIN
 *   <li>POST   /api/v1/companies/{id}/vehicles         — owner (approved only)
 *   <li>GET    /api/v1/companies/{id}/vehicles         — owner or ADMIN
 *   <li>PUT    /api/v1/companies/{id}/vehicles/{vid}   — owner (approved only)
 *   <li>PUT    /api/v1/companies/{id}/vehicles/{vid}/status — owner (approved only)
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/companies")
public class CompanyController {

    private final CompanyService companyService;

    public CompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }

    @PostMapping("/registrations")
    ResponseEntity<ApiResponse<CompanyResponse>> register(
            @Valid @RequestBody CompanyRegistrationRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        CompanyResponse body = companyService.registerCompany(req, principal);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(body));
    }

    @GetMapping("/registrations")
    ResponseEntity<ApiResponse<List<CompanyResponse>>> listRegistrations() {
        return ResponseEntity.ok(ApiResponse.success(companyService.listRegistrations()));
    }

    @GetMapping("/{companyId}")
    ResponseEntity<ApiResponse<CompanyResponse>> getCompany(
            @PathVariable Long companyId) {
        return ResponseEntity.ok(ApiResponse.success(companyService.getCompany(companyId)));
    }

    // ================================================================== Vehicles

    @PostMapping("/{companyId}/vehicles")
    ResponseEntity<ApiResponse<VehicleResponse>> addVehicle(
            @PathVariable Long companyId,
            @Valid @RequestBody VehicleRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        VehicleResponse body = companyService.addVehicle(companyId, req, principal);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(body));
    }

    @GetMapping("/{companyId}/vehicles")
    ResponseEntity<ApiResponse<List<VehicleResponse>>> listVehicles(
            @PathVariable Long companyId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                companyService.listVehicles(companyId, principal)));
    }

    @PutMapping("/{companyId}/vehicles/{vehicleId}")
    ResponseEntity<ApiResponse<VehicleResponse>> updateVehicle(
            @PathVariable Long companyId,
            @PathVariable Long vehicleId,
            @Valid @RequestBody VehicleRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                companyService.updateVehicle(companyId, vehicleId, req, principal)));
    }

    @PutMapping("/{companyId}/vehicles/{vehicleId}/status")
    ResponseEntity<ApiResponse<VehicleResponse>> updateVehicleStatus(
            @PathVariable Long companyId,
            @PathVariable Long vehicleId,
            @Valid @RequestBody VehicleStatusRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                companyService.updateVehicleStatus(companyId, vehicleId, req, principal)));
    }
}
