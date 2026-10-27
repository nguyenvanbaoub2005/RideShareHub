package com.ridesharehub.company;

import com.ridesharehub.auth.User;
import com.ridesharehub.auth.UserRepository;
import com.ridesharehub.auth.UserRole;
import com.ridesharehub.security.AuthPrincipal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    public CompanyService(CompanyRepository companyRepository,
            VehicleRepository vehicleRepository,
            UserRepository userRepository) {
        this.companyRepository = companyRepository;
        this.vehicleRepository = vehicleRepository;
        this.userRepository = userRepository;
    }

    // ================================================================== Company

    /** POST /api/v1/companies/registrations — called by TRANSPORT_COMPANY user. */
    public CompanyResponse registerCompany(CompanyRegistrationRequest req, AuthPrincipal principal) {
        if (principal.role() != UserRole.TRANSPORT_COMPANY) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only TRANSPORT_COMPANY accounts may register a company");
        }
        if (companyRepository.existsByOwner_Id(principal.userId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A company registration already exists for this account");
        }
        User owner = userRepository.findById(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        TransportCompany company = companyRepository.save(
                new TransportCompany(owner, req.name(), req.address(),
                        req.phone(), req.representativeName(), req.businessInformation()));
        return CompanyResponse.from(company);
    }

    /** GET /api/v1/companies/registrations — admin lists all registrations. */
    @Transactional(readOnly = true)
    public List<CompanyResponse> listRegistrations() {
        return companyRepository.findAll().stream()
                .map(CompanyResponse::from)
                .toList();
    }

    /** GET /api/v1/companies/{companyId} */
    @Transactional(readOnly = true)
    public CompanyResponse getCompany(Long companyId) {
        return CompanyResponse.from(requireCompany(companyId));
    }

    /** POST /api/v1/admin/companies/{companyId}/decision */
    public CompanyResponse decide(Long companyId, CompanyDecisionRequest req, AuthPrincipal admin) {
        TransportCompany company = requireCompany(companyId);
        User adminUser = userRepository.findById(admin.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Admin not found"));
        try {
            if (req.decision() == DecisionType.APPROVE) {
                company.approve(adminUser);
            } else {
                if (req.reason() == null || req.reason().isBlank()) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                            "A reason is required when rejecting a registration");
                }
                company.reject(adminUser, req.reason());
            }
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }
        return CompanyResponse.from(companyRepository.save(company));
    }

    // ================================================================== Vehicle

    /** POST /api/v1/companies/{companyId}/vehicles */
    public VehicleResponse addVehicle(Long companyId, VehicleRequest req, AuthPrincipal principal) {
        TransportCompany company = requireApprovedAndOwned(companyId, principal);
        Vehicle vehicle = vehicleRepository.save(
                new Vehicle(company, req.plateNumber(), req.vehicleType(),
                        req.brand(), req.model(), req.seatCapacity()));
        return VehicleResponse.from(vehicle);
    }

    /** GET /api/v1/companies/{companyId}/vehicles */
    @Transactional(readOnly = true)
    public List<VehicleResponse> listVehicles(Long companyId, AuthPrincipal principal) {
        requireOwnedOrAdmin(companyId, principal);
        return vehicleRepository.findAllByCompany_Id(companyId).stream()
                .map(VehicleResponse::from)
                .toList();
    }

    /** PUT /api/v1/companies/{companyId}/vehicles/{vehicleId} */
    public VehicleResponse updateVehicle(Long companyId, Long vehicleId,
            VehicleRequest req, AuthPrincipal principal) {
        requireApprovedAndOwned(companyId, principal);
        Vehicle vehicle = requireVehicleOfCompany(vehicleId, companyId);
        vehicle.updateDetails(req.vehicleType(), req.brand(), req.model(),
                req.seatCapacity(), req.description(), req.imageUrl());
        return VehicleResponse.from(vehicleRepository.save(vehicle));
    }

    /** PUT /api/v1/companies/{companyId}/vehicles/{vehicleId}/status */
    public VehicleResponse updateVehicleStatus(Long companyId, Long vehicleId,
            VehicleStatusRequest req, AuthPrincipal principal) {
        requireApprovedAndOwned(companyId, principal);
        Vehicle vehicle = requireVehicleOfCompany(vehicleId, companyId);
        vehicle.updateStatus(req.status());
        return VehicleResponse.from(vehicleRepository.save(vehicle));
    }

    // ================================================================== helpers

    private TransportCompany requireCompany(Long companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Company not found"));
    }

    /**
     * Asserts the caller owns the company AND the company is APPROVED.
     * Called before any vehicle mutation — unapproved company cannot publish.
     */
    private TransportCompany requireApprovedAndOwned(Long companyId, AuthPrincipal principal) {
        TransportCompany company = requireOwnedOrAdmin(companyId, principal);
        if (!company.isApproved()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Company must be APPROVED before managing vehicles");
        }
        return company;
    }

    /**
     * Asserts the caller is either the company owner or an ADMIN.
     * Used for read operations such as listing vehicles.
     */
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

    private Vehicle requireVehicleOfCompany(Long vehicleId, Long companyId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Vehicle not found"));
        if (!vehicle.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Vehicle does not belong to this company");
        }
        return vehicle;
    }
}
