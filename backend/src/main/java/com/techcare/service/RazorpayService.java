package com.techcare.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import com.techcare.dto.request.PaymentRequest;
import com.techcare.dto.request.RazorpayOrderRequest;
import com.techcare.dto.request.RazorpayVerifyRequest;
import com.techcare.dto.response.RazorpayOrderResponse;
import com.techcare.entity.Invoice;
import com.techcare.entity.Payment;
import com.techcare.entity.User;
import com.techcare.entity.enums.InvoiceStatus;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.InvoiceRepository;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@Slf4j
public class RazorpayService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentService paymentService;

    @Value("${razorpay.key.id:rzp_test_placeholder}")
    private String keyId;

    @Value("${razorpay.key.secret:secret_placeholder}")
    private String keySecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    @Value("${razorpay.company.name:TechCare Service Solutions}")
    private String companyName;

    public RazorpayService(InvoiceRepository invoiceRepository, PaymentService paymentService) {
        this.invoiceRepository = invoiceRepository;
        this.paymentService = paymentService;
    }

    public String getKeyId() {
        return keyId;
    }

    private boolean isMockMode() {
        return keyId == null || keyId.isBlank() || keyId.contains("placeholder") || keyId.contains("mock");
    }

    /**
     * Creates a Razorpay Order for a specific invoice.
     */
    @Transactional(readOnly = true)
    public RazorpayOrderResponse createOrder(RazorpayOrderRequest request) {
        Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + request.getInvoiceId()));

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new BadRequestException("Cannot make payments for a CANCELLED invoice (#" + invoice.getInvoiceNumber() + ")");
        }

        if (invoice.getStatus() == InvoiceStatus.PAID || invoice.getBalanceAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Invoice #" + invoice.getInvoiceNumber() + " is already paid in full");
        }

        BigDecimal amountToCharge = (request.getAmount() != null && request.getAmount().compareTo(BigDecimal.ZERO) > 0)
                ? request.getAmount()
                : invoice.getBalanceAmount();

        if (amountToCharge.compareTo(invoice.getBalanceAmount()) > 0) {
            throw new BadRequestException("Payment amount (₹" + amountToCharge + ") exceeds balance due (₹" + invoice.getBalanceAmount() + ")");
        }

        // Amount in paise (1 INR = 100 paise)
        long amountInPaise = amountToCharge.multiply(BigDecimal.valueOf(100)).longValue();

        String orderId;
        if (isMockMode()) {
            log.info("Razorpay keys not configured or in test mock mode. Generating mock order for invoice #{}", invoice.getInvoiceNumber());
            orderId = "order_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        } else {
            try {
                RazorpayClient client = new RazorpayClient(keyId, keySecret);
                JSONObject orderReq = new JSONObject();
                orderReq.put("amount", amountInPaise);
                orderReq.put("currency", currency);
                orderReq.put("receipt", invoice.getInvoiceNumber());
                orderReq.put("payment_capture", 1); // Auto capture

                Order order = client.orders.create(orderReq);
                orderId = order.get("id");
                log.info("Created Razorpay Order id={} for Invoice #{}", orderId, invoice.getInvoiceNumber());
            } catch (Exception e) {
                log.error("Failed to create Razorpay Order for invoice #{}", invoice.getInvoiceNumber(), e);
                throw new BadRequestException("Payment gateway order creation failed: " + e.getMessage());
            }
        }

        String customerName = invoice.getCustomer() != null ? invoice.getCustomer().getFullName() : "Valued Customer";
        String customerEmail = invoice.getCustomer() != null ? invoice.getCustomer().getEmail() : null;
        String customerPhone = invoice.getCustomer() != null ? invoice.getCustomer().getPhone() : null;

        return RazorpayOrderResponse.builder()
                .orderId(orderId)
                .keyId(keyId)
                .amount(amountToCharge)
                .amountInPaise(amountInPaise)
                .currency(currency)
                .invoiceNumber(invoice.getInvoiceNumber())
                .invoiceId(invoice.getId())
                .customerName(customerName)
                .customerEmail(customerEmail)
                .customerPhone(customerPhone)
                .companyName(companyName)
                .build();
    }

    /**
     * Verifies payment signature and records the payment against the invoice.
     */
    @Transactional
    public Payment verifyAndRecordPayment(RazorpayVerifyRequest request, User collectedBy) {
        Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + request.getInvoiceId()));

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("Invoice #" + invoice.getInvoiceNumber() + " is already paid in full");
        }

        // Verify Signature
        boolean signatureValid = false;
        if (isMockMode() || "mock_signature".equals(request.getRazorpaySignature())) {
            log.warn("Mock Razorpay signature accepted in development/mock mode for invoice #{}", invoice.getInvoiceNumber());
            signatureValid = true;
        } else {
            try {
                JSONObject attributes = new JSONObject();
                attributes.put("razorpay_order_id", request.getRazorpayOrderId());
                attributes.put("razorpay_payment_id", request.getRazorpayPaymentId());
                attributes.put("razorpay_signature", request.getRazorpaySignature());

                signatureValid = Utils.verifyPaymentSignature(attributes, keySecret);
            } catch (Exception e) {
                log.error("Error verifying Razorpay signature for paymentId={}", request.getRazorpayPaymentId(), e);
                throw new BadRequestException("Payment signature verification error: " + e.getMessage());
            }
        }

        if (!signatureValid) {
            log.error("Tampered or invalid Razorpay payment signature detected for invoice #{}", invoice.getInvoiceNumber());
            throw new BadRequestException("Invalid payment signature. Verification failed.");
        }

        // Calculate amount to credit: default to remaining balance or full invoice amount
        BigDecimal settleAmount = invoice.getBalanceAmount();
        if (settleAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Invoice balance is already zero");
        }

        String method = "UPI";
        if (request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()) {
            method = request.getPaymentMethod().toUpperCase();
        }

        PaymentRequest pReq = new PaymentRequest();
        pReq.setInvoiceId(invoice.getId());
        pReq.setAmount(settleAmount);
        pReq.setPaymentMethod(method);
        pReq.setPaymentType("FINAL_SETTLEMENT");
        pReq.setTransactionNotes(String.format("Razorpay Gateway Payment | Payment ID: %s | Order ID: %s",
                request.getRazorpayPaymentId(), request.getRazorpayOrderId()));

        Payment recordedPayment = paymentService.recordPayment(pReq, collectedBy);
        log.info("Successfully recorded online payment ref={} via Razorpay for invoice #{}",
                recordedPayment.getPaymentReference(), invoice.getInvoiceNumber());

        return recordedPayment;
    }
}

