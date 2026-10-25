package com.ridesharehub.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.security.JwtService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    // Real JWT & encoder — no mocking needed, they are pure
    private static final JwtService JWT =
            new JwtService("a".repeat(64), 900, 604800);
    private static final PasswordEncoder ENCODER = new BCryptPasswordEncoder(4);

    @Mock UserRepository userRepository;
    @Mock InvalidatedTokenRepository invalidatedTokenRepository;

    private AuthenticationService service;

    @BeforeEach
    void setUp() {
        service = new AuthenticationService(userRepository, invalidatedTokenRepository, ENCODER, JWT);
    }

    // =========================================================================
    // REGISTER — /api/v1/auth/register
    // =========================================================================
    @Nested
    class Register {

        @Test
        void passenger_can_self_register() {
            when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(false);
            when(userRepository.save(any())).thenAnswer(inv -> saved(inv.getArgument(0), 1L));

            AuthResponse resp = service.register(
                    new RegisterRequest("alice@example.com", "password123", "Alice", UserRole.PASSENGER));

            assertThat(resp.accessToken()).isNotBlank();
            assertThat(resp.refreshToken()).isNotBlank();
            assertThat(resp.role()).isEqualTo(UserRole.PASSENGER);
            assertThat(resp.expiresInSeconds()).isEqualTo(900);
        }

        @Test
        void transport_company_can_self_register() {
            when(userRepository.existsByEmailIgnoreCase("company@example.com")).thenReturn(false);
            when(userRepository.save(any())).thenAnswer(inv -> saved(inv.getArgument(0), 2L));

            AuthResponse resp = service.register(
                    new RegisterRequest("company@example.com", "password123", "Acme", UserRole.TRANSPORT_COMPANY));

            assertThat(resp.role()).isEqualTo(UserRole.TRANSPORT_COMPANY);
        }

        @Test
        void driver_cannot_self_register() {
            assertThatThrownBy(() -> service.register(
                    new RegisterRequest("d@example.com", "pass1234", "D", UserRole.DRIVER)))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
            verify(userRepository, never()).save(any());
        }

        @Test
        void admin_cannot_self_register() {
            assertThatThrownBy(() -> service.register(
                    new RegisterRequest("a@example.com", "pass1234", "A", UserRole.ADMIN)))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        }

        @Test
        void duplicate_email_returns_conflict() {
            when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(true);

            assertThatThrownBy(() -> service.register(
                    new RegisterRequest("alice@example.com", "password123", "Alice", UserRole.PASSENGER)))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
            verify(userRepository, never()).save(any());
        }

        @Test
        void email_is_normalised_to_lowercase_before_duplicate_check() {
            // Stub with lowercase — service must normalise before calling existsByEmail
            when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(false);
            when(userRepository.save(any())).thenAnswer(inv -> saved(inv.getArgument(0), 3L));

            AuthResponse resp = service.register(
                    new RegisterRequest("Alice@EXAMPLE.COM", "password123", "Alice", UserRole.PASSENGER));

            assertThat(resp).isNotNull();
        }
    }

    // =========================================================================
    // LOGIN — /api/v1/auth/login
    // =========================================================================
    @Nested
    class Login {

        @Test
        void correct_credentials_return_access_and_refresh_tokens() {
            User user = activeUser("bob@example.com", "correct_pass", UserRole.PASSENGER, 10L);
            when(userRepository.findByEmailIgnoreCase("bob@example.com")).thenReturn(Optional.of(user));

            AuthResponse resp = service.login(new LoginRequest("bob@example.com", "correct_pass"));

            assertThat(resp.accessToken()).isNotBlank();
            assertThat(resp.refreshToken()).isNotBlank();
            assertThat(resp.role()).isEqualTo(UserRole.PASSENGER);
        }

        @Test
        void wrong_password_returns_401() {
            User user = activeUser("bob@example.com", "correct_pass", UserRole.PASSENGER, 10L);
            when(userRepository.findByEmailIgnoreCase("bob@example.com")).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> service.login(new LoginRequest("bob@example.com", "WRONG_PASS")))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
        }

        @Test
        void unknown_email_returns_401() {
            when(userRepository.findByEmailIgnoreCase("ghost@example.com")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.login(new LoginRequest("ghost@example.com", "anypass")))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
        }

        @Test
        void locked_account_returns_401_even_with_correct_password() {
            User locked = activeUser("locked@example.com", "correct_pass", UserRole.PASSENGER, 11L);
            locked.lock();
            when(userRepository.findByEmailIgnoreCase("locked@example.com")).thenReturn(Optional.of(locked));

            assertThatThrownBy(() -> service.login(new LoginRequest("locked@example.com", "correct_pass")))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
        }
    }

    // =========================================================================
    // REFRESH — /api/v1/auth/refresh
    // =========================================================================
    @Nested
    class Refresh {

        @Test
        void valid_refresh_token_issues_new_token_pair() {
            User user = activeUser("carol@example.com", "pass", UserRole.PASSENGER, 20L);
            String refreshToken = JWT.createRefreshToken(user);

            when(invalidatedTokenRepository.existsById(any())).thenReturn(false);
            when(userRepository.findById(20L)).thenReturn(Optional.of(user));
            when(invalidatedTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            AuthResponse resp = service.refresh(new RefreshRequest(refreshToken));

            assertThat(resp.accessToken()).isNotBlank();
            assertThat(resp.refreshToken()).isNotBlank();
            // old refresh must be invalidated — new one is different
            assertThat(resp.refreshToken()).isNotEqualTo(refreshToken);
        }

        @Test
        void blacklisted_refresh_token_returns_401() {
            User user = activeUser("carol@example.com", "pass", UserRole.PASSENGER, 20L);
            String refreshToken = JWT.createRefreshToken(user);

            when(invalidatedTokenRepository.existsById(any())).thenReturn(true);

            assertThatThrownBy(() -> service.refresh(new RefreshRequest(refreshToken)))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
        }

        @Test
        void access_token_cannot_be_used_as_refresh_token() {
            User user = activeUser("carol@example.com", "pass", UserRole.PASSENGER, 20L);
            String accessToken = JWT.createAccessToken(user); // wrong type claim

            assertThatThrownBy(() -> service.refresh(new RefreshRequest(accessToken)))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
        }

        @Test
        void garbage_string_as_refresh_token_returns_401() {
            assertThatThrownBy(() -> service.refresh(new RefreshRequest("not-a-jwt")))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
        }
    }

    // =========================================================================
    // LOGOUT — /api/v1/auth/logout
    // =========================================================================
    @Nested
    class Logout {

        @Test
        void logout_with_access_token_only_succeeds() {
            User user = activeUser("dave@example.com", "pass", UserRole.PASSENGER, 30L);
            String accessToken = JWT.createAccessToken(user);
            AuthPrincipal principal = new AuthPrincipal(30L, "dave@example.com", UserRole.PASSENGER);

            when(invalidatedTokenRepository.existsById(any())).thenReturn(false);
            when(invalidatedTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.logout(new LogoutRequest(accessToken, null), principal);

            verify(invalidatedTokenRepository).save(any());
        }

        @Test
        void logout_with_both_tokens_invalidates_both() {
            User user = activeUser("dave@example.com", "pass", UserRole.PASSENGER, 30L);
            String accessToken = JWT.createAccessToken(user);
            String refreshToken = JWT.createRefreshToken(user);
            AuthPrincipal principal = new AuthPrincipal(30L, "dave@example.com", UserRole.PASSENGER);

            when(invalidatedTokenRepository.existsById(any())).thenReturn(false);
            when(invalidatedTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.logout(new LogoutRequest(accessToken, refreshToken), principal);

            // save() called twice — once per token
            verify(invalidatedTokenRepository, org.mockito.Mockito.times(2)).save(any());
        }

        @Test
        void cannot_revoke_another_users_access_token() {
            User userA = activeUser("a@example.com", "pass", UserRole.PASSENGER, 1L);
            String tokenOfA = JWT.createAccessToken(userA);
            // B is logged in and trying to revoke A's token
            AuthPrincipal principalB = new AuthPrincipal(2L, "b@example.com", UserRole.PASSENGER);

            assertThatThrownBy(() -> service.logout(new LogoutRequest(tokenOfA, null), principalB))
                    .isInstanceOfSatisfying(ResponseStatusException.class,
                            e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        }

        @Test
        void already_invalidated_token_is_idempotent_on_logout() {
            User user = activeUser("dave@example.com", "pass", UserRole.PASSENGER, 30L);
            String accessToken = JWT.createAccessToken(user);
            AuthPrincipal principal = new AuthPrincipal(30L, "dave@example.com", UserRole.PASSENGER);

            // token already in blacklist
            when(invalidatedTokenRepository.existsById(any())).thenReturn(true);

            // should NOT throw — idempotent
            service.logout(new LogoutRequest(accessToken, null), principal);
            // save() never called because already invalidated
            verify(invalidatedTokenRepository, never()).save(any());
        }
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private static User activeUser(String email, String rawPassword, UserRole role, long id) {
        User u = new User(email, ENCODER.encode(rawPassword), email.split("@")[0], role);
        setId(u, id);
        return u;
    }

    private static User saved(User user, long id) {
        setId(user, id);
        return user;
    }

    private static void setId(User user, long id) {
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
