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

    // Workbench SLA metrics
    private long dueTodayCount;
    private long overdueCount;

    private BigDecimal todayRevenue;
    private BigDecimal totalOutstandingDues;

    // Technician-specific metrics (cases handled, active queue, urgent jobs)
    private long myActiveJobsCount;
    private long myCompletedCasesCount;
    private long myPendingDiagnosticsCount;
    private long myHighPriorityCount;

    // Receptionist / Operations metrics
    private long totalCustomersCount;
    private long activeTechniciansCount;

    private List<RepairTicket> recentTickets;
    private List<RepairTicket> myAssignedTickets;
}

