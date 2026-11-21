package com.ridesharehub.rating.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * SP4-P1-01: Passenger rating payload supporting either a single overall score
 * or detailed Figma PA-15 sub-scores (trip, driver, company).
 */
public record CreateRatingRequest(
        @Min(value = 1, message = "Điểm đánh giá phải từ 1 đến 5 sao")
        @Max(value = 5, message = "Điểm đánh giá phải từ 1 đến 5 sao")
        Integer score,
        @Min(value = 1, message = "Điểm chuyến đi phải từ 1 đến 5 sao")
        @Max(value = 5, message = "Điểm chuyến đi phải từ 1 đến 5 sao")
        Integer tripScore,
        @Min(value = 1, message = "Điểm tài xế phải từ 1 đến 5 sao")
        @Max(value = 5, message = "Điểm tài xế phải từ 1 đến 5 sao")
        Integer driverScore,
        @Min(value = 1, message = "Điểm nhà xe phải từ 1 đến 5 sao")
        @Max(value = 5, message = "Điểm nhà xe phải từ 1 đến 5 sao")
        Integer companyScore,
        @Size(max = 500, message = "Nhận xét tối đa 500 ký tự")
        String comment) {
}
