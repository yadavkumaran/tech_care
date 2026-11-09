package com.techcare.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RazorpayOrderRequest {
    @NotNull(message = "Invoice ID is required")
    private Long invoiceId;

    private BigDecimal amount;
}

