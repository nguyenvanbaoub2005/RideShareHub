package com.ridesharehub.route;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ridesharehub.auth.User;
import com.ridesharehub.auth.UserRole;
import com.ridesharehub.company.CompanyRepository;
import com.ridesharehub.company.TransportCompany;
import com.ridesharehub.security.AuthPrincipal;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class RouteServiceTest {

    @Mock RouteRepository routeRepository;
    @Mock CompanyRepository companyRepository;

    private RouteService service;

    private static final AuthPrincipal TC_PRINCIPAL =
            new AuthPrincipal(10L, "tc@example.com", UserRole.TRANSPORT_COMPANY);

    private TransportCompany approvedCompany;

    @BeforeEach
    void setUp() throws Exception {
        service = new RouteService(routeRepository, companyRepository);

        User owner = new User("tc@example.com", "hash", "TC Owner", UserRole.TRANSPORT_COMPANY);
        setId(owner, 10L);

        approvedCompany = new TransportCompany(owner, "Company A", "Addr", "0900000000",
                "Rep A", "BizInfo A");
        setId(approvedCompany, 1L);

        User admin = new User("admin@example.com", "hash", "Admin", UserRole.ADMIN);
        approvedCompany.approve(admin);
    }

    @Test
    void addRoute_success() {
        RouteRequest req = new RouteRequest("Đà Nẵng - Hội An", "Đà Nẵng", "Hội An", 45,
                BigDecimal.valueOf(80_000), "Tuyến du lịch");
        Route saved = new Route(approvedCompany, req.name(), req.origin(), req.destination(),
                req.estimatedMinutes(), req.baseFare());
        setId(saved, 201L);

        when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
        when(routeRepository.save(any(Route.class))).thenReturn(saved);

        RouteResponse resp = service.addRoute(1L, req, TC_PRINCIPAL);

        assertThat(resp.id()).isEqualTo(201L);
        assertThat(resp.name()).isEqualTo("Đà Nẵng - Hội An");
        assertThat(resp.estimatedMinutes()).isEqualTo(45);
    }

    @Test
    void listRoutes_success() {
        Route r1 = new Route(approvedCompany, "R1", "A", "B", 60, BigDecimal.TEN);
        Route r2 = new Route(approvedCompany, "R2", "B", "C", 90, BigDecimal.valueOf(20));

        when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
        when(routeRepository.findAllByCompany_Id(1L)).thenReturn(List.of(r1, r2));

        List<RouteResponse> list = service.listRoutes(1L, TC_PRINCIPAL);
        assertThat(list).hasSize(2);
    }

    @Test
    void deleteRoute_success() {
        Route r = new Route(approvedCompany, "R1", "A", "B", 60, BigDecimal.TEN);
        setId(r, 201L);

        when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
        when(routeRepository.findById(201L)).thenReturn(Optional.of(r));

        service.deleteRoute(1L, 201L, TC_PRINCIPAL);
        verify(routeRepository).delete(r);
    }

    private static void setId(Object entity, Long id) {
        try {
            Field f = entity.getClass().getDeclaredField("id");
            f.setAccessible(true);
            f.set(entity, id);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            throw new RuntimeException(e);
        }
    }
}
