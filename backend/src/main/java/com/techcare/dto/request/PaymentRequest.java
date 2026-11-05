package com.techcare.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequest {

    @NotNull(message = "Invoice ID is required")
    private Long invoiceId;

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", message = "Payment amount must be greater than zero")
    private BigDecimal amount;

    @NotBlank(message = "Payment method is required (CASH, UPI, CARD, BANK_TRANSFER)")
    private String paymentMethod;

    private String paymentType = "FINAL_SETTLEMENT"; // ADVANCE_DEPOSIT, FINAL_SETTLEMENT, PARTIAL_PAYMENT
    private String transactionNotes;
}

