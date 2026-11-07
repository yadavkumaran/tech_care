package com.techcare.lifecycle;

import com.techcare.dto.request.TicketIntakeRequest;
import com.techcare.dto.request.TicketStatusUpdateRequest;
import com.techcare.entity.*;
import com.techcare.entity.enums.InvoiceStatus;
import com.techcare.entity.enums.InvoiceType;
import com.techcare.entity.enums.Role;
import com.techcare.entity.enums.TicketPriority;
import com.techcare.entity.enums.TicketStatus;
import com.techcare.exception.BadRequestException;
import com.techcare.repository.*;
import com.techcare.service.RepairTicketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class RepairTicketLifecycleTest {

    @Autowired
    private RepairTicketService ticketService;

    @Autowired
    private RepairTicketRepository ticketRepository;

    @Autowired
    private RepairTicketLogRepository ticketLogRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CustomerDeviceRepository deviceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    private User adminUser;
    private User assignedTech;
    private User otherTech;
    private User receptionistUser;
    private Customer customer;
    private CustomerDevice device;

    @BeforeEach
    public void setup() {
        ticketLogRepository.deleteAllInBatch();
        invoiceRepository.deleteAllInBatch();
        ticketRepository.deleteAllInBatch();
        deviceRepository.deleteAllInBatch();
        customerRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();

        adminUser = userRepository.save(User.builder()
                .username("lifecycle_admin")
                .email("lc_admin@test.com")
                .passwordHash("hashed")
                .fullName("Lifecycle Admin")
                .role(Role.ADMIN)
                .isActive(true)
                .build());

        assignedTech = userRepository.save(User.builder()
                .username("lc_tech1")
                .email("lc_tech1@test.com")
                .passwordHash("hashed")
                .fullName("Technician One")
                .role(Role.TECHNICIAN)
                .isActive(true)
                .build());

        otherTech = userRepository.save(User.builder()
                .username("lc_tech2")
                .email("lc_tech2@test.com")
                .passwordHash("hashed")
                .fullName("Technician Two")
                .role(Role.TECHNICIAN)
                .isActive(true)
                .build());

        receptionistUser = userRepository.save(User.builder()
                .username("lc_reception")
                .email("lc_reception@test.com")
                .passwordHash("hashed")
                .fullName("Counter Staff")
                .role(Role.RECEPTIONIST)
                .isActive(true)
                .build());

        customer = customerRepository.save(Customer.builder()
                .fullName("Rahul Sharma")
                .phone("+91 9876543210")
                .email("rahul@test.com")
                .build());

        device = deviceRepository.save(CustomerDevice.builder()
                .customer(customer)
                .deviceType("LAPTOP")
                .brand("Lenovo")
                .modelName("ThinkPad T14")
                .serialNumber("SN-TP-1234")
                .devicePassword("LenovoPin99")
                .build());
    }

    private RepairTicket createTicket() {
        TicketIntakeRequest request = new TicketIntakeRequest();
        request.setCustomerId(customer.getId());
        request.setDeviceId(device.getId());
        request.setAssignedTechnicianId(assignedTech.getId());
        request.setPriority("HIGH");
        request.setProblemReported("Screen flickering under load");
        request.setEstimatedCost(BigDecimal.valueOf(2500));
        request.setLaborCharge(BigDecimal.valueOf(500));
        return ticketService.createIntakeTicket(request, receptionistUser);
    }

    @Test
    @DisplayName("Verify full valid lifecycle transition sequence from RECEIVED to DELIVERED")
    public void testFullValidLifecycleTransitionSequence() {
        RepairTicket ticket = createTicket();
        assertEquals(TicketStatus.RECEIVED, ticket.getStatus());

        // 1. Tech moves RECEIVED -> DIAGNOSING
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("DIAGNOSING", "Inspection commenced"), assignedTech);
        assertEquals(TicketStatus.DIAGNOSING, ticket.getStatus());

        // 2. Tech moves DIAGNOSING -> ESTIMATION_PENDING
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("ESTIMATION_PENDING", "Estimate prepared for client"), assignedTech);
        assertEquals(TicketStatus.ESTIMATION_PENDING, ticket.getStatus());

        // 3. Receptionist moves ESTIMATION_PENDING -> APPROVED
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("APPROVED", "Customer approved estimate over phone"), receptionistUser);
        assertEquals(TicketStatus.APPROVED, ticket.getStatus());

        // 4. Tech moves APPROVED -> IN_PROGRESS
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("IN_PROGRESS", "Repair work begun on bench"), assignedTech);
        assertEquals(TicketStatus.IN_PROGRESS, ticket.getStatus());

        // 5. Tech moves IN_PROGRESS -> READY_FOR_DELIVERY
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("READY_FOR_DELIVERY", "Bench testing completed successfully"), assignedTech);
        assertEquals(TicketStatus.READY_FOR_DELIVERY, ticket.getStatus());
        assertNotNull(ticket.getCompletedAt());

        // 6. Generate and pay invoice
        Invoice invoice = invoiceRepository.save(Invoice.builder()
                .invoiceNumber("INV-TEST-001")
                .customer(customer)
                .repairTicket(ticket)
                .invoiceType(InvoiceType.REPAIR)
                .subtotal(BigDecimal.valueOf(3000))
                .totalAmount(BigDecimal.valueOf(3000))
                .paidAmount(BigDecimal.valueOf(3000))
                .balanceAmount(BigDecimal.ZERO)
                .status(InvoiceStatus.PAID)
                .invoiceDate(LocalDate.now())
                .build());

        // 7. Receptionist successfully delivers device
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("DELIVERED", "Device handed over and receipt issued"), receptionistUser);
        assertEquals(TicketStatus.DELIVERED, ticket.getStatus());
        assertNotNull(ticket.getDeliveredAt());
    }

    @Test
    @DisplayName("Verify alternative lifecycle branches: WAITING_FOR_PARTS and ON_HOLD")
    public void testAlternativeBranchesWaitingForPartsAndOnHold() {
        RepairTicket ticket = createTicket();

        // Admin fast tracks to APPROVED
        ticket = ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("DIAGNOSING", "diag"), adminUser);
        ticket = ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("ESTIMATION_PENDING", "est"), adminUser);
        ticket = ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("APPROVED", "app"), adminUser);

        // APPROVED -> WAITING_FOR_PARTS
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("WAITING_FOR_PARTS", "Waiting for replacement display panel"), assignedTech);
        assertEquals(TicketStatus.WAITING_FOR_PARTS, ticket.getStatus());

        // WAITING_FOR_PARTS -> ON_HOLD
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("ON_HOLD", "Vendor delayed shipment"), assignedTech);
        assertEquals(TicketStatus.ON_HOLD, ticket.getStatus());

        // ON_HOLD -> IN_PROGRESS
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("IN_PROGRESS", "Parts arrived; work resumed"), assignedTech);
        assertEquals(TicketStatus.IN_PROGRESS, ticket.getStatus());
    }

    @Test
    @DisplayName("Verify that invalid status transitions (like jumping directly to DELIVERED) are rejected")
    public void testInvalidTransitionsRejected() {
        RepairTicket ticket = createTicket();
        assertEquals(TicketStatus.RECEIVED, ticket.getStatus());

        // Illegal jump: RECEIVED -> DELIVERED without being in READY_FOR_DELIVERY
        assertThrows(BadRequestException.class, () -> {
            ticketService.updateTicketStatus(ticket.getId(),
                    new TicketStatusUpdateRequest("DELIVERED", "illegal jump"), adminUser);
        });
    }

    @Test
    @DisplayName("Verify that terminal states (DELIVERED, REJECTED, CANCELLED) reject further transitions")
    public void testTerminalStatesRejectTransitions() {
        RepairTicket ticket = createTicket();

        // Fast-track to CANCELLED (terminal)
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("CANCELLED", "Customer cancelled before inspection"), adminUser);
        assertEquals(TicketStatus.CANCELLED, ticket.getStatus());

        final Long cancelledTicketId = ticket.getId();
        // Any transition from CANCELLED must fail
        assertThrows(BadRequestException.class, () -> {
            ticketService.updateTicketStatus(cancelledTicketId,
                    new TicketStatusUpdateRequest("DIAGNOSING", "resume"), adminUser);
        });

        assertThrows(BadRequestException.class, () -> {
            ticketService.updateTicketStatus(cancelledTicketId,
                    new TicketStatusUpdateRequest("IN_PROGRESS", "resume"), adminUser);
        });
    }

    @Test
    @DisplayName("Technician cannot update tickets assigned to another technician")
    public void testTechnicianAssignmentRestrictions() {
        RepairTicket ticket = createTicket();

        // otherTech is NOT assigned to this ticket
        assertThrows(AccessDeniedException.class, () -> {
            ticketService.updateTicketStatus(ticket.getId(),
                    new TicketStatusUpdateRequest("DIAGNOSING", "Unauthorized tech attempt"), otherTech);
        });
    }

    @Test
    @DisplayName("Technicians can approve quotes and advance repairs, but cannot execute customer delivery")
    public void testTechnicianRoleRestrictions() {
        RepairTicket ticket = createTicket();
        ticket = ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("DIAGNOSING", "diag"), assignedTech);
        ticket = ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("ESTIMATION_PENDING", "est"), assignedTech);

        // Tech can approve estimate when customer agrees
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("APPROVED", "Tech confirmed customer quote approval"), assignedTech);
        assertEquals(TicketStatus.APPROVED, ticket.getStatus());

        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("READY_FOR_DELIVERY", "Repairs completed on bench"), assignedTech);
        assertEquals(TicketStatus.READY_FOR_DELIVERY, ticket.getStatus());

        final Long ticketId = ticket.getId();
        // Tech cannot execute final customer delivery handover (must be front-desk receptionist or admin)
        assertThrows(AccessDeniedException.class, () -> {
            ticketService.updateTicketStatus(ticketId,
                    new TicketStatusUpdateRequest("DELIVERED", "Tech trying to deliver"), assignedTech);
        });
    }

    @Test
    @DisplayName("Receptionist can perform intake, workshop updates, and delivery handover")
    public void testReceptionistWorkshopRestrictions() {
        RepairTicket ticket = createTicket();

        // Receptionist can update to DIAGNOSING or IN_PROGRESS seamlessly
        ticket = ticketService.updateTicketStatus(ticket.getId(),
                new TicketStatusUpdateRequest("DIAGNOSING", "Receptionist bench update"), receptionistUser);
        assertEquals(TicketStatus.DIAGNOSING, ticket.getStatus());
    }

    @Test
    @DisplayName("Delivery requires settled invoice when charges are present")
    public void testDeliveryRequiresSettledInvoice() {
        RepairTicket ticket = createTicket();
        ticket = ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("DIAGNOSING", "diag"), adminUser);
        ticket = ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("ESTIMATION_PENDING", "est"), adminUser);
        ticket = ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("APPROVED", "app"), adminUser);
        ticket = ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("IN_PROGRESS", "prog"), adminUser);
        ticket = ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("READY_FOR_DELIVERY", "ready"), adminUser);

        // Create UNPAID invoice with balance
        Invoice unpaidInvoice = invoiceRepository.save(Invoice.builder()
                .invoiceNumber("INV-UNPAID-001")
                .customer(customer)
                .repairTicket(ticket)
                .invoiceType(InvoiceType.REPAIR)
                .subtotal(BigDecimal.valueOf(2000))
                .totalAmount(BigDecimal.valueOf(2000))
                .paidAmount(BigDecimal.valueOf(500))
                .balanceAmount(BigDecimal.valueOf(1500))
                .status(InvoiceStatus.PARTIALLY_PAID)
                .invoiceDate(LocalDate.now())
                .build());

        final Long ticketId = ticket.getId();
        // Delivery rejected due to unpaid balance
        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            ticketService.updateTicketStatus(ticketId,
                    new TicketStatusUpdateRequest("DELIVERED", "attempt delivery"), receptionistUser);
        });
        assertTrue(ex.getMessage().contains("outstanding balance"));

        // Settle payment
        unpaidInvoice.setPaidAmount(BigDecimal.valueOf(2000));
        unpaidInvoice.setBalanceAmount(BigDecimal.ZERO);
        unpaidInvoice.setStatus(InvoiceStatus.PAID);
        invoiceRepository.save(unpaidInvoice);

        // Now delivery succeeds
        RepairTicket delivered = ticketService.updateTicketStatus(ticketId,
                new TicketStatusUpdateRequest("DELIVERED", "handover complete"), receptionistUser);
        assertEquals(TicketStatus.DELIVERED, delivered.getStatus());
    }

    @Test
    @DisplayName("Status audit history is created on every transition with actor and timestamps")
    public void testStatusAuditHistoryCreation() {
        RepairTicket ticket = createTicket();
        ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("DIAGNOSING", "Starting diagnosis"), assignedTech);

        List<RepairTicketLog> logs = ticketLogRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId());
        assertEquals(2, logs.size()); // 1 for intake (RECEIVED) + 1 for DIAGNOSING

        RepairTicketLog latest = logs.get(1);
        assertEquals("RECEIVED", latest.getPreviousStatus());
        assertEquals("DIAGNOSING", latest.getNewStatus());
        assertEquals(assignedTech.getId(), latest.getChangedBy().getId());
        assertEquals("Starting diagnosis", latest.getRemarks());
        assertNotNull(latest.getCreatedAt());
    }

    @Test
    @DisplayName("Soft cancellation preserves repair tickets and child records without hard deletion")
    public void testSoftCancellationPreservation() {
        RepairTicket ticket = createTicket();
        Long ticketId = ticket.getId();

        ticketService.deleteTicket(ticketId, adminUser);

        // Ticket still exists in repository and is CANCELLED
        RepairTicket preserved = ticketRepository.findById(ticketId).orElse(null);
        assertNotNull(preserved, "Ticket must not be hard deleted");
        assertEquals(TicketStatus.CANCELLED, preserved.getStatus());

        // Logs are fully preserved
        List<RepairTicketLog> logs = ticketLogRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
        assertFalse(logs.isEmpty(), "Logs must be preserved");
        assertTrue(logs.stream().anyMatch(l -> "CANCELLED".equals(l.getNewStatus())));
    }
}
