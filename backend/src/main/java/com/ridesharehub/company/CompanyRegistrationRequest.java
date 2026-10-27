package com.ridesharehub.company;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * POST /api/v1/companies/registrations
 * Fields aligned with CompanyRegistrationRequest in openapi.yaml.
 */
public record CompanyRegistrationRequest(
        @NotBlank @Size(max = 200) String name,
        @NotBlank @Size(max = 20)  String phone,
        @NotBlank @Size(max = 500) String address,
        @NotBlank @Size(max = 150) String representativeName,
        @NotBlank @Size(max = 2000) String businessInformation) { }
