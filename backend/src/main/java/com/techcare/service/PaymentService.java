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

    @Transactional(readOnly = true)
    public List<Payment> getPaymentsByInvoice(Long invoiceId) {
        return paymentRepository.findByInvoiceId(invoiceId);
    }

    @Transactional
    public Payment recordPayment(PaymentRequest request, User currentUser) {
        Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + request.getInvoiceId()));

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("Invoice #" + invoice.getInvoiceNumber() + " is already paid in full");
        }

        if (request.getAmount().compareTo(invoice.getBalanceAmount()) > 0) {
            throw new BadRequestException("Payment amount (₹" + request.getAmount() + 
                    ") exceeds remaining balance due (₹" + invoice.getBalanceAmount() + ")");
        }

        long count = paymentRepository.count() + 1;
        String paymentReference = String.format("PAY-%d-%04d", Year.now().getValue(), count);

        PaymentMethod method = PaymentMethod.CASH;
        try {
            method = PaymentMethod.valueOf(request.getPaymentMethod().toUpperCase());
        } catch (IllegalArgumentException ignored) {}

        PaymentType type = PaymentType.FINAL_SETTLEMENT;
        try {
            type = PaymentType.valueOf(request.getPaymentType().toUpperCase());
        } catch (IllegalArgumentException ignored) {}

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

        invoice.setPaidAmount(newPaidAmount);
        invoice.setBalanceAmount(newBalanceAmount);

        if (newBalanceAmount.compareTo(BigDecimal.ZERO) == 0) {
            invoice.setStatus(InvoiceStatus.PAID);
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }

        invoiceRepository.save(invoice);
        return savedPayment;
    }
}

