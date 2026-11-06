package com.techcare.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StaffRequest {

    @NotBlank(message = "Username is required")
    private String username;

    private String password; // Optional on edit, required on create

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Email is required")
    private String email;

    private String phone;

    @NotBlank(message = "Role is required (ADMIN, RECEPTIONIST, TECHNICIAN)")
    private String role;

    private Boolean isActive = true;
}

