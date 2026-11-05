package com.techcare.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StockAdjustmentRequest {

    @NotNull(message = "Quantity change is required")
    private Integer quantity; // positive to add, negative to subtract

    private String notes;
}

