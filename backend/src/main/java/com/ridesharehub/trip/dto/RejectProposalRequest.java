package com.ridesharehub.trip.dto;

import jakarta.validation.constraints.Size;

public record RejectProposalRequest(
        @Size(max = 500, message = "Lý do từ chối tối đa 500 ký tự")
        String reason) {
}
