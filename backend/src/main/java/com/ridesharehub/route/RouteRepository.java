package com.ridesharehub.route;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RouteRepository extends JpaRepository<Route, Long> {

    List<Route> findAllByCompany_Id(Long companyId);
}

