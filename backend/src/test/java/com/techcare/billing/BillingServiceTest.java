package com.techcare.billing;

import com.techcare.dto.request.InvoiceRequest;
import com.techcare.dto.request.PaymentRequest;
import com.techcare.dto.request.TicketIntakeRequest;
import com.techcare.dto.request.TicketStatusUpdateRequest;
import com.techcare.entity.*;
import com.techcare.entity.enums.InvoiceStatus;
import com.techcare.entity.enums.InvoiceType;
import com.techcare.entity.enums.Role;
import com.techcare.entity.enums.TicketStatus;
import com.techcare.exception.BadRequestException;
import com.techcare.repository.*;
import com.techcare.service.InvoiceService;
import com.techcare.service.PaymentService;
import com.techcare.service.RepairTicketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class BillingServiceTest {

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private RepairTicketService ticketService;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private PaymentRepository paymentRepository;

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
    private InventoryItemRepository inventoryRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private TicketPartUsedRepository ticketPartUsedRepository;

    private User adminUser;
    private User receptionistUser;
    private User technicianUser;
    private Customer customer1;
    private Customer customer2;
    private CustomerDevice device1;
    private InventoryItem screenPart;

    @BeforeEach
    public void setup() {
        paymentRepository.deleteAllInBatch();
        invoiceRepository.deleteAllInBatch();
        ticketPartUsedRepository.deleteAllInBatch();
        ticketLogRepository.deleteAllInBatch();
        ticketRepository.deleteAllInBatch();
        deviceRepository.deleteAllInBatch();
        customerRepository.deleteAllInBatch();
        inventoryRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();

        adminUser = userRepository.save(User.builder()
                .username("bill_admin")
                .email("bill_admin@test.com")
                .passwordHash("hashed")
                .fullName("Billing Admin")
                .role(Role.ADMIN)
                .isActive(true)
                .build());

        receptionistUser = userRepository.save(User.builder()
                .username("bill_reception")
                .email("bill_rec@test.com")
                .passwordHash("hashed")
                .fullName("Billing Receptionist")
                .role(Role.RECEPTIONIST)
                .isActive(true)
                .build());

        technicianUser = userRepository.save(User.builder()
                .username("bill_tech")
                .email("bill_tech@test.com")
                .passwordHash("hashed")
                .fullName("Billing Tech")
                .role(Role.TECHNICIAN)
                .isActive(true)
                .build());

        customer1 = customerRepository.save(Customer.builder()
                .fullName("Ananya Sen")
                .phone("+91 9123456789")
                .email("ananya@test.com")
                .build());

        customer2 = customerRepository.save(Customer.builder()
                .fullName("Vikram Patel")
                .phone("+91 9988776655")
                .email("vikram@test.com")
                .build());

        device1 = deviceRepository.save(CustomerDevice.builder()
                .customer(customer1)
                .deviceType("PHONE")
                .brand("Apple")
                .modelName("iPhone 13")
                .serialNumber("SN-IPHONE-13")
                .build());

        screenPart = inventoryRepository.save(InventoryItem.builder()
                .sku("IPH13-OLED-OEM")
                .name("iPhone 13 OLED Display Panel")
                .category("SCREEN")
                .currentStock(10)
                .reorderLevel(2)
                .costPrice(new BigDecimal("3500.00"))
                .sellingPrice(new BigDecimal("5000.00"))
                .build());
    }

    private RepairTicket createActiveTicket(BigDecimal laborCharge) {
        TicketIntakeRequest intake = new TicketIntakeRequest();
        intake.setCustomerId(customer1.getId());
        intake.setDeviceId(device1.getId());
        intake.setAssignedTechnicianId(technicianUser.getId());
        intake.setPriority("HIGH");
        intake.setProblemReported("Cracked OLED screen");
        intake.setLaborCharge(laborCharge);
        intake.setEstimatedCost(laborCharge.add(new BigDecimal("5000.00")));
        RepairTicket ticket = ticketService.createIntakeTicket(intake, receptionistUser);

        // Move to IN_PROGRESS
        ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("DIAGNOSING", "Checked"), technicianUser);
        ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("ESTIMATION_PENDING", "Cost estimated"), technicianUser);
        ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("APPROVED", "Customer approved"), receptionistUser);
        return ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("IN_PROGRESS", "Repair started"), technicianUser);
    }

    @Test
    @DisplayName("Verify GST calculation is levied on Taxable Value (Subtotal - Discount), not gross subtotal")
    public void testGSTCalculationOnTaxableValue() {
        RepairTicket ticket = createActiveTicket(new BigDecimal("1000.00")); // Labor: 1000

        // Consume 1 OLED part (₹5000)
        com.techcare.dto.request.ConsumePartRequest consumeReq = new com.techcare.dto.request.ConsumePartRequest();
        consumeReq.setItemId(screenPart.getId());
        consumeReq.setQuantity(1);
        ticketService.consumePart(ticket.getId(), consumeReq, technicianUser);

        // Subtotal = 5000 (part) + 1000 (labor) = 6000.00
        // Apply discount of 1000.00 -> Taxable value = 5000.00
        // Tax rate = 18.00% -> Tax amount = 18% of 5000 = 900.00
        // Final Total = 5000 + 900 = 5900.00
        InvoiceRequest req = new InvoiceRequest();
        req.setCustomerId(customer1.getId());
        req.setRepairTicketId(ticket.getId());
        req.setDiscountAmount(new BigDecimal("1000.00"));
        req.setTaxRate(new BigDecimal("18.00"));

        Invoice invoice = invoiceService.generateInvoice(req);

        assertNotNull(invoice.getId());
        assertEquals(new BigDecimal("6000.00"), invoice.getSubtotal());
        assertEquals(new BigDecimal("1000.00"), invoice.getDiscountAmount());
        assertEquals(new BigDecimal("18.00"), invoice.getTaxRate());
        assertEquals(new BigDecimal("900.00"), invoice.getTaxAmount()); // Exactly 900.00, NOT 1080.00!
        assertEquals(new BigDecimal("5900.00"), invoice.getTotalAmount());
        assertEquals(new BigDecimal("5900.00"), invoice.getBalanceAmount());
        assertEquals(0, BigDecimal.ZERO.compareTo(invoice.getPaidAmount()));
        assertEquals(InvoiceStatus.UNPAID, invoice.getStatus());
        assertEquals(2, invoice.getItems().size());
    }

    @Test
    @DisplayName("Verify duplicate invoice generation for same ticket is strictly blocked")
    public void testPreventDuplicateInvoiceGeneration() {
        RepairTicket ticket = createActiveTicket(new BigDecimal("800.00"));

        InvoiceRequest req = new InvoiceRequest();
        req.setCustomerId(customer1.getId());
        req.setRepairTicketId(ticket.getId());
        req.setTaxRate(new BigDecimal("18.00"));

        Invoice firstInvoice = invoiceService.generateInvoice(req);
        assertNotNull(firstInvoice);

        // Second generation attempt must throw BadRequestException
        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            invoiceService.generateInvoice(req);
        });
        assertTrue(ex.getMessage().contains("already been generated"));
    }

    @Test
    @DisplayName("Verify invoice generation fails if customer does not own the repair ticket")
    public void testCustomerMismatchRejection() {
        RepairTicket ticket = createActiveTicket(new BigDecimal("800.00")); // Owned by customer1

        InvoiceRequest req = new InvoiceRequest();
        req.setCustomerId(customer2.getId()); // specify customer2
        req.setRepairTicketId(ticket.getId());

        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            invoiceService.generateInvoice(req);
        });
        assertTrue(ex.getMessage().contains("Customer mismatch"));
    }

    @Test
    @DisplayName("Verify invoice generation fails for CANCELLED or REJECTED tickets")
    public void testTerminalStateTicketInvoicingBlocked() {
        TicketIntakeRequest intake = new TicketIntakeRequest();
        intake.setCustomerId(customer1.getId());
        intake.setDeviceId(device1.getId());
        intake.setPriority("LOW");
        intake.setProblemReported("Camera glass cracked");
        RepairTicket ticket = ticketService.createIntakeTicket(intake, receptionistUser);

        // Cancel ticket
        ticketService.updateTicketStatus(ticket.getId(), new TicketStatusUpdateRequest("CANCELLED", "Cancelled by customer"), receptionistUser);

        InvoiceRequest req = new InvoiceRequest();
        req.setCustomerId(customer1.getId());
        req.setRepairTicketId(ticket.getId());

        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            invoiceService.generateInvoice(req);
        });
        assertTrue(ex.getMessage().contains("Cannot generate invoice for a CANCELLED repair ticket"));
    }

    @Test
    @DisplayName("Verify discount cannot be negative or exceed subtotal")
    public void testDiscountValidation() {
        RepairTicket ticket = createActiveTicket(new BigDecimal("500.00"));

        // Case 1: Negative discount
        InvoiceRequest reqNegative = new InvoiceRequest();
        reqNegative.setCustomerId(customer1.getId());
        reqNegative.setRepairTicketId(ticket.getId());
        reqNegative.setDiscountAmount(new BigDecimal("-100.00"));

        assertThrows(BadRequestException.class, () -> invoiceService.generateInvoice(reqNegative));

        // Case 2: Discount exceeds subtotal (subtotal is 500, discount is 600)
        InvoiceRequest reqExceeds = new InvoiceRequest();
        reqExceeds.setCustomerId(customer1.getId());
        reqExceeds.setRepairTicketId(ticket.getId());
        reqExceeds.setDiscountAmount(new BigDecimal("600.00"));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> invoiceService.generateInvoice(reqExceeds));
        assertTrue(ex.getMessage().contains("cannot exceed subtotal"));
    }

    @Test
    @DisplayName("Verify sequential numbering format INV-YYYY-XXXX and consecutive increments")
    public void testSequentialInvoiceNumbering() {
        // Direct sale invoices
        InvoiceRequest.InvoiceItemDto itemDto = new InvoiceRequest.InvoiceItemDto();
        itemDto.setItemName("USB-C Cable");
        itemDto.setItemType("ACCESSORY");
        itemDto.setQuantity(1);
        itemDto.setUnitPrice(new BigDecimal("299.00"));

        InvoiceRequest req1 = new InvoiceRequest();
        req1.setCustomerId(customer1.getId());
        req1.setInvoiceType("DIRECT_SALE");
        req1.setCustomItems(List.of(itemDto));

        Invoice inv1 = invoiceService.generateInvoice(req1);
        assertTrue(inv1.getInvoiceNumber().matches("INV-\\d{4}-\\d{4}"));

        InvoiceRequest req2 = new InvoiceRequest();
        req2.setCustomerId(customer2.getId());
        req2.setInvoiceType("DIRECT_SALE");
        req2.setCustomItems(List.of(itemDto));

        Invoice inv2 = invoiceService.generateInvoice(req2);
        assertTrue(inv2.getInvoiceNumber().matches("INV-\\d{4}-\\d{4}"));

        // Compare sequence numbers
        int seq1 = Integer.parseInt(inv1.getInvoiceNumber().substring(9));
        int seq2 = Integer.parseInt(inv2.getInvoiceNumber().substring(9));
        assertEquals(seq1 + 1, seq2);
    }

    @Test
    @DisplayName("Verify partial payment and full settlement lifecycle")
    public void testPartialAndFullPaymentLifecycle() {
        InvoiceRequest.InvoiceItemDto itemDto = new InvoiceRequest.InvoiceItemDto();
        itemDto.setItemName("Laptop Charger 65W");
        itemDto.setItemType("ACCESSORY");
        itemDto.setQuantity(1);
        itemDto.setUnitPrice(new BigDecimal("2000.00"));

        InvoiceRequest req = new InvoiceRequest();
        req.setCustomerId(customer1.getId());
        req.setInvoiceType("DIRECT_SALE");
        req.setCustomItems(List.of(itemDto));
        req.setTaxRate(BigDecimal.ZERO); // Total = 2000.00

        Invoice invoice = invoiceService.generateInvoice(req);
        assertEquals(InvoiceStatus.UNPAID, invoice.getStatus());
        assertEquals(new BigDecimal("2000.00"), invoice.getBalanceAmount());
        assertEquals(0, BigDecimal.ZERO.compareTo(invoice.getPaidAmount()));

        // Step 1: Partial payment of 800.00
        PaymentRequest pay1 = new PaymentRequest();
        pay1.setInvoiceId(invoice.getId());
        pay1.setAmount(new BigDecimal("800.00"));
        pay1.setPaymentMethod("UPI");
        pay1.setPaymentType("PARTIAL_PAYMENT");
        pay1.setTransactionNotes("Google Pay ref #9988");

        Payment p1 = paymentService.recordPayment(pay1, receptionistUser);
        assertNotNull(p1.getPaymentReference());
        assertTrue(p1.getPaymentReference().matches("PAY-\\d{4}-\\d{4}"));

        Invoice updated1 = invoiceService.getInvoiceById(invoice.getId());
        assertEquals(InvoiceStatus.PARTIALLY_PAID, updated1.getStatus());
        assertEquals(new BigDecimal("800.00"), updated1.getPaidAmount());
        assertEquals(new BigDecimal("1200.00"), updated1.getBalanceAmount());

        // Step 2: Overpayment attempt must fail
        PaymentRequest payExcess = new PaymentRequest();
        payExcess.setInvoiceId(invoice.getId());
        payExcess.setAmount(new BigDecimal("1500.00")); // exceeds 1200 remaining balance
        payExcess.setPaymentMethod("CASH");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> paymentService.recordPayment(payExcess, receptionistUser));
        assertTrue(ex.getMessage().contains("exceeds remaining balance due"));

        // Step 3: Full remaining settlement of 1200.00
        PaymentRequest pay2 = new PaymentRequest();
        pay2.setInvoiceId(invoice.getId());
        pay2.setAmount(new BigDecimal("1200.00"));
        pay2.setPaymentMethod("CASH");
        pay2.setPaymentType("FINAL_SETTLEMENT");

        Payment p2 = paymentService.recordPayment(pay2, receptionistUser);
        assertNotNull(p2.getPaymentReference());

        Invoice updated2 = invoiceService.getInvoiceById(invoice.getId());
        assertEquals(InvoiceStatus.PAID, updated2.getStatus());
        assertEquals(new BigDecimal("2000.00"), updated2.getPaidAmount());
        assertEquals(0, BigDecimal.ZERO.compareTo(updated2.getBalanceAmount()));

        // Step 4: Payment on fully paid invoice must be rejected
        PaymentRequest payAfterPaid = new PaymentRequest();
        payAfterPaid.setInvoiceId(invoice.getId());
        payAfterPaid.setAmount(new BigDecimal("100.00"));
        payAfterPaid.setPaymentMethod("CASH");

        assertThrows(BadRequestException.class, () -> paymentService.recordPayment(payAfterPaid, receptionistUser));
    }

    @Test
    @DisplayName("Verify invoice cancellation rules: allowed for unpaid, blocked once payments exist")
    public void testInvoiceCancellationRules() {
        InvoiceRequest.InvoiceItemDto itemDto = new InvoiceRequest.InvoiceItemDto();
        itemDto.setItemName("Screen Protector");
        itemDto.setItemType("ACCESSORY");
        itemDto.setQuantity(1);
        itemDto.setUnitPrice(new BigDecimal("500.00"));

        InvoiceRequest req = new InvoiceRequest();
        req.setCustomerId(customer1.getId());
        req.setInvoiceType("DIRECT_SALE");
        req.setCustomItems(List.of(itemDto));

        Invoice inv = invoiceService.generateInvoice(req);
        assertEquals(InvoiceStatus.UNPAID, inv.getStatus());

        // UNPAID invoice can be cancelled
        Invoice cancelled = invoiceService.cancelInvoice(inv.getId());
        assertEquals(InvoiceStatus.CANCELLED, cancelled.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(cancelled.getBalanceAmount()));

        // Payment cannot be recorded on CANCELLED invoice
        PaymentRequest payReq = new PaymentRequest();
        payReq.setInvoiceId(cancelled.getId());
        payReq.setAmount(new BigDecimal("200.00"));
        payReq.setPaymentMethod("CASH");

        BadRequestException ex = assertThrows(BadRequestException.class, () -> paymentService.recordPayment(payReq, receptionistUser));
        assertTrue(ex.getMessage().contains("Cannot record payment for a CANCELLED invoice"));

        // Create second invoice and record a partial payment
        Invoice inv2 = invoiceService.generateInvoice(req);
        PaymentRequest partialPay = new PaymentRequest();
        partialPay.setInvoiceId(inv2.getId());
        partialPay.setAmount(new BigDecimal("200.00"));
        partialPay.setPaymentMethod("CASH");
        paymentService.recordPayment(partialPay, receptionistUser);

        // Cancellation must now fail because payments exist
        BadRequestException ex2 = assertThrows(BadRequestException.class, () -> invoiceService.cancelInvoice(inv2.getId()));
        assertTrue(ex2.getMessage().contains("recorded payments"));
    }

    @Test
    @DisplayName("Verify Direct Hardware Retail Sale stock deduction and restock upon invoice cancellation")
    public void testDirectHardwareSaleStockDeductionAndRestockOnCancel() {
        // Create a standalone retail hardware item with 10 units in stock
        InventoryItem mouseItem = InventoryItem.builder()
                .sku("MOU-WIR-001")
                .name("Wireless Optical Mouse")
                .category("PERIPHERALS")
                .costPrice(new BigDecimal("350.00"))
                .sellingPrice(new BigDecimal("750.00"))
                .currentStock(10)
                .reorderLevel(2)
                .isActive(true)
                .build();
        mouseItem = inventoryRepository.save(mouseItem);

        InvoiceRequest.InvoiceItemDto saleItem = new InvoiceRequest.InvoiceItemDto();
        saleItem.setItemId(mouseItem.getId());
        saleItem.setItemName(mouseItem.getName());
        saleItem.setItemType("PART");
        saleItem.setQuantity(3);
        saleItem.setUnitPrice(new BigDecimal("750.00"));

        InvoiceRequest saleRequest = new InvoiceRequest();
        saleRequest.setCustomerId(customer1.getId());
        saleRequest.setInvoiceType("DIRECT_SALE");
        saleRequest.setTaxRate(new BigDecimal("18.00"));
        saleRequest.setDiscountAmount(BigDecimal.ZERO);
        saleRequest.setCustomItems(List.of(saleItem));

        Invoice retailInvoice = invoiceService.generateInvoice(saleRequest, receptionistUser);
        assertNotNull(retailInvoice);
        assertEquals(InvoiceType.DIRECT_SALE, retailInvoice.getInvoiceType());

        // Verify inventory stock was decremented from 10 to 7
        InventoryItem stockAfterSale = inventoryRepository.findById(mouseItem.getId()).orElseThrow();
        assertEquals(7, stockAfterSale.getCurrentStock());

        // Verify stock movement ledger recorded RETAIL_SALE
        var movements = stockMovementRepository.findByItemIdOrderByCreatedAtDesc(mouseItem.getId());
        assertFalse(movements.isEmpty());
        assertEquals(-3, movements.get(0).getQuantity());
        assertEquals(7, movements.get(0).getBalanceAfter());

        // Cancel unpaid retail invoice - verify stock is restored from 7 to 10
        invoiceService.cancelInvoice(retailInvoice.getId(), receptionistUser);
        InventoryItem stockAfterCancel = inventoryRepository.findById(mouseItem.getId()).orElseThrow();
        assertEquals(10, stockAfterCancel.getCurrentStock());
    }
}
