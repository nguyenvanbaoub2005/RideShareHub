package com.ridesharehub.auth.dto;

import com.ridesharehub.auth.entity.User;
import com.ridesharehub.auth.enums.UserRole;

public record UserProfileResponse(
        Long id,
        String email,
        String fullName,
        String phone,
        UserRole role) {

    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getRole());
    }
}
