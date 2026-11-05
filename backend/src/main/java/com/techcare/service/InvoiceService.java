package com.techcare.service;

import com.techcare.dto.request.InvoiceRequest;
import com.techcare.entity.*;
import com.techcare.entity.enums.InvoiceStatus;
import com.techcare.entity.enums.InvoiceType;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
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

    @Transactional
    public Invoice generateInvoice(InvoiceRequest request) {
        Customer customer = customerService.getCustomerById(request.getCustomerId());

        long count = invoiceRepository.count() + 1;
        String invoiceNumber = String.format("INV-%d-%04d", Year.now().getValue(), count);

        InvoiceType type = InvoiceType.REPAIR;
        if ("DIRECT_SALE".equalsIgnoreCase(request.getInvoiceType())) {
            type = InvoiceType.DIRECT_SALE;
        }

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .customer(customer)
                .invoiceType(type)
                .taxRate(request.getTaxRate() != null ? request.getTaxRate() : BigDecimal.ZERO)
                .discountAmount(request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO)
                .invoiceDate(LocalDate.now())
                .items(new ArrayList<>())
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;

        // If generated from a repair ticket, automatically pull parts and labor
        if (request.getRepairTicketId() != null) {
            RepairTicket ticket = ticketService.getTicketById(request.getRepairTicketId());
            invoice.setRepairTicket(ticket);

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
            }
        }

        // Add any custom line items (e.g. for direct retail sales)
        if (request.getCustomItems() != null) {
            for (InvoiceRequest.InvoiceItemDto dto : request.getCustomItems()) {
                BigDecimal lineTotal = dto.getUnitPrice().multiply(BigDecimal.valueOf(dto.getQuantity()));
                subtotal = subtotal.add(lineTotal);

                InvoiceItem item = InvoiceItem.builder()
                        .invoice(invoice)
                        .itemName(dto.getItemName())
                        .itemType(dto.getItemType() != null ? dto.getItemType() : "ACCESSORY")
                        .quantity(dto.getQuantity())
                        .unitPrice(dto.getUnitPrice())
                        .totalPrice(lineTotal)
                        .build();

                invoice.getItems().add(item);
            }
        }

        // Calculate tax amount and total
        BigDecimal taxAmount = subtotal.multiply(invoice.getTaxRate())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = subtotal.add(taxAmount).subtract(invoice.getDiscountAmount());
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }

        invoice.setSubtotal(subtotal);
        invoice.setTaxAmount(taxAmount);
        invoice.setTotalAmount(totalAmount);
        invoice.setPaidAmount(BigDecimal.ZERO);
        invoice.setBalanceAmount(totalAmount);
        invoice.setStatus(InvoiceStatus.UNPAID);

        return invoiceRepository.save(invoice);
    }
}

