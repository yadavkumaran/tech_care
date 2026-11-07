package com.techcare.service;

import com.techcare.dto.request.PaymentRequest;
import com.techcare.entity.Invoice;
import com.techcare.entity.Payment;
import com.techcare.entity.User;
import com.techcare.entity.enums.InvoiceStatus;
import com.techcare.entity.enums.PaymentMethod;
import com.techcare.entity.enums.PaymentType;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.InvoiceRepository;
import com.techcare.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final SyncNotificationService syncService;

    @Transactional(readOnly = true)
    public List<Payment> getPaymentsByInvoice(Long invoiceId) {
        return paymentRepository.findByInvoiceId(invoiceId);
    }

    private synchronized String generateNextPaymentReference() {
        int currentYear = Year.now().getValue();
        List<String> latestList = paymentRepository.findPaymentReferencesByYear(currentYear, PageRequest.of(0, 1));
        int nextSequence = 1;
        if (!latestList.isEmpty()) {
            String latest = latestList.get(0);
            try {
                String[] parts = latest.split("-");
                if (parts.length >= 3) {
                    nextSequence = Integer.parseInt(parts[2]) + 1;
                }
            } catch (Exception e) {
                nextSequence = (int) paymentRepository.count() + 1;
            }
        }
        return String.format("PAY-%d-%04d", currentYear, nextSequence);
    }

    @Transactional
    public Payment recordPayment(PaymentRequest request, User currentUser) {
        Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + request.getInvoiceId()));

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new BadRequestException("Cannot record payment for a CANCELLED invoice (#" + invoice.getInvoiceNumber() + ")");
        }

        if (invoice.getStatus() == InvoiceStatus.PAID || invoice.getBalanceAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Invoice #" + invoice.getInvoiceNumber() + " is already paid in full");
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Payment amount must be greater than zero");
        }

        if (request.getAmount().compareTo(invoice.getBalanceAmount()) > 0) {
            throw new BadRequestException("Payment amount (₹" + request.getAmount() + 
                    ") exceeds remaining balance due (₹" + invoice.getBalanceAmount() + ")");
        }

        String paymentReference = generateNextPaymentReference();

        PaymentMethod method = PaymentMethod.CASH;
        if (request.getPaymentMethod() != null) {
            try {
                method = PaymentMethod.valueOf(request.getPaymentMethod().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        PaymentType type = PaymentType.FINAL_SETTLEMENT;
        if (request.getPaymentType() != null) {
            try {
                type = PaymentType.valueOf(request.getPaymentType().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        Payment payment = Payment.builder()
                .paymentReference(paymentReference)
                .invoice(invoice)
                .amount(request.getAmount())
                .paymentMethod(method)
                .paymentType(type)
                .transactionNotes(request.getTransactionNotes())
                .collectedBy(currentUser)
                .paymentDate(LocalDateTime.now())
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // Update Invoice balances
        BigDecimal newPaidAmount = invoice.getPaidAmount().add(request.getAmount());
        BigDecimal newBalanceAmount = invoice.getTotalAmount().subtract(newPaidAmount);
        if (newBalanceAmount.compareTo(BigDecimal.ZERO) < 0) {
            newBalanceAmount = BigDecimal.ZERO;
        }

        invoice.setPaidAmount(newPaidAmount);
        invoice.setBalanceAmount(newBalanceAmount);

        if (newBalanceAmount.compareTo(BigDecimal.ZERO) == 0) {
            invoice.setStatus(InvoiceStatus.PAID);
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }

        invoiceRepository.save(invoice);

        syncService.publishEvent("PAYMENT", "RECORDED", savedPayment.getId(), savedPayment.getPaymentReference(), currentUser.getUsername());
        syncService.publishEvent("INVOICE", "PAYMENT_RECORDED", invoice.getId(), invoice.getInvoiceNumber(), currentUser.getUsername());

        return savedPayment;
    }
}

