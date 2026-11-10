package com.techcare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalarySettlementResponse {

    private Long id;
    private Long staffId;
    private String staffName;
    private String staffEmail;
    private String staffPhone;
    private String staffRole;

    private String salaryMonth;
    private BigDecimal baseSalary;
    private BigDecimal bonus;
    private BigDecimal deductions;
    private BigDecimal netSalary;

    private String paymentMethod;
    private String transactionRef;
    private LocalDate paymentDate;
    private String status;
    private String notes;

    private Long settledById;
    private String settledByName;
    private LocalDateTime createdAt;
}
