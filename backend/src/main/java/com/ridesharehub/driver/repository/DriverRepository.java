package com.ridesharehub.driver.repository;

import com.ridesharehub.driver.entity.Driver;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DriverRepository extends JpaRepository<Driver, Long> {

    List<Driver> findAllByCompany_Id(Long companyId);

    Optional<Driver> findByUserId(Long userId);

    boolean existsByLicenseNumberAndCompany_IdNot(String licenseNumber, Long excludeCompanyId);

    @Query("""
            SELECT d FROM Driver d
              JOIN FETCH d.company c
            ORDER BY d.createdAt DESC, d.id DESC
            """)
    List<Driver> findAllWithCompanyOrderByCreatedAtDesc();
}

