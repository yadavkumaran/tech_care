package com.techcare.dto.response;

import com.techcare.entity.enums.TicketPriority;
import com.techcare.entity.enums.TicketStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicTicketResponse {
    private String ticketNumber;
    private TicketStatus status;
    private TicketPriority priority;
    private String customerName;
    private String customerPhoneMasked;
    private String deviceBrand;
    private String deviceModel;
    private String deviceType;
    private String problemReported;
    private String diagnosticNotes;
    private BigDecimal estimatedCost;
    private BigDecimal laborCharge;
    private LocalDateTime estimatedCompletionDate;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private LocalDateTime deliveredAt;
}
