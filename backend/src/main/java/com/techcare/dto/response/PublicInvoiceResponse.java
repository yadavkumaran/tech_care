package com.techcare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicInvoiceResponse {
    private Long id;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private String invoiceType;
    private String status;
    private String customerName;
    private String customerPhoneMasked;
    private String customerAddress;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal taxRate;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal balanceAmount;
    private List<PublicInvoiceItemDto> items;
    private String companyName;
    private String gstin;
    private String repairTicketNumber;
    private String deviceDescription;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublicInvoiceItemDto {
        private String itemName;
        private String itemType;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
    }
}
