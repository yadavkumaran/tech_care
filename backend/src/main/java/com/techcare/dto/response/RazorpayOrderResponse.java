package com.techcare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RazorpayOrderResponse {
    private String orderId;
    private String keyId;
    private BigDecimal amount;
    private Long amountInPaise;
    private String currency;
    private String invoiceNumber;
    private Long invoiceId;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String companyName;
}
