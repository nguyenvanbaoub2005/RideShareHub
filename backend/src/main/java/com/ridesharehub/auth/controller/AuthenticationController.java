package com.ridesharehub.auth.controller;

import com.ridesharehub.common.response.ApiResponse;
import com.ridesharehub.security.AuthPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ridesharehub.auth.dto.AuthResponse;
import com.ridesharehub.auth.dto.LoginRequest;
import com.ridesharehub.auth.dto.LogoutRequest;
import com.ridesharehub.auth.dto.RefreshRequest;
import com.ridesharehub.auth.dto.RegisterRequest;
import com.ridesharehub.auth.service.AuthenticationService;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthenticationController {
    private final AuthenticationService authenticationService;

    public AuthenticationController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("/register")
    ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(authenticationService.register(request)));
    }

    @PostMapping("/login")
    ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authenticationService.login(request)));
    }

    @PostMapping("/refresh")
    ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authenticationService.refresh(request)));
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        authenticationService.logout(request, principal);
        return ResponseEntity.noContent().build();
    }
}
