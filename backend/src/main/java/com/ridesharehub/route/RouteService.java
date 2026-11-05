package com.ridesharehub.route;

import com.ridesharehub.auth.UserRole;
import com.ridesharehub.company.CompanyRepository;
import com.ridesharehub.company.TransportCompany;
import com.ridesharehub.security.AuthPrincipal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class RouteService {

    private final RouteRepository routeRepository;
    private final CompanyRepository companyRepository;

    public RouteService(RouteRepository routeRepository, CompanyRepository companyRepository) {
        this.routeRepository = routeRepository;
        this.companyRepository = companyRepository;
    }

    // ================================================================== CRUD

    /** POST /api/v1/companies/{companyId}/routes */
    public RouteResponse addRoute(Long companyId, RouteRequest req, AuthPrincipal principal) {
        TransportCompany company = requireApprovedAndOwned(companyId, principal);
        Route route = routeRepository.save(
                new Route(company, req.name(), req.origin(), req.destination(),
                        req.estimatedMinutes(), req.baseFare()));
        return RouteResponse.from(route);
    }

    /** GET /api/v1/companies/{companyId}/routes */
    @Transactional(readOnly = true)
    public List<RouteResponse> listRoutes(Long companyId, AuthPrincipal principal) {
        requireOwnedOrAdmin(companyId, principal);
        return routeRepository.findAllByCompany_Id(companyId).stream()
                .map(RouteResponse::from)
                .toList();
    }

    /** GET /api/v1/companies/{companyId}/routes/{routeId} */
    @Transactional(readOnly = true)
    public RouteResponse getRoute(Long companyId, Long routeId, AuthPrincipal principal) {
        requireOwnedOrAdmin(companyId, principal);
        return RouteResponse.from(requireRouteOfCompany(routeId, companyId));
    }

    /** PUT /api/v1/companies/{companyId}/routes/{routeId} */
    public RouteResponse updateRoute(Long companyId, Long routeId,
            RouteRequest req, AuthPrincipal principal) {
        requireApprovedAndOwned(companyId, principal);
        Route route = requireRouteOfCompany(routeId, companyId);
        route.updateDetails(req.name(), req.origin(), req.destination(),
                req.estimatedMinutes(), req.baseFare(), req.description());
        return RouteResponse.from(routeRepository.save(route));
    }

    /** DELETE /api/v1/companies/{companyId}/routes/{routeId} */
    public void deleteRoute(Long companyId, Long routeId, AuthPrincipal principal) {
        requireApprovedAndOwned(companyId, principal);
        Route route = requireRouteOfCompany(routeId, companyId);
        routeRepository.delete(route);
    }

    // ================================================================== helpers

    private TransportCompany requireCompany(Long companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));
    }

    private TransportCompany requireOwnedOrAdmin(Long companyId, AuthPrincipal principal) {
        TransportCompany company = requireCompany(companyId);
        boolean isAdmin = principal.role() == UserRole.ADMIN;
        boolean isOwner = company.getOwner().getId().equals(principal.userId());
        if (!isAdmin && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied to this company's resources");
        }
        return company;
    }

    private TransportCompany requireApprovedAndOwned(Long companyId, AuthPrincipal principal) {
        TransportCompany company = requireOwnedOrAdmin(companyId, principal);
        if (!company.isApproved()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Company must be APPROVED before managing routes");
        }
        return company;
    }

    private Route requireRouteOfCompany(Long routeId, Long companyId) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found"));
        if (!route.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Route does not belong to this company");
        }
        return route;
    }
}

