package com.ridesharehub.route;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.security.AuthPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Route management endpoints.
 *
 * <p>Routes:
 * <ul>
 *   <li>POST   /api/v1/companies/{id}/routes           — TRANSPORT_COMPANY (approved)
 *   <li>GET    /api/v1/companies/{id}/routes           — owner or ADMIN
 *   <li>GET    /api/v1/companies/{id}/routes/{rid}     — owner or ADMIN
 *   <li>PUT    /api/v1/companies/{id}/routes/{rid}     — owner (approved)
 *   <li>DELETE /api/v1/companies/{id}/routes/{rid}     — owner (approved)
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/companies/{companyId}/routes")
public class RouteController {

    private final RouteService routeService;

    public RouteController(RouteService routeService) {
        this.routeService = routeService;
    }

    @PostMapping
    ResponseEntity<ApiResponse<RouteResponse>> addRoute(
            @PathVariable Long companyId,
            @Valid @RequestBody RouteRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        RouteResponse body = routeService.addRoute(companyId, req, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(body));
    }

    @GetMapping
    ResponseEntity<ApiResponse<List<RouteResponse>>> listRoutes(
            @PathVariable Long companyId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(routeService.listRoutes(companyId, principal)));
    }

    @GetMapping("/{routeId}")
    ResponseEntity<ApiResponse<RouteResponse>> getRoute(
            @PathVariable Long companyId,
            @PathVariable Long routeId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(routeService.getRoute(companyId, routeId, principal)));
    }

    @PutMapping("/{routeId}")
    ResponseEntity<ApiResponse<RouteResponse>> updateRoute(
            @PathVariable Long companyId,
            @PathVariable Long routeId,
            @Valid @RequestBody RouteRequest req,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                routeService.updateRoute(companyId, routeId, req, principal)));
    }

    @DeleteMapping("/{routeId}")
    ResponseEntity<ApiResponse<Void>> deleteRoute(
            @PathVariable Long companyId,
            @PathVariable Long routeId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        routeService.deleteRoute(companyId, routeId, principal);
        return ResponseEntity.ok(ApiResponse.success());
    }
}

