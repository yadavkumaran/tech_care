package com.techcare.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class PurchaseRequest {

    @NotNull(message = "Vendor ID is required")
    private Long vendorId;

    private String vendorBillNumber;
    private LocalDate purchaseDate = LocalDate.now();
    private String notes;

    @DecimalMin(value = "0.0", message = "Paid amount must be non-negative")
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @NotNull(message = "Items list cannot be empty")
    private List<PurchaseItemDto> items;

    @Data
    public static class PurchaseItemDto {
        @NotNull(message = "Item ID is required")
        private Long itemId;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        @NotNull(message = "Unit cost is required")
        @DecimalMin(value = "0.0", message = "Unit cost must be non-negative")
        private BigDecimal unitCost;
    }
}

