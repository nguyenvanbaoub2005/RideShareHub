package com.ridesharehub.company;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ridesharehub.auth.User;
import com.ridesharehub.auth.UserRepository;
import com.ridesharehub.auth.UserRole;
import com.ridesharehub.security.AuthPrincipal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class CompanyServiceTest {

    @Mock CompanyRepository companyRepository;
    @Mock VehicleRepository vehicleRepository;
    @Mock UserRepository userRepository;

    private CompanyService service;

    // ---- shared fixtures ----
    private static final AuthPrincipal TC_PRINCIPAL =
            new AuthPrincipal(10L, "tc@example.com", UserRole.TRANSPORT_COMPANY);
    private static final AuthPrincipal ADMIN_PRINCIPAL =
            new AuthPrincipal(99L, "admin@example.com", UserRole.ADMIN);
    private static final AuthPrincipal OTHER_PRINCIPAL =
            new AuthPrincipal(20L, "other@example.com", UserRole.TRANSPORT_COMPANY);

    private static CompanyRegistrationRequest regReq() {
        return new CompanyRegistrationRequest("Acme", "0123456789",
                "123 Street", "Rep Name", "Bus info");
    }

    /** Build a TransportCompany stub backed by a minimal User. */
    private static TransportCompany pendingCompany(Long companyId, Long ownerId) {
        User owner = userWithId(ownerId);
        TransportCompany c = new TransportCompany(owner, "Acme", "123 Street",
                "0123456789", "Rep Name", "Bus info");
        setId(c, companyId);
        return c;
    }

    @BeforeEach
    void setUp() {
        service = new CompanyService(companyRepository, vehicleRepository, userRepository);
    }

    // ======================================================================
    // REGISTER
    // ======================================================================
    @Nested
    class Register {

        @Test
        void transport_company_can_register() {
            User owner = userWithId(10L);
            when(companyRepository.existsByOwner_Id(10L)).thenReturn(false);
            when(userRepository.findById(10L)).thenReturn(Optional.of(owner));
            when(companyRepository.save(any())).thenAnswer(inv -> {
                TransportCompany c = inv.getArgument(0);
                setId(c, 1L);
                return c;
            });

            CompanyResponse resp = service.registerCompany(regReq(), TC_PRINCIPAL);

            assertThat(resp.name()).isEqualTo("Acme");
            assertThat(resp.status()).isEqualTo(CompanyStatus.PENDING);
        }

        @Test
        void passenger_cannot_register() {
            AuthPrincipal passenger = new AuthPrincipal(5L, "p@e.com", UserRole.PASSENGER);

            assertThatThrownBy(() -> service.registerCompany(regReq(), passenger))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
            verify(companyRepository, never()).save(any());
        }

        @Test
        void duplicate_registration_rejected() {
            when(companyRepository.existsByOwner_Id(10L)).thenReturn(true);

            assertThatThrownBy(() -> service.registerCompany(regReq(), TC_PRINCIPAL))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
            verify(companyRepository, never()).save(any());
        }
    }

    // ======================================================================
    // DECIDE — APPROVE
    // ======================================================================
    @Nested
    class Decide {

        @Test
        void admin_can_approve_pending_company() {
            TransportCompany company = pendingCompany(1L, 10L);
            User adminUser = userWithId(99L);
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
            when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));
            when(companyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            CompanyDecisionRequest req = new CompanyDecisionRequest(DecisionType.APPROVE, null);
            CompanyResponse resp = service.decide(1L, req, ADMIN_PRINCIPAL);

            assertThat(resp.status()).isEqualTo(CompanyStatus.APPROVED);
        }

        @Test
        void admin_can_reject_pending_company_with_reason() {
            TransportCompany company = pendingCompany(1L, 10L);
            User adminUser = userWithId(99L);
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
            when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));
            when(companyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            CompanyDecisionRequest req =
                    new CompanyDecisionRequest(DecisionType.REJECT, "Missing documents");
            CompanyResponse resp = service.decide(1L, req, ADMIN_PRINCIPAL);

            assertThat(resp.status()).isEqualTo(CompanyStatus.REJECTED);
            assertThat(resp.rejectReason()).isEqualTo("Missing documents");
        }

        @Test
        void reject_without_reason_is_unprocessable() {
            TransportCompany company = pendingCompany(1L, 10L);
            User adminUser = userWithId(99L);
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
            when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

            CompanyDecisionRequest req = new CompanyDecisionRequest(DecisionType.REJECT, "");

            assertThatThrownBy(() -> service.decide(1L, req, ADMIN_PRINCIPAL))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode())
                                    .isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));
        }

        @Test
        void cannot_approve_already_approved_company() {
            TransportCompany company = pendingCompany(1L, 10L);
            User adminUser = userWithId(99L);
            // First approval
            company.approve(adminUser);
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
            when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

            CompanyDecisionRequest req = new CompanyDecisionRequest(DecisionType.APPROVE, null);

            assertThatThrownBy(() -> service.decide(1L, req, ADMIN_PRINCIPAL))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
        }
    }

    // ======================================================================
    // VEHICLE — add
    // ======================================================================
    @Nested
    class VehicleManagement {

        private VehicleRequest vehicleReq() {
            return new VehicleRequest("51A-12345", "BUS", "Toyota",
                    "Hiace", 16, "description", null);
        }

        @Test
        void approved_company_owner_can_add_vehicle() {
            TransportCompany company = pendingCompany(1L, 10L);
            company.approve(userWithId(99L));
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
            when(vehicleRepository.save(any())).thenAnswer(inv -> {
                Vehicle v = inv.getArgument(0);
                setVehicleId(v, 1L);
                return v;
            });

            VehicleResponse resp = service.addVehicle(1L, vehicleReq(), TC_PRINCIPAL);

            assertThat(resp.plateNumber()).isEqualTo("51A-12345");
            assertThat(resp.seatCapacity()).isEqualTo(16);
            assertThat(resp.status()).isEqualTo(VehicleStatus.AVAILABLE);
        }

        @Test
        void pending_company_cannot_add_vehicle() {
            TransportCompany company = pendingCompany(1L, 10L); // still PENDING
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));

            assertThatThrownBy(() -> service.addVehicle(1L, vehicleReq(), TC_PRINCIPAL))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
            verify(vehicleRepository, never()).save(any());
        }

        @Test
        void non_owner_cannot_add_vehicle() {
            TransportCompany company = pendingCompany(1L, 10L);
            company.approve(userWithId(99L));
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));

            assertThatThrownBy(() -> service.addVehicle(1L, vehicleReq(), OTHER_PRINCIPAL))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        }

        @Test
        void list_vehicles_returns_all_for_company() {
            TransportCompany company = pendingCompany(1L, 10L);
            company.approve(userWithId(99L));
            Vehicle v = new Vehicle(company, "51A-12345", "BUS", "Toyota", "Hiace", 16);
            setVehicleId(v, 1L);
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
            when(vehicleRepository.findAllByCompany_Id(1L)).thenReturn(List.of(v));

            List<VehicleResponse> result = service.listVehicles(1L, TC_PRINCIPAL);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).plateNumber()).isEqualTo("51A-12345");
        }

        @Test
        void vehicle_status_update_persists() {
            TransportCompany company = pendingCompany(1L, 10L);
            company.approve(userWithId(99L));
            Vehicle v = new Vehicle(company, "51A-12345", "BUS", null, null, 16);
            setVehicleId(v, 5L);
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
            when(vehicleRepository.findById(5L)).thenReturn(Optional.of(v));
            when(vehicleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            VehicleResponse resp = service.updateVehicleStatus(1L, 5L,
                    new VehicleStatusRequest(VehicleStatus.MAINTENANCE), TC_PRINCIPAL);

            assertThat(resp.status()).isEqualTo(VehicleStatus.MAINTENANCE);
        }
    }

    // ======================================================================
    // helpers — reflective ID injection for entities with private id fields
    // ======================================================================
    private static User userWithId(Long id) {
        User u = new User("u" + id + "@e.com", "hash", "Name", UserRole.TRANSPORT_COMPANY);
        setUserId(u, id);
        return u;
    }

    private static void setId(TransportCompany c, Long id) {
        try {
            var f = TransportCompany.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(c, id);
        } catch (Exception ex) { throw new RuntimeException(ex); }
    }

    private static void setUserId(User u, Long id) {
        try {
            var f = User.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(u, id);
        } catch (Exception ex) { throw new RuntimeException(ex); }
    }

    private static void setVehicleId(Vehicle v, Long id) {
        try {
            var f = Vehicle.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(v, id);
        } catch (Exception ex) { throw new RuntimeException(ex); }
    }
}
