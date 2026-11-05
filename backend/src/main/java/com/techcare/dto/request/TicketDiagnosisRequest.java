package com.techcare.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class TicketDiagnosisRequest {

    private String diagnosticNotes;
    private BigDecimal estimatedCost;
    private BigDecimal laborCharge;
    private LocalDateTime estimatedCompletionDate;
}

