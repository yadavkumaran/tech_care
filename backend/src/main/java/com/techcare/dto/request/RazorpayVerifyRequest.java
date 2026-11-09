package com.techcare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RazorpayVerifyRequest {
    @NotNull(message = "Invoice ID is required")
    private Long invoiceId;

    @NotBlank(message = "Razorpay Order ID is required")
    private String razorpayOrderId;

    @NotBlank(message = "Razorpay Payment ID is required")
    private String razorpayPaymentId;

    @NotBlank(message = "Razorpay Signature is required")
    private String razorpaySignature;

    private String paymentMethod; // e.g. "UPI", "CARD", or "ONLINE"
}
