package com.techcare.controller;

import com.techcare.dto.request.*;
import com.techcare.dto.response.ApiResponse;
import com.techcare.entity.*;
import com.techcare.entity.enums.TicketStatus;
import com.techcare.repository.UserRepository;
import com.techcare.security.UserDetailsImpl;
import com.techcare.service.RepairTicketService;
import com.techcare.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class RepairTicketController {

    private final RepairTicketService ticketService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RepairTicket>>> getAllTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long technicianId) {
        return ResponseEntity.ok(ApiResponse.success(ticketService.getTickets(search, status, technicianId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RepairTicket>> getTicketById(@PathVariable Long id) {
        RepairTicket ticket = ticketService.getTicketById(id);
        return ResponseEntity.ok(ApiResponse.success(ticket));
    }

    @GetMapping("/number/{ticketNumber}")
    public ResponseEntity<ApiResponse<RepairTicket>> getTicketByNumber(@PathVariable String ticketNumber) {
        RepairTicket ticket = ticketService.getTicketByNumber(ticketNumber);
        return ResponseEntity.ok(ApiResponse.success(ticket));
    }

    private User getCurrentUser(UserDetailsImpl userDetails) {
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userDetails.getId()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RepairTicket>> createIntakeTicket(
            @Valid @RequestBody TicketIntakeRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getCurrentUser(userDetails);
        RepairTicket created = ticketService.createIntakeTicket(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Repair ticket created successfully", created));
    }

    @PatchMapping("/{id}/diagnosis")
    public ResponseEntity<ApiResponse<RepairTicket>> updateDiagnosis(
            @PathVariable Long id,
            @RequestBody TicketDiagnosisRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getCurrentUser(userDetails);
        RepairTicket updated = ticketService.updateDiagnosis(id, request, user);
        return ResponseEntity.ok(ApiResponse.success("Diagnosis updated", updated));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<RepairTicket>> assignTechnician(
            @PathVariable Long id,
            @RequestParam Long technicianId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getCurrentUser(userDetails);
        RepairTicket updated = ticketService.assignTechnician(id, technicianId, user);
        return ResponseEntity.ok(ApiResponse.success("Technician assigned", updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<RepairTicket>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody TicketStatusUpdateRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getCurrentUser(userDetails);
        RepairTicket updated = ticketService.updateTicketStatus(id, request, user);
        return ResponseEntity.ok(ApiResponse.success("Ticket status updated", updated));
    }

    @PostMapping("/{id}/consume-part")
    public ResponseEntity<ApiResponse<TicketPartUsed>> consumePart(
            @PathVariable Long id,
            @Valid @RequestBody ConsumePartRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getCurrentUser(userDetails);
        TicketPartUsed part = ticketService.consumePart(id, request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Spare part consumed and deducted from inventory", part));
    }

    @GetMapping("/{id}/parts")
    public ResponseEntity<ApiResponse<List<TicketPartUsed>>> getPartsUsed(@PathVariable Long id) {
        List<TicketPartUsed> parts = ticketService.getPartsUsed(id);
        return ResponseEntity.ok(ApiResponse.success(parts));
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<ApiResponse<List<RepairTicketLog>>> getTicketLogs(@PathVariable Long id) {
        List<RepairTicketLog> logs = ticketService.getTicketLogs(id);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @PostMapping("/{id}/attachments")
    public ResponseEntity<ApiResponse<TicketAttachment>> addAttachment(
            @PathVariable Long id,
            @Valid @RequestBody TicketAttachmentRequest request) {
        TicketAttachment attachment = ticketService.addAttachment(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Attachment linked to ticket", attachment));
    }

    @GetMapping("/{id}/attachments")
    public ResponseEntity<ApiResponse<List<TicketAttachment>>> getAttachments(@PathVariable Long id) {
        List<TicketAttachment> attachments = ticketService.getAttachments(id);
        return ResponseEntity.ok(ApiResponse.success(attachments));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<Void>> deleteTicket(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getCurrentUser(userDetails);
        ticketService.deleteTicket(id, user);
        return ResponseEntity.ok(ApiResponse.success("Repair ticket cancelled and preserved successfully", null));
    }
}

