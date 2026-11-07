package com.techcare.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketStatusUpdateRequest {

    @NotNull(message = "New status is required")
    private String status; // RECEIVED, DIAGNOSING, ESTIMATION_PENDING, APPROVED, REJECTED, IN_PROGRESS, READY_FOR_DELIVERY, DELIVERED, CANCELLED

    private String remarks;
}

