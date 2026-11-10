package com.techcare.controller;

import com.techcare.dto.request.RazorpayOrderRequest;
import com.techcare.dto.request.RazorpayVerifyRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.dto.response.PublicInvoiceResponse;
import com.techcare.dto.response.RazorpayOrderResponse;
import com.techcare.entity.Invoice;
import com.techcare.entity.InvoiceItem;
import com.techcare.entity.Payment;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.InvoiceRepository;
import com.techcare.service.RazorpayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/public/invoices")
@RequiredArgsConstructor
public class PublicInvoiceController {

    private final InvoiceRepository invoiceRepository;
    private final RazorpayService razorpayService;

    @Value("${razorpay.company.name:TechCare Service Solutions}")
    private String companyName;

    @GetMapping("/{invoiceNumber}")
    public ResponseEntity<ApiResponse<PublicInvoiceResponse>> getPublicInvoice(@PathVariable String invoiceNumber) {
        Invoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with number: " + invoiceNumber));

        String maskedPhone = null;
        if (invoice.getCustomer() != null && invoice.getCustomer().getPhone() != null) {
            String p = invoice.getCustomer().getPhone();
            if (p.length() >= 4) {
                maskedPhone = "•".repeat(Math.max(0, p.length() - 4)) + p.substring(p.length() - 4);
            } else {
                maskedPhone = "****";
            }
        }

        List<PublicInvoiceResponse.PublicInvoiceItemDto> itemDtos = new ArrayList<>();
        if (invoice.getItems() != null) {
            for (InvoiceItem it : invoice.getItems()) {
                itemDtos.add(PublicInvoiceResponse.PublicInvoiceItemDto.builder()
                        .itemName(it.getItemName())
                        .itemType(it.getItemType())
                        .quantity(it.getQuantity())
                        .unitPrice(it.getUnitPrice())
                        .totalPrice(it.getTotalPrice())
                        .build());
            }
        }

        String ticketNumber = null;
        String deviceDesc = null;
        if (invoice.getRepairTicket() != null) {
            ticketNumber = invoice.getRepairTicket().getTicketNumber();
            if (invoice.getRepairTicket().getDevice() != null) {
                deviceDesc = invoice.getRepairTicket().getDevice().getBrand() + " " +
                        invoice.getRepairTicket().getDevice().getModelName();
            }
        }

        PublicInvoiceResponse response = PublicInvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .invoiceDate(invoice.getInvoiceDate())
                .invoiceType(invoice.getInvoiceType().name())
                .status(invoice.getStatus().name())
                .customerName(invoice.getCustomer() != null ? invoice.getCustomer().getFullName() : "Valued Customer")
                .customerPhoneMasked(maskedPhone)
                .customerAddress(invoice.getCustomer() != null ? invoice.getCustomer().getAddress() : null)
                .subtotal(invoice.getSubtotal())
                .discountAmount(invoice.getDiscountAmount())
                .taxRate(invoice.getTaxRate())
                .taxAmount(invoice.getTaxAmount())
                .totalAmount(invoice.getTotalAmount())
                .paidAmount(invoice.getPaidAmount())
                .balanceAmount(invoice.getBalanceAmount())
                .items(itemDtos)
                .companyName(companyName)
                .gstin("29ABCDE1234F1Z5")
                .repairTicketNumber(ticketNumber)
                .deviceDescription(deviceDesc)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/payments/razorpay/create-order")
    public ResponseEntity<ApiResponse<RazorpayOrderResponse>> createPublicOrder(
            @Valid @RequestBody RazorpayOrderRequest request) {
        RazorpayOrderResponse order = razorpayService.createOrder(request);
        return ResponseEntity.ok(ApiResponse.success("Order created", order));
    }

    @PostMapping("/payments/razorpay/verify")
    public ResponseEntity<ApiResponse<Payment>> verifyPublicPayment(
            @Valid @RequestBody RazorpayVerifyRequest request) {
        Payment payment = razorpayService.verifyAndRecordPayment(request, null);
        return ResponseEntity.ok(ApiResponse.success("Payment verified and settled successfully", payment));
    }
}
