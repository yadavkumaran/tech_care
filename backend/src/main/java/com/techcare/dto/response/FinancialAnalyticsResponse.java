package com.techcare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialAnalyticsResponse {

    private String period; // TODAY, THIS_WEEK, THIS_MONTH, ALL_TIME
    private LocalDate startDate;
    private LocalDate endDate;

    // Revenue streams
    private BigDecimal totalRevenue;
    private BigDecimal serviceRevenue;
    private BigDecimal hardwareRevenue;

    // Costs & Profitability
    private BigDecimal cogs; // Cost of Goods Sold (inventory cost)
    private BigDecimal grossProfit; // Revenue - COGS
    private Double grossMarginPercent;

    // Operating Outflows
    private BigDecimal salaryExpenses; // Settled staff payroll
    private BigDecimal purchaseExpenses; // Vendor inventory procurements

    // Net Bottom Line
    private BigDecimal netProfit; // Gross Profit - Salary Expenses
    private Double netMarginPercent;

    // Operational context
    private BigDecimal totalReceivables;
    private long totalInvoices;
    private long settledSalariesCount;
}
