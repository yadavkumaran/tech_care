package com.techcare.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class InvoiceRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    private Long repairTicketId; // Nullable if direct retail sale

    private String invoiceType = "REPAIR"; // REPAIR or DIRECT_SALE

    @DecimalMin(value = "0.0", message = "Tax rate cannot be negative")
    private BigDecimal taxRate = BigDecimal.ZERO; // e.g. 18.00%

    @DecimalMin(value = "0.0", message = "Discount cannot be negative")
    private BigDecimal discountAmount = BigDecimal.ZERO;

    // Optional list of custom line items (if not already pulled from ticket)
    private List<InvoiceItemDto> customItems;

    @Data
    public static class InvoiceItemDto {
        private Long itemId; // nullable for labor
        private String itemName;
        private String itemType; // PART, LABOR, ACCESSORY
        private Integer quantity;
        private BigDecimal unitPrice;
    }
}

