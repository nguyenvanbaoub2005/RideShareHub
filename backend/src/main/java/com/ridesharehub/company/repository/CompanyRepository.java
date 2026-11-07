package com.ridesharehub.company.repository;

import com.ridesharehub.company.entity.TransportCompany;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<TransportCompany, Long> {

    boolean existsByOwner_Id(Long ownerId);

    Optional<TransportCompany> findByOwner_Id(Long ownerId);
}
