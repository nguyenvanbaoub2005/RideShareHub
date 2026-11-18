package com.ridesharehub.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.ridesharehub.auth.enums.UserRole;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 150) String fullName,
        @NotNull UserRole role,
        @Size(max = 20) String phone) {

    public RegisterRequest(String email, String password, String fullName, UserRole role) {
        this(email, password, fullName, role, null);
    }
}
