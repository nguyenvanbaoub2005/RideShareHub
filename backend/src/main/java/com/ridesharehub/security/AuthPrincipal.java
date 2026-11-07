package com.ridesharehub.security;

import com.ridesharehub.auth.entity.UserRole;
import com.ridesharehub.auth.enums.UserRole;

public record AuthPrincipal(Long userId, String email, UserRole role) { }
