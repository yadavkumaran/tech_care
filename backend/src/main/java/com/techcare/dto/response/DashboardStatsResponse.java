package com.techcare.dto.response;

import com.techcare.entity.RepairTicket;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {

    private long totalActiveRepairs;
    private long pendingApprovalCount;
    private long readyForDeliveryCount;
    private long lowStockCount;

    private BigDecimal todayRevenue;
    private BigDecimal totalOutstandingDues;

    private List<RepairTicket> recentTickets;
}

