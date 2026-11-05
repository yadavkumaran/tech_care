package com.techcare.service;

import com.techcare.dto.response.DashboardStatsResponse;
import com.techcare.entity.RepairTicket;
import com.techcare.entity.enums.TicketStatus;
import com.techcare.repository.InventoryItemRepository;
import com.techcare.repository.InvoiceRepository;
import com.techcare.repository.PaymentRepository;
import com.techcare.repository.RepairTicketRepository;
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

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        long activeRepairs = ticketRepository.countActiveTickets();
        long pendingApproval = ticketRepository.countByStatus(TicketStatus.ESTIMATION_PENDING);
        long readyForDelivery = ticketRepository.countByStatus(TicketStatus.READY_FOR_DELIVERY);
        long lowStockCount = inventoryRepository.findLowStockItems().size();

        // Calculate today's revenue collected from payments
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        BigDecimal todayRevenue = paymentRepository.sumPaymentsBetween(startOfDay, endOfDay);

        // Calculate total customer outstanding dues
        BigDecimal totalOutstanding = invoiceRepository.calculateTotalOutstandingReceivables();

        // Get recent 5 repair tickets
        List<RepairTicket> recentTickets = ticketRepository.findAll(
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).getContent();

        return DashboardStatsResponse.builder()
                .totalActiveRepairs(activeRepairs)
                .pendingApprovalCount(pendingApproval)
                .readyForDeliveryCount(readyForDelivery)
                .lowStockCount(lowStockCount)
                .todayRevenue(todayRevenue)
                .totalOutstandingDues(totalOutstanding)
                .recentTickets(recentTickets)
                .build();
    }
}

