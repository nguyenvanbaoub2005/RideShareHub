package com.ridesharehub.auth;

import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.security.JwtService;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthenticationService {
    private final UserRepository userRepository;
    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthenticationService(UserRepository userRepository, InvalidatedTokenRepository invalidatedTokenRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.invalidatedTokenRepository = invalidatedTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (request.role() != UserRole.PASSENGER && request.role() != UserRole.TRANSPORT_COMPANY) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This role cannot self-register");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        User user = userRepository.save(new User(email, passwordEncoder.encode(request.password()),
                request.fullName().trim(), request.role()));
        return tokensFor(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> unauthorized("Invalid email or password"));
        if (!user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw unauthorized("Invalid email or password");
        }
        return tokensFor(user);
    }

    public AuthResponse refresh(RefreshRequest request) {
        JwtService.VerifiedToken token;
        try {
            token = jwtService.verify(request.refreshToken(), "refresh");
        } catch (SecurityException ex) {
            throw unauthorized("Invalid refresh token");
        }
        if (invalidatedTokenRepository.existsById(token.id())) {
            throw unauthorized("Invalid refresh token");
        }
        User user = userRepository.findById(token.userId()).filter(User::isActive)
                .orElseThrow(() -> unauthorized("Invalid refresh token"));
        invalidatedTokenRepository.save(new InvalidatedToken(token.id(), token.expiresAt()));
        return tokensFor(user);
    }

    public void logout(LogoutRequest request, AuthPrincipal principal) {
        JwtService.VerifiedToken access;
        try {
            access = jwtService.verify(request.accessToken(), "access");
        } catch (SecurityException ex) {
            throw unauthorized("Invalid access token");
        }
        if (!access.userId().equals(principal.userId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot revoke another user's token");
        }
        invalidate(access);
        if (request.refreshToken() != null && !request.refreshToken().isBlank()) {
            JwtService.VerifiedToken refresh;
            try {
                refresh = jwtService.verify(request.refreshToken(), "refresh");
            } catch (SecurityException ex) {
                throw unauthorized("Invalid refresh token");
            }
            if (!refresh.userId().equals(principal.userId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot revoke another user's token");
            }
            invalidate(refresh);
        }
    }

    private AuthResponse tokensFor(User user) {
        return new AuthResponse(jwtService.createAccessToken(user), jwtService.createRefreshToken(user),
                jwtService.accessTokenSeconds(), user.getRole());
    }

    private void invalidate(JwtService.VerifiedToken token) {
        if (!invalidatedTokenRepository.existsById(token.id())) {
            invalidatedTokenRepository.save(new InvalidatedToken(token.id(), token.expiresAt()));
        }
    }

    private ResponseStatusException unauthorized(String message) {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, message);
    }
}
