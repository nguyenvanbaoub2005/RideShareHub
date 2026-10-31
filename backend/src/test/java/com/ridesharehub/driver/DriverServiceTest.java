package com.ridesharehub.driver;

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
class DriverServiceTest {

    @Mock DriverRepository driverRepository;
    @Mock CompanyRepository companyRepository;

    private DriverService service;

    private static final AuthPrincipal TC_PRINCIPAL =
            new AuthPrincipal(10L, "tc@example.com", UserRole.TRANSPORT_COMPANY);
    private static final AuthPrincipal OTHER_PRINCIPAL =
            new AuthPrincipal(20L, "other@example.com", UserRole.TRANSPORT_COMPANY);

    private TransportCompany approvedCompany;

    @BeforeEach
    void setUp() throws Exception {
        service = new DriverService(driverRepository, companyRepository);

        User owner = new User("tc@example.com", "hash", "TC Owner", UserRole.TRANSPORT_COMPANY);
        setId(owner, 10L);

        approvedCompany = new TransportCompany(owner, "Company A", "Addr", "0900000000",
                "Rep A", "BizInfo A");
        setId(approvedCompany, 1L);

        User admin = new User("admin@example.com", "hash", "Admin", UserRole.ADMIN);
        approvedCompany.approve(admin);
    }

    @Test
    void addDriver_success() {
        DriverRequest req = new DriverRequest("Nguyễn Văn Tài", "0912345678", "B2-123456");
        Driver saved = new Driver(approvedCompany, req.fullName(), req.phone(), req.licenseNumber());
        setId(saved, 101L);

        when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
        when(driverRepository.save(any(Driver.class))).thenReturn(saved);

        DriverResponse resp = service.addDriver(1L, req, TC_PRINCIPAL);

        assertThat(resp.id()).isEqualTo(101L);
        assertThat(resp.fullName()).isEqualTo("Nguyễn Văn Tài");
        assertThat(resp.status()).isEqualTo(DriverStatus.AVAILABLE);
    }

    @Test
    void addDriver_forbidden_if_not_owner() {
        DriverRequest req = new DriverRequest("Nguyễn Văn Tài", "0912345678", "B2-123456");
        when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));

        assertThatThrownBy(() -> service.addDriver(1L, req, OTHER_PRINCIPAL))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode().value())
                        .isEqualTo(HttpStatus.FORBIDDEN.value()));
    }

    @Test
    void listDrivers_returns_company_drivers() {
        Driver d1 = new Driver(approvedCompany, "Tài 1", "0911111111", "B2-111");
        Driver d2 = new Driver(approvedCompany, "Tài 2", "0922222222", "B2-222");

        when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
        when(driverRepository.findAllByCompany_Id(1L)).thenReturn(List.of(d1, d2));

        List<DriverResponse> result = service.listDrivers(1L, TC_PRINCIPAL);
        assertThat(result).hasSize(2);
    }

    @Test
    void updateDriverStatus_success() {
        Driver d = new Driver(approvedCompany, "Tài 1", "0911111111", "B2-111");
        setId(d, 101L);

        when(companyRepository.findById(1L)).thenReturn(Optional.of(approvedCompany));
        when(driverRepository.findById(101L)).thenReturn(Optional.of(d));
        when(driverRepository.save(any(Driver.class))).thenAnswer(inv -> inv.getArgument(0));

        DriverResponse resp = service.updateDriverStatus(1L, 101L,
                new DriverStatusRequest(DriverStatus.ON_TRIP), TC_PRINCIPAL);

        assertThat(resp.status()).isEqualTo(DriverStatus.ON_TRIP);
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
