package com.ridesharehub.driver;

import com.ridesharehub.company.CompanyRepository;
import com.ridesharehub.company.TransportCompany;
import com.ridesharehub.auth.UserRole;
import com.ridesharehub.security.AuthPrincipal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class DriverService {

    private final DriverRepository driverRepository;
    private final CompanyRepository companyRepository;

    public DriverService(DriverRepository driverRepository, CompanyRepository companyRepository) {
        this.driverRepository = driverRepository;
        this.companyRepository = companyRepository;
    }

    // ================================================================== CRUD

    /** POST /api/v1/companies/{companyId}/drivers */
    public DriverResponse addDriver(Long companyId, DriverRequest req, AuthPrincipal principal) {
        TransportCompany company = requireApprovedAndOwned(companyId, principal);
        Driver driver = driverRepository.save(
                new Driver(company, req.fullName(), req.phone(), req.licenseNumber()));
        return DriverResponse.from(driver);
    }

    /** GET /api/v1/companies/{companyId}/drivers */
    @Transactional(readOnly = true)
    public List<DriverResponse> listDrivers(Long companyId, AuthPrincipal principal) {
        requireOwnedOrAdmin(companyId, principal);
        return driverRepository.findAllByCompany_Id(companyId).stream()
                .map(DriverResponse::from)
                .toList();
    }

    /** GET /api/v1/companies/{companyId}/drivers/{driverId} */
    @Transactional(readOnly = true)
    public DriverResponse getDriver(Long companyId, Long driverId, AuthPrincipal principal) {
        requireOwnedOrAdmin(companyId, principal);
        return DriverResponse.from(requireDriverOfCompany(driverId, companyId));
    }

    /** PUT /api/v1/companies/{companyId}/drivers/{driverId} */
    public DriverResponse updateDriver(Long companyId, Long driverId,
            DriverRequest req, AuthPrincipal principal) {
        requireApprovedAndOwned(companyId, principal);
        Driver driver = requireDriverOfCompany(driverId, companyId);
        driver.updateDetails(req.fullName(), req.phone(), req.licenseNumber());
        return DriverResponse.from(driverRepository.save(driver));
    }

    /** PUT /api/v1/companies/{companyId}/drivers/{driverId}/status */
    public DriverResponse updateDriverStatus(Long companyId, Long driverId,
            DriverStatusRequest req, AuthPrincipal principal) {
        requireApprovedAndOwned(companyId, principal);
        Driver driver = requireDriverOfCompany(driverId, companyId);
        driver.updateStatus(req.status());
        return DriverResponse.from(driverRepository.save(driver));
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
                    "Company must be APPROVED before managing drivers");
        }
        return company;
    }

    private Driver requireDriverOfCompany(Long driverId, Long companyId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found"));
        if (!driver.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Driver does not belong to this company");
        }
        return driver;
    }
}

