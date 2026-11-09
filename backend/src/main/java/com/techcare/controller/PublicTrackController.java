package com.techcare.controller;

import com.techcare.dto.response.ApiResponse;
import com.techcare.dto.response.PublicTicketResponse;
import com.techcare.entity.RepairTicket;
import com.techcare.service.RepairTicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/track")
@RequiredArgsConstructor
public class PublicTrackController {

    private final RepairTicketService ticketService;

    @GetMapping("/{ticketNumber}")
    public ResponseEntity<ApiResponse<PublicTicketResponse>> trackTicket(@PathVariable String ticketNumber) {
        RepairTicket ticket = ticketService.getTicketByNumber(ticketNumber.trim().toUpperCase());
        return ResponseEntity.ok(ApiResponse.success(toPublicResponse(ticket)));
    }

    @PostMapping("/{ticketNumber}/approve")
    public ResponseEntity<ApiResponse<PublicTicketResponse>> approveQuote(@PathVariable String ticketNumber) {
        RepairTicket ticket = ticketService.customerApproveQuote(ticketNumber.trim().toUpperCase());
        return ResponseEntity.ok(ApiResponse.success("Repair quotation approved successfully", toPublicResponse(ticket)));
    }

    @PostMapping("/{ticketNumber}/reject")
    public ResponseEntity<ApiResponse<PublicTicketResponse>> rejectQuote(@PathVariable String ticketNumber) {
        RepairTicket ticket = ticketService.customerRejectQuote(ticketNumber.trim().toUpperCase());
        return ResponseEntity.ok(ApiResponse.success("Repair quotation declined", toPublicResponse(ticket)));
    }

    private PublicTicketResponse toPublicResponse(RepairTicket t) {
        String maskedPhone = null;
        if (t.getCustomer() != null && t.getCustomer().getPhone() != null) {
            String p = t.getCustomer().getPhone();
            if (p.length() >= 4) {
                maskedPhone = "•".repeat(Math.max(0, p.length() - 4)) + p.substring(p.length() - 4);
            } else {
                maskedPhone = "****";
            }
        }

        return PublicTicketResponse.builder()
                .ticketNumber(t.getTicketNumber())
                .status(t.getStatus())
                .priority(t.getPriority())
                .customerName(t.getCustomer() != null ? t.getCustomer().getFullName() : "Customer")
                .customerPhoneMasked(maskedPhone)
                .deviceBrand(t.getDevice() != null ? t.getDevice().getBrand() : "Hardware")
                .deviceModel(t.getDevice() != null ? t.getDevice().getModelName() : "Equipment")
                .deviceType(t.getDevice() != null ? t.getDevice().getDeviceType() : "DEVICE")
                .problemReported(t.getProblemReported())
                .diagnosticNotes(t.getDiagnosticNotes())
                .estimatedCost(t.getEstimatedCost())
                .laborCharge(t.getLaborCharge())
                .estimatedCompletionDate(t.getEstimatedCompletionDate())
                .createdAt(t.getCreatedAt())
                .completedAt(t.getCompletedAt())
                .deliveredAt(t.getDeliveredAt())
                .build();
    }
}
