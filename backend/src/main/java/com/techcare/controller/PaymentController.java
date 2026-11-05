package com.techcare.controller;

import com.techcare.dto.request.PaymentRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.entity.Payment;
import com.techcare.entity.User;
import com.techcare.repository.UserRepository;
import com.techcare.security.UserDetailsImpl;
import com.techcare.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    @GetMapping("/invoice/{invoiceId}")
    public ResponseEntity<ApiResponse<List<Payment>>> getPaymentsByInvoice(@PathVariable Long invoiceId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getPaymentsByInvoice(invoiceId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Payment>> recordPayment(
            @Valid @RequestBody PaymentRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = userRepository.getReferenceById(userDetails.getId());
        Payment payment = paymentService.recordPayment(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Payment recorded successfully", payment));
    }
}

