package com.techcare.service;

import com.techcare.dto.request.InvoiceRequest;
import com.techcare.entity.*;
import com.techcare.entity.enums.InvoiceStatus;
import com.techcare.entity.enums.InvoiceType;
import com.techcare.entity.enums.MovementType;
import com.techcare.entity.enums.TicketStatus;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.InventoryItemRepository;
import com.techcare.repository.InvoiceRepository;
import com.techcare.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerService customerService;
    private final RepairTicketService ticketService;
    private final SyncNotificationService syncService;
    private final InventoryItemRepository inventoryRepository;
    private final StockMovementRepository stockMovementRepository;

    @Transactional(readOnly = true)
    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Invoice getInvoiceById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public List<Invoice> getInvoicesByCustomer(Long customerId) {
        return invoiceRepository.findByCustomerId(customerId);
    }

    private synchronized String generateNextInvoiceNumber() {
        int currentYear = Year.now().getValue();
        List<String> latestList = invoiceRepository.findInvoiceNumbersByYear(currentYear, PageRequest.of(0, 1));
        int nextSequence = 1;
        if (!latestList.isEmpty()) {
            String latest = latestList.get(0);
            try {
                String[] parts = latest.split("-");
                if (parts.length >= 3) {
                    nextSequence = Integer.parseInt(parts[2]) + 1;
                }
            } catch (Exception e) {
                nextSequence = (int) invoiceRepository.count() + 1;
            }
        }
        return String.format("INV-%d-%04d", currentYear, nextSequence);
    }

    @Transactional
    public Invoice generateInvoice(InvoiceRequest request) {
        return generateInvoice(request, null);
    }

    @Transactional
    public Invoice generateInvoice(InvoiceRequest request, User currentUser) {
        Customer customer = customerService.getCustomerById(request.getCustomerId());

        RepairTicket ticket = null;
        if (request.getRepairTicketId() != null) {
            ticket = ticketService.getTicketById(request.getRepairTicketId());

            // 1. Verify customer ownership of the ticket
            if (!ticket.getCustomer().getId().equals(customer.getId())) {
                throw new BadRequestException("Customer mismatch: Repair Ticket #" + ticket.getTicketNumber() +
                        " belongs to Customer ID " + ticket.getCustomer().getId() + " (" + ticket.getCustomer().getFullName() +
                        "), but invoice request specified Customer ID " + customer.getId() + " (" + customer.getFullName() + ")");
            }

            // 2. Prevent duplicate invoice generation for the same ticket
            if (invoiceRepository.findByRepairTicketId(ticket.getId()).isPresent()) {
                throw new BadRequestException("An invoice has already been generated for Repair Ticket #" + ticket.getTicketNumber());
            }

            // 3. Prevent invoice generation for cancelled or rejected tickets
            if (ticket.getStatus() == TicketStatus.CANCELLED || ticket.getStatus() == TicketStatus.REJECTED) {
                throw new BadRequestException("Cannot generate invoice for a " + ticket.getStatus() + " repair ticket");
            }
        }

        InvoiceType type = InvoiceType.REPAIR;
        if ("DIRECT_SALE".equalsIgnoreCase(request.getInvoiceType())) {
            type = InvoiceType.DIRECT_SALE;
        }

        String invoiceNumber = generateNextInvoiceNumber();

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .customer(customer)
                .repairTicket(ticket)
                .invoiceType(type)
                .invoiceDate(LocalDate.now())
                .items(new ArrayList<>())
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;

        // If generated from a repair ticket, automatically pull parts and labor
        if (ticket != null) {
            // Add parts consumed
            List<TicketPartUsed> partsUsed = ticketService.getPartsUsed(ticket.getId());
            for (TicketPartUsed part : partsUsed) {
                BigDecimal lineTotal = part.getUnitPrice().multiply(BigDecimal.valueOf(part.getQuantity()));
                subtotal = subtotal.add(lineTotal);

                InvoiceItem item = InvoiceItem.builder()
                        .invoice(invoice)
                        .item(part.getItem())
                        .itemName(part.getItem().getName())
                        .itemType("PART")
                        .quantity(part.getQuantity())
                        .unitPrice(part.getUnitPrice())
                        .totalPrice(lineTotal)
                        .build();

                invoice.getItems().add(item);
            }

            // Add labor charge if present
            if (ticket.getLaborCharge() != null && ticket.getLaborCharge().compareTo(BigDecimal.ZERO) > 0) {
                subtotal = subtotal.add(ticket.getLaborCharge());
                InvoiceItem laborItem = InvoiceItem.builder()
                        .invoice(invoice)
                        .item(null)
                        .itemName("Technical Labor & Service Fee")
                        .itemType("LABOR")
                        .quantity(1)
                        .unitPrice(ticket.getLaborCharge())
                        .totalPrice(ticket.getLaborCharge())
                        .build();

                invoice.getItems().add(laborItem);
            } else if (partsUsed.isEmpty() && ticket.getEstimatedCost() != null && ticket.getEstimatedCost().compareTo(BigDecimal.ZERO) > 0) {
                // If no parts and no separate labor, but an approved estimate exists, treat estimate as repair service charge
                subtotal = subtotal.add(ticket.getEstimatedCost());
                InvoiceItem estimateItem = InvoiceItem.builder()
                        .invoice(invoice)
                        .item(null)
                        .itemName("Standard Repair & Inspection Fee")
                        .itemType("LABOR")
                        .quantity(1)
                        .unitPrice(ticket.getEstimatedCost())
                        .totalPrice(ticket.getEstimatedCost())
                        .build();

                invoice.getItems().add(estimateItem);
            }
        }

        // Add any custom line items (e.g. for direct retail hardware sales)
        if (request.getCustomItems() != null) {
            for (InvoiceRequest.InvoiceItemDto dto : request.getCustomItems()) {
                if (dto.getQuantity() == null || dto.getQuantity() <= 0) {
                    throw new BadRequestException("Line item quantity must be greater than zero");
                }
                if (dto.getUnitPrice() == null || dto.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
                    throw new BadRequestException("Line item unit price cannot be negative");
                }
                BigDecimal lineTotal = dto.getUnitPrice().multiply(BigDecimal.valueOf(dto.getQuantity()));
                subtotal = subtotal.add(lineTotal);

                InventoryItem inventoryItem = null;
                if (dto.getItemId() != null) {
                    inventoryItem = inventoryRepository.findById(dto.getItemId())
                            .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + dto.getItemId()));

                    // Check stock sufficiency for hardware sales
                    if (inventoryItem.getCurrentStock() < dto.getQuantity()) {
                        throw new BadRequestException("Insufficient stock for item '" + inventoryItem.getName() +
                                "'. Available: " + inventoryItem.getCurrentStock() + ", Requested: " + dto.getQuantity());
                    }

                    // Decrement inventory stock
                    int newStock = inventoryItem.getCurrentStock() - dto.getQuantity();
                    inventoryItem.setCurrentStock(newStock);
                    inventoryRepository.save(inventoryItem);

                    // Record StockMovement audit entry
                    StockMovement movement = StockMovement.builder()
                            .item(inventoryItem)
                            .movementType(MovementType.RETAIL_SALE)
                            .quantity(-dto.getQuantity())
                            .balanceAfter(newStock)
                            .referenceType("INVOICE")
                            .notes("Direct retail hardware sale: " + invoiceNumber + " to " + customer.getFullName())
                            .performedBy(currentUser)
                            .build();
                    stockMovementRepository.save(movement);
                }

                String itemName = dto.getItemName() != null ? dto.getItemName() : (inventoryItem != null ? inventoryItem.getName() : "Item");
                String itemType = dto.getItemType() != null ? dto.getItemType() : (inventoryItem != null ? "PART" : "ACCESSORY");

                InvoiceItem item = InvoiceItem.builder()
                        .invoice(invoice)
                        .item(inventoryItem)
                        .itemName(itemName)
                        .itemType(itemType)
                        .quantity(dto.getQuantity())
                        .unitPrice(dto.getUnitPrice())
                        .totalPrice(lineTotal)
                        .build();

                invoice.getItems().add(item);
            }
        }

        if (invoice.getItems().isEmpty() && subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Cannot generate invoice: invoice must contain at least one billable item or service charge");
        }

        // Validations for Discount and Tax Rate
        BigDecimal discountAmount = request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO;
        if (discountAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Discount amount cannot be negative");
        }
        if (discountAmount.compareTo(subtotal) > 0) {
            throw new BadRequestException("Discount amount (₹" + discountAmount + ") cannot exceed subtotal amount (₹" + subtotal + ")");
        }

        BigDecimal taxRate = request.getTaxRate() != null ? request.getTaxRate() : BigDecimal.ZERO;
        if (taxRate.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Tax rate cannot be negative");
        }

        // Under GST / Tax Standards: Taxable Value = Subtotal - Discount
        BigDecimal taxableValue = subtotal.subtract(discountAmount);
        BigDecimal taxAmount = taxableValue.multiply(taxRate)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = taxableValue.add(taxAmount);

        invoice.setSubtotal(subtotal);
        invoice.setDiscountAmount(discountAmount);
        invoice.setTaxRate(taxRate);
        invoice.setTaxAmount(taxAmount);
        invoice.setTotalAmount(totalAmount);
        invoice.setPaidAmount(BigDecimal.ZERO);
        invoice.setBalanceAmount(totalAmount);
        invoice.setStatus(totalAmount.compareTo(BigDecimal.ZERO) == 0 ? InvoiceStatus.PAID : InvoiceStatus.UNPAID);

        Invoice saved = invoiceRepository.save(invoice);
        syncService.publishEvent("INVOICE", "CREATED", saved.getId(), saved.getInvoiceNumber(), "counter");
        return saved;
    }

    @Transactional
    public Invoice cancelInvoice(Long id) {
        return cancelInvoice(id, null);
    }

    @Transactional
    public Invoice cancelInvoice(Long id, User currentUser) {
        Invoice invoice = getInvoiceById(id);

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new BadRequestException("Invoice #" + invoice.getInvoiceNumber() + " is already cancelled");
        }

        if (invoice.getPaidAmount().compareTo(BigDecimal.ZERO) > 0 || invoice.getStatus() == InvoiceStatus.PAID || invoice.getStatus() == InvoiceStatus.PARTIALLY_PAID) {
            throw new BadRequestException("Cannot cancel Invoice #" + invoice.getInvoiceNumber() +
                    ": recorded payments totaling ₹" + invoice.getPaidAmount() + " exist. Void/refund payments before cancelling.");
        }

        // If direct retail sale, restore inventory stock for parts sold
        if (invoice.getInvoiceType() == InvoiceType.DIRECT_SALE && invoice.getItems() != null) {
            for (InvoiceItem item : invoice.getItems()) {
                if (item.getItem() != null) {
                    InventoryItem invItem = item.getItem();
                    int restoredStock = invItem.getCurrentStock() + item.getQuantity();
                    invItem.setCurrentStock(restoredStock);
                    inventoryRepository.save(invItem);

                    StockMovement returnMovement = StockMovement.builder()
                            .item(invItem)
                            .movementType(MovementType.RESTOCK_RETURN)
                            .quantity(item.getQuantity())
                            .balanceAfter(restoredStock)
                            .referenceType("INVOICE_CANCEL")
                            .notes("Restocked upon cancellation of Retail Invoice #" + invoice.getInvoiceNumber())
                            .performedBy(currentUser)
                            .build();
                    stockMovementRepository.save(returnMovement);
                }
            }
        }

        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setBalanceAmount(BigDecimal.ZERO);
        Invoice cancelled = invoiceRepository.save(invoice);
        syncService.publishEvent("INVOICE", "CANCELLED", cancelled.getId(), cancelled.getInvoiceNumber(), "admin");
        return cancelled;
    }
}

