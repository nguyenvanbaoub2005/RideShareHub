package com.ridesharehub.security;

import com.ridesharehub.auth.UserRole;

public record AuthPrincipal(Long userId, String email, UserRole role) { }
