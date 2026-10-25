package com.ridesharehub.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/**
 * Standard API Response wrapper for all endpoints.
 *
 * <p>Modelled after the SCMS project response convention.
 *
 * <pre>
 * Success: { status: 200, message: "Success", data: {...} }
 * Error:   { status: 401, message: "Unauthenticated" }
 * </pre>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        int status,
        String message,
        T data,
        Instant timestamp) {

    private static final String MSG_SUCCESS = "Success";

    // ------------------------------------------------------------------ factory

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(200, MSG_SUCCESS, data, Instant.now());
    }

    public static ApiResponse<Void> success() {
        return new ApiResponse<>(200, MSG_SUCCESS, null, Instant.now());
    }

    public static ApiResponse<Void> created() {
        return new ApiResponse<>(201, "Created", null, Instant.now());
    }

    public static <T> ApiResponse<T> created(T data) {
        return new ApiResponse<>(201, "Created", data, Instant.now());
    }

    public static ApiResponse<Void> error(int status, String message) {
        return new ApiResponse<>(status, message, null, Instant.now());
    }
}
