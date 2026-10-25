package com.ridesharehub.auth;

import jakarta.validation.constraints.NotBlank;

public record LogoutRequest(@NotBlank String accessToken, String refreshToken) { }
