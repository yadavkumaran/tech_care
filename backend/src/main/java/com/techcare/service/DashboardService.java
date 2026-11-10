package com.techcare.service;

import com.techcare.dto.response.DashboardStatsResponse;
import com.techcare.dto.response.FinancialAnalyticsResponse;
import com.techcare.entity.Invoice;
import com.techcare.entity.InvoiceItem;
import com.techcare.entity.RepairTicket;
import com.techcare.entity.User;
import com.techcare.entity.enums.InvoiceStatus;
import com.techcare.entity.enums.Role;
import com.techcare.entity.enums.TicketStatus;
import com.techcare.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final RepairTicketRepository ticketRepository;
    private final InventoryItemRepository inventoryRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final SalarySettlementRepository salaryRepository;
    private final PurchaseRepository purchaseRepository;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        return getDashboardStats(null);
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats(User currentUser) {
        long activeRepairs = ticketRepository.countActiveTickets();
        long pendingApproval = ticketRepository.countByStatus(TicketStatus.ESTIMATION_PENDING);
        long readyForDelivery = ticketRepository.countByStatus(TicketStatus.READY_FOR_DELIVERY);
        long lowStockCount = inventoryRepository.findLowStockItems().size();
        long totalCustomers = customerRepository.count();
        long activeTechs = userRepository.findByRoleAndIsActiveTrue(Role.TECHNICIAN).size();

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        long dueToday = ticketRepository.countDueToday(startOfDay, endOfDay);
        long overdue = ticketRepository.countOverdue(startOfDay);

        DashboardStatsResponse.DashboardStatsResponseBuilder builder = DashboardStatsResponse.builder()
                .totalActiveRepairs(activeRepairs)
                .pendingApprovalCount(pendingApproval)
                .readyForDeliveryCount(readyForDelivery)
                .lowStockCount(lowStockCount)
                .dueTodayCount(dueToday)
                .overdueCount(overdue)
                .totalCustomersCount(totalCustomers)
                .activeTechniciansCount(activeTechs);

        // If logged-in user is a TECHNICIAN: provide technician-specific workbench KPIs and omit revenues
        if (currentUser != null && currentUser.getRole() == Role.TECHNICIAN) {
            Long techId = currentUser.getId();
            long myActive = ticketRepository.countActiveByTechnicianId(techId);
            long myCompleted = ticketRepository.countCompletedByTechnicianId(techId);
            long myPendingDiag = ticketRepository.countPendingDiagnosticsByTechnicianId(techId);
            long myHighPriority = ticketRepository.countHighPriorityByTechnicianId(techId);
            long myDueToday = ticketRepository.countDueTodayByTechnicianId(techId, startOfDay, endOfDay);
            long myOverdue = ticketRepository.countOverdueByTechnicianId(techId, startOfDay);
            List<RepairTicket> myTickets = ticketRepository.findRecentAssignedTickets(techId, PageRequest.of(0, 8));

            return builder
                    .myActiveJobsCount(myActive)
                    .myCompletedCasesCount(myCompleted)
                    .myPendingDiagnosticsCount(myPendingDiag)
                    .myHighPriorityCount(myHighPriority)
                    .dueTodayCount(myDueToday)
                    .overdueCount(myOverdue)
                    .myAssignedTickets(myTickets)
                    .todayRevenue(null) // Hide financial revenue from technicians
                    .totalOutstandingDues(null)
                    .recentTickets(myTickets)
                    .build();
        }

        // For ADMIN and RECEPTIONIST: provide full business financial and recent operational queue
        BigDecimal todayRevenue = paymentRepository.sumPaymentsBetween(startOfDay, endOfDay);
        BigDecimal totalOutstanding = invoiceRepository.calculateTotalOutstandingReceivables();

        List<RepairTicket> recentTickets = ticketRepository.findAll(
                PageRequest.of(0, 6, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).getContent();

        return builder
                .todayRevenue(todayRevenue != null ? todayRevenue : BigDecimal.ZERO)
                .totalOutstandingDues(totalOutstanding != null ? totalOutstanding : BigDecimal.ZERO)
                .recentTickets(recentTickets)
                .build();
    }

    @Transactional(readOnly = true)
    public FinancialAnalyticsResponse getFinancialAnalytics(String periodStr) {
        String period = (periodStr != null && !periodStr.trim().isEmpty())
                ? periodStr.trim().toUpperCase()
                : "THIS_MONTH";

        LocalDate today = LocalDate.now();
        LocalDate start;
        LocalDate end = today;

        switch (period) {
            case "TODAY":
                start = today;
                break;
            case "THIS_WEEK":
                start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                break;
            case "ALL_TIME":
                start = LocalDate.of(2020, 1, 1);
                break;
            case "THIS_MONTH":
            default:
                period = "THIS_MONTH";
                start = today.withDayOfMonth(1);
                break;
        }

        List<Invoice> invoices = period.equals("ALL_TIME")
                ? invoiceRepository.findAllInvoicesWithItems(InvoiceStatus.CANCELLED)
                : invoiceRepository.findInvoicesWithItemsBetween(start, end, InvoiceStatus.CANCELLED);

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal serviceRevenue = BigDecimal.ZERO;
        BigDecimal hardwareRevenue = BigDecimal.ZERO;
        BigDecimal cogs = BigDecimal.ZERO;

        for (Invoice inv : invoices) {
            BigDecimal invTotal = inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO;
            totalRevenue = totalRevenue.add(invTotal);
            if (inv.getItems() != null && !inv.getItems().isEmpty()) {
                for (InvoiceItem item : inv.getItems()) {
                    BigDecimal itemTotal = item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO;
                    if ("LABOR".equalsIgnoreCase(item.getItemType())) {
                        serviceRevenue = serviceRevenue.add(itemTotal);
                    } else {
                        hardwareRevenue = hardwareRevenue.add(itemTotal);
                        if (item.getItem() != null && item.getItem().getCostPrice() != null) {
                            BigDecimal unitCost = item.getItem().getCostPrice();
                            BigDecimal itemCost = unitCost.multiply(BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 1));
                            cogs = cogs.add(itemCost);
                        }
                    }
                }
            } else {
                // If an invoice has no discrete line items recorded, allocate to service revenue
                serviceRevenue = serviceRevenue.add(invTotal);
            }
        }

        BigDecimal grossProfit = totalRevenue.subtract(cogs);
        double grossMarginPercent = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? (grossProfit.divide(totalRevenue, 4, RoundingMode.HALF_UP).doubleValue() * 100.0)
                : 0.0;

        BigDecimal salaryExpenses = BigDecimal.ZERO;
        long settledSalariesCount = 0;
        try {
            salaryExpenses = period.equals("ALL_TIME")
                    ? salaryRepository.sumAllNetSalary()
                    : salaryRepository.sumNetSalaryBetween(start, end);
            if (salaryExpenses == null) salaryExpenses = BigDecimal.ZERO;

            settledSalariesCount = period.equals("ALL_TIME")
                    ? salaryRepository.count()
                    : salaryRepository.countSettlementsBetween(start, end);
        } catch (Exception e) {
            log.warn("Could not query salary settlements for analytics: {}", e.getMessage());
        }

        BigDecimal purchaseExpenses = BigDecimal.ZERO;
        try {
            purchaseExpenses = period.equals("ALL_TIME")
                    ? purchaseRepository.sumAllPurchases()
                    : purchaseRepository.sumPurchasesBetween(start, end);
            if (purchaseExpenses == null) purchaseExpenses = BigDecimal.ZERO;
        } catch (Exception e) {
            log.warn("Could not query purchase expenses for analytics: {}", e.getMessage());
        }

        BigDecimal netProfit = grossProfit.subtract(salaryExpenses);
        double netMarginPercent = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? (netProfit.divide(totalRevenue, 4, RoundingMode.HALF_UP).doubleValue() * 100.0)
                : 0.0;

        BigDecimal totalReceivables = BigDecimal.ZERO;
        try {
            totalReceivables = invoiceRepository.calculateTotalOutstandingReceivables();
        } catch (Exception e) {
            log.warn("Could not calculate outstanding receivables: {}", e.getMessage());
        }

        return FinancialAnalyticsResponse.builder()
                .period(period)
                .startDate(start)
                .endDate(end)
                .totalRevenue(totalRevenue)
                .serviceRevenue(serviceRevenue)
                .hardwareRevenue(hardwareRevenue)
                .cogs(cogs)
                .grossProfit(grossProfit)
                .grossMarginPercent(Math.round(grossMarginPercent * 10.0) / 10.0)
                .salaryExpenses(salaryExpenses)
                .purchaseExpenses(purchaseExpenses)
                .netProfit(netProfit)
                .netMarginPercent(Math.round(netMarginPercent * 10.0) / 10.0)
                .totalReceivables(totalReceivables != null ? totalReceivables : BigDecimal.ZERO)
                .totalInvoices(invoices.size())
                .settledSalariesCount((int) settledSalariesCount)
                .build();
    }
}

