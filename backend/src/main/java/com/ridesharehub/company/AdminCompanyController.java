package com.ridesharehub.company;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.security.AuthPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only endpoints for company approval decisions.
 * SecurityConfig already requires ADMIN role for /api/v1/admin/**.
 */
@RestController
@RequestMapping("/api/v1/admin/companies")
public class AdminCompanyController {

    private final CompanyService companyService;

    public AdminCompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }

    /** POST /api/v1/admin/companies/{companyId}/decision */
    @PostMapping("/{companyId}/decision")
    ResponseEntity<ApiResponse<CompanyResponse>> decide(
            @PathVariable Long companyId,
            @Valid @RequestBody CompanyDecisionRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                companyService.decide(companyId, req, principal)));
    }
}
