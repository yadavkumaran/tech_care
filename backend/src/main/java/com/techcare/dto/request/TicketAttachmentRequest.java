package com.techcare.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TicketAttachmentRequest {

    @NotBlank(message = "File name is required")
    private String fileName;

    @NotBlank(message = "File URL is required")
    private String fileUrl;

    private String attachmentType = "INTAKE_DAMAGE"; // INTAKE_DAMAGE, DIAGNOSTIC_PROOF, BILL_SCAN
}

