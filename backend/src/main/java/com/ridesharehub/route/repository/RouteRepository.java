package com.ridesharehub.route.repository;

import com.ridesharehub.route.entity.Route;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RouteRepository extends JpaRepository<Route, Long> {

    List<Route> findAllByCompany_Id(Long companyId);
}

