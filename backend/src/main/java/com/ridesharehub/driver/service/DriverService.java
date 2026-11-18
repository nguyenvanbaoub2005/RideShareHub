package com.ridesharehub.driver.service;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.auth.repository.UserRepository;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.security.AuthPrincipal;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.ridesharehub.driver.dto.DriverRequest;
import com.ridesharehub.driver.dto.DriverResponse;
import com.ridesharehub.driver.dto.DriverStatusRequest;
import com.ridesharehub.driver.entity.Driver;
import com.ridesharehub.driver.repository.DriverRepository;

@Service
@Transactional
public class DriverService {

    private final DriverRepository driverRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DriverService(
            DriverRepository driverRepository,
            CompanyRepository companyRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.driverRepository = driverRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public DriverService(DriverRepository driverRepository, CompanyRepository companyRepository) {
        this(driverRepository, companyRepository, null, null);
    }

    // ================================================================== CRUD

    /** POST /api/v1/companies/{companyId}/drivers */
    public DriverResponse addDriver(Long companyId, DriverRequest req, AuthPrincipal principal) {
        TransportCompany company = requireApprovedAndOwned(companyId, principal);
        Driver driver = new Driver(company, req.fullName(), req.phone(), req.licenseNumber());

        boolean hasEmail = req.email() != null && !req.email().isBlank();
        boolean hasPassword = req.password() != null && !req.password().isBlank();
        if (hasEmail != hasPassword) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Both email and password are required to create a driver login account");
        }
        if (hasEmail && userRepository != null && passwordEncoder != null) {
            String normalizedEmail = req.email().trim().toLowerCase(Locale.ROOT);
            if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
            }
            User driverUser = userRepository.save(new User(
                    normalizedEmail,
                    passwordEncoder.encode(req.password()),
                    req.fullName().trim(),
                    UserRole.DRIVER));
            driver.assignUser(driverUser.getId());
        }

        Driver saved = driverRepository.save(driver);
        return DriverResponse.from(saved);
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

