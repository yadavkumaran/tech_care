package com.techcare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SalarySettlementRequest {

    @NotNull(message = "Staff member ID is required")
    private Long staffId;

    @NotBlank(message = "Salary month is required (e.g. November 2026)")
    private String salaryMonth;

    @NotNull(message = "Base salary is required")
    private BigDecimal baseSalary;

    private BigDecimal bonus = BigDecimal.ZERO;

    private BigDecimal deductions = BigDecimal.ZERO;

    @NotBlank(message = "Payment method is required (CASH, BANK_TRANSFER, UPI, CHEQUE)")
    private String paymentMethod;

    private String transactionRef;

    private LocalDate paymentDate = LocalDate.now();

    private String notes;
}
