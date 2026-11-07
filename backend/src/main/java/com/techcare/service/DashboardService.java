package com.techcare.service;

import com.techcare.dto.response.DashboardStatsResponse;
import com.techcare.entity.RepairTicket;
import com.techcare.entity.User;
import com.techcare.entity.enums.Role;
import com.techcare.entity.enums.TicketStatus;
import com.techcare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final RepairTicketRepository ticketRepository;
    private final InventoryItemRepository inventoryRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;

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

        DashboardStatsResponse.DashboardStatsResponseBuilder builder = DashboardStatsResponse.builder()
                .totalActiveRepairs(activeRepairs)
                .pendingApprovalCount(pendingApproval)
                .readyForDeliveryCount(readyForDelivery)
                .lowStockCount(lowStockCount)
                .totalCustomersCount(totalCustomers)
                .activeTechniciansCount(activeTechs);

        // If logged-in user is a TECHNICIAN: provide technician-specific workbench KPIs and omit revenues
        if (currentUser != null && currentUser.getRole() == Role.TECHNICIAN) {
            Long techId = currentUser.getId();
            long myActive = ticketRepository.countActiveByTechnicianId(techId);
            long myCompleted = ticketRepository.countCompletedByTechnicianId(techId);
            long myPendingDiag = ticketRepository.countPendingDiagnosticsByTechnicianId(techId);
            long myHighPriority = ticketRepository.countHighPriorityByTechnicianId(techId);
            List<RepairTicket> myTickets = ticketRepository.findRecentAssignedTickets(techId, PageRequest.of(0, 8));

            return builder
                    .myActiveJobsCount(myActive)
                    .myCompletedCasesCount(myCompleted)
                    .myPendingDiagnosticsCount(myPendingDiag)
                    .myHighPriorityCount(myHighPriority)
                    .myAssignedTickets(myTickets)
                    .todayRevenue(null) // Hide financial revenue from technicians
                    .totalOutstandingDues(null)
                    .recentTickets(myTickets)
                    .build();
        }

        // For ADMIN and RECEPTIONIST: provide full business financial and recent operational queue
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
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
}

