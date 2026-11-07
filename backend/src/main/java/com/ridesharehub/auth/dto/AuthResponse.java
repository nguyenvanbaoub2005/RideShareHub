package com.ridesharehub.auth.dto;

import com.ridesharehub.auth.enums.UserRole;

public record AuthResponse(String accessToken, String refreshToken, long expiresInSeconds, UserRole role) { }
