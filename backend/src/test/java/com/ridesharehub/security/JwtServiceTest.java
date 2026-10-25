package com.ridesharehub.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ridesharehub.auth.User;
import com.ridesharehub.auth.UserRole;
import java.lang.reflect.Field;
import org.junit.jupiter.api.Test;

class JwtServiceTest {
    private final JwtService jwtService = new JwtService("a".repeat(64), 900, 604800);

    @Test
    void accessTokenCarriesIdentityAndRole() throws ReflectiveOperationException {
        User user = new User("passenger@example.com", "hash", "Passenger", UserRole.PASSENGER);
        Field id = User.class.getDeclaredField("id");
        id.setAccessible(true);
        id.set(user, 42L);

        JwtService.VerifiedToken token = jwtService.verify(jwtService.createAccessToken(user), "access");

        assertThat(token.userId()).isEqualTo(42L);
        assertThat(token.role()).isEqualTo("PASSENGER");
    }

    @Test
    void refreshTokenCannotAuthenticateAsAccessToken() throws ReflectiveOperationException {
        User user = new User("passenger@example.com", "hash", "Passenger", UserRole.PASSENGER);
        Field id = User.class.getDeclaredField("id");
        id.setAccessible(true);
        id.set(user, 42L);

        assertThatThrownBy(() -> jwtService.verify(jwtService.createRefreshToken(user), "access"))
                .isInstanceOf(SecurityException.class);
    }
}
