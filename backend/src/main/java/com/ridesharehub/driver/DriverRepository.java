package com.ridesharehub.driver;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DriverRepository extends JpaRepository<Driver, Long> {

    List<Driver> findAllByCompany_Id(Long companyId);

    boolean existsByLicenseNumberAndCompany_IdNot(String licenseNumber, Long excludeCompanyId);
}

