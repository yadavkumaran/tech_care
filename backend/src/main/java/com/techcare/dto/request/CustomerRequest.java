package com.techcare.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomerRequest {

    @NotBlank(message = "Customer full name is required")
    private String fullName;

    @NotBlank(message = "Phone number is required")
    private String phone;

    private String email;
    private String address;
    private String taxId;
}

