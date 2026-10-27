package com.ridesharehub.company;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findAllByCompany_Id(Long companyId);

    boolean existsByPlateNumberAndCompany_IdNot(String plateNumber, Long excludeCompanyId);
}
