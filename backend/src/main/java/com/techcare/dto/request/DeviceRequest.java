package com.techcare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DeviceRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotBlank(message = "Device type is required (e.g. LAPTOP, DESKTOP)")
    private String deviceType;

    @NotBlank(message = "Brand is required")
    private String brand;

    @NotBlank(message = "Model name is required")
    private String modelName;

    private String serialNumber;
    private String devicePassword;
    private String physicalCondition;
    private String accessoriesReceived;
}

