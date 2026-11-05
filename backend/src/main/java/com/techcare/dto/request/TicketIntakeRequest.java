package com.techcare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class TicketIntakeRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotNull(message = "Device ID is required")
    private Long deviceId;

    private Long assignedTechnicianId;

    @NotBlank(message = "Problem description is required")
    private String problemReported;

    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, URGENT
    private BigDecimal estimatedCost;
    private BigDecimal laborCharge;
    private LocalDateTime estimatedCompletionDate;
}

