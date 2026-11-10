package com.techcare.controller;

import com.techcare.dto.request.InvoiceRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.entity.Invoice;
import com.techcare.entity.User;
import com.techcare.repository.UserRepository;
import com.techcare.security.UserDetailsImpl;
import com.techcare.service.InvoiceService;
import com.techcare.service.RazorpayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final UserRepository userRepository;
    private final RazorpayService razorpayService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<List<Invoice>>> getAllInvoices() {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getAllInvoices()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<Invoice>> getInvoiceById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getInvoiceById(id)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<List<Invoice>>> getInvoicesByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getInvoicesByCustomer(customerId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<Invoice>> generateInvoice(
            @Valid @RequestBody InvoiceRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User currentUser = userDetails != null ? userRepository.findById(userDetails.getId()).orElse(null) : null;
        Invoice invoice = invoiceService.generateInvoice(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Invoice generated successfully", invoice));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Invoice>> cancelInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User currentUser = userDetails != null ? userRepository.findById(userDetails.getId()).orElse(null) : null;
        Invoice invoice = invoiceService.cancelInvoice(id, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Invoice cancelled successfully", invoice));
    }

    @PostMapping("/{id}/payment-link")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<String>> generatePaymentLink(@PathVariable Long id) {
        String paymentLink = razorpayService.createPaymentLink(id);
        return ResponseEntity.ok(ApiResponse.success("Payment link generated", paymentLink));
    }
}

