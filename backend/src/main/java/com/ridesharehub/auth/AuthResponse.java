package com.ridesharehub.auth;

public record AuthResponse(String accessToken, String refreshToken, long expiresInSeconds, UserRole role) { }
