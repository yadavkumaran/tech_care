package com.techcare.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VendorRequest {

    @NotBlank(message = "Company name is required")
    private String companyName;

    private String contactPerson;

    @NotBlank(message = "Phone number is required")
    private String phone;

    private String email;
    private String address;
    private String taxId;
}

