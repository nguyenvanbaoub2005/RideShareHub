package com.ridesharehub.driver;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** POST/PUT /api/v1/companies/{companyId}/drivers */
public record DriverRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Size(max = 20)  String phone,
        @NotBlank @Size(max = 50)  String licenseNumber) { }

