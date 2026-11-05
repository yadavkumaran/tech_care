package com.techcare.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class InventoryItemRequest {

    @NotBlank(message = "SKU is required")
    private String sku;

    private String barcode;

    @NotBlank(message = "Item name is required")
    private String name;

    @NotBlank(message = "Category is required")
    private String category;

    @Min(value = 0, message = "Current stock cannot be negative")
    private Integer currentStock = 0;

    @Min(value = 0, message = "Reorder level cannot be negative")
    private Integer reorderLevel = 5;

    @NotNull(message = "Cost price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Cost price must be positive")
    private BigDecimal costPrice;

    @NotNull(message = "Selling price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Selling price must be positive")
    private BigDecimal sellingPrice;
}

