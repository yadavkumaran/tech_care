package com.techcare.service;

import com.techcare.dto.request.*;
import com.techcare.entity.*;
import com.techcare.entity.enums.InvoiceStatus;
import com.techcare.entity.enums.MovementType;
import com.techcare.entity.enums.Role;
import com.techcare.entity.enums.TicketPriority;
import com.techcare.entity.enums.TicketStatus;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RepairTicketService {

    private static final Set<TicketStatus> TERMINAL_STATUSES = Set.of(
            TicketStatus.REJECTED,
            TicketStatus.DELIVERED,
            TicketStatus.CANCELLED
    );

    private final RepairTicketRepository ticketRepository;
    private final RepairTicketLogRepository ticketLogRepository;
    private final TicketAttachmentRepository attachmentRepository;
    private final TicketPartUsedRepository ticketPartUsedRepository;
    private final CustomerService customerService;
    private final CustomerDeviceService deviceService;
    private final InventoryItemRepository inventoryRepository;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;
    private final InvoiceRepository invoiceRepository;
    private final SyncNotificationService syncService;

    @Transactional(readOnly = true)
    public List<RepairTicket> getTickets(String search, String status, Long technicianId) {
        List<RepairTicket> list;

        if (status != null && (status.equalsIgnoreCase("ONGOING") || status.equalsIgnoreCase("ACTIVE"))) {
            if (technicianId != null) {
                list = ticketRepository.findOngoingTicketsByTechnicianId(technicianId);
            } else {
                list = ticketRepository.findOngoingTickets();
            }
        } else if (status != null && !status.equalsIgnoreCase("ALL")) {
            try {
                TicketStatus ts = TicketStatus.valueOf(status.toUpperCase());
                list = ticketRepository.findByStatus(ts);
                if (technicianId != null) {
                    list = list.stream()
                            .filter(t -> t.getAssignedTechnician() != null && t.getAssignedTechnician().getId().equals(technicianId))
                            .toList();
                }
            } catch (IllegalArgumentException e) {
                list = ticketRepository.findAll();
            }
        } else if (technicianId != null) {
            list = ticketRepository.findByAssignedTechnicianId(technicianId);
        } else {
            list = ticketRepository.findAll();
        }

        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            list = list.stream()
                    .filter(t -> t.getTicketNumber().toLowerCase().contains(q) ||
                            (t.getCustomer() != null && t.getCustomer().getFullName().toLowerCase().contains(q)) ||
                            (t.getCustomer() != null && t.getCustomer().getPhone().contains(q)) ||
                            (t.getDevice() != null && t.getDevice().getModelName().toLowerCase().contains(q)))
                    .toList();
        }

        return list;
    }

    @Transactional(readOnly = true)
    public List<RepairTicket> getAllTickets(String search) {
        if (search != null && !search.trim().isEmpty()) {
            return ticketRepository.searchTickets(search.trim());
        }
        return ticketRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<RepairTicket> getTicketsByStatus(TicketStatus status) {
        return ticketRepository.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public List<RepairTicket> getTicketsByTechnician(Long technicianId) {
        return ticketRepository.findByAssignedTechnicianId(technicianId);
    }

    @Transactional(readOnly = true)
    public RepairTicket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Repair ticket not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public RepairTicket getTicketByNumber(String ticketNumber) {
        return ticketRepository.findByTicketNumber(ticketNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Repair ticket not found with number: " + ticketNumber));
    }

    @Transactional
    public RepairTicket createIntakeTicket(TicketIntakeRequest request, User currentUser) {
        Customer customer = customerService.getCustomerById(request.getCustomerId());
        CustomerDevice device = deviceService.getDeviceById(request.getDeviceId());

        if (!device.getCustomer().getId().equals(customer.getId())) {
            throw new BadRequestException("Device ID " + device.getId() + " does not belong to Customer ID " + customer.getId());
        }

        User assignedTech = null;
        if (request.getAssignedTechnicianId() != null) {
            assignedTech = userRepository.findById(request.getAssignedTechnicianId())
                    .orElseThrow(() -> new ResourceNotFoundException("Technician not found with id: " + request.getAssignedTechnicianId()));
        }

        // Generate unique ticket number: TC-2026-0001
        long count = ticketRepository.count() + 1;
        String ticketNumber = String.format("TC-%d-%04d", Year.now().getValue(), count);
        if (ticketRepository.existsByTicketNumber(ticketNumber)) {
            ticketNumber = String.format("TC-%d-%04d-%s", Year.now().getValue(), count, UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        }

        TicketPriority priority = TicketPriority.MEDIUM;
        if (request.getPriority() != null) {
            try {
                priority = TicketPriority.valueOf(request.getPriority().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        RepairTicket ticket = RepairTicket.builder()
                .ticketNumber(ticketNumber)
                .customer(customer)
                .device(device)
                .assignedTechnician(assignedTech)
                .createdBy(currentUser)
                .status(TicketStatus.RECEIVED)
                .priority(priority)
                .problemReported(request.getProblemReported())
                .estimatedCost(request.getEstimatedCost() != null ? request.getEstimatedCost() : BigDecimal.ZERO)
                .laborCharge(request.getLaborCharge() != null ? request.getLaborCharge() : BigDecimal.ZERO)
                .estimatedCompletionDate(request.getEstimatedCompletionDate())
                .build();

        RepairTicket savedTicket = ticketRepository.save(ticket);

        // Audit Log Entry
        RepairTicketLog log = RepairTicketLog.builder()
                .ticket(savedTicket)
                .previousStatus(null)
                .newStatus(TicketStatus.RECEIVED.name())
                .remarks("Device intake created at counter desk")
                .changedBy(currentUser)
                .build();
        ticketLogRepository.save(log);

        syncService.publishEvent("TICKET", "CREATED", savedTicket.getId(), savedTicket.getTicketNumber(), currentUser.getUsername());

        return savedTicket;
    }

    @Transactional
    public RepairTicket updateDiagnosis(Long id, TicketDiagnosisRequest request, User currentUser) {
        RepairTicket ticket = getTicketById(id);

        if (currentUser.getRole() == Role.TECHNICIAN) {
            if (ticket.getAssignedTechnician() == null || !ticket.getAssignedTechnician().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("Access denied: You can only update diagnosis for tickets assigned to you.");
            }
        }

        if (request.getDiagnosticNotes() != null) {
            ticket.setDiagnosticNotes(request.getDiagnosticNotes());
        }
        if (request.getEstimatedCost() != null) {
            ticket.setEstimatedCost(request.getEstimatedCost());
        }
        if (request.getLaborCharge() != null) {
            ticket.setLaborCharge(request.getLaborCharge());
        }
        if (request.getEstimatedCompletionDate() != null) {
            ticket.setEstimatedCompletionDate(request.getEstimatedCompletionDate());
        }

        return ticketRepository.save(ticket);
    }

    @Transactional
    public RepairTicket assignTechnician(Long id, Long technicianId, User currentUser) {
        RepairTicket ticket = getTicketById(id);
        User technician = userRepository.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found with id: " + technicianId));

        ticket.setAssignedTechnician(technician);
        RepairTicket updated = ticketRepository.save(ticket);

        RepairTicketLog log = RepairTicketLog.builder()
                .ticket(updated)
                .previousStatus(ticket.getStatus().name())
                .newStatus(ticket.getStatus().name())
                .remarks("Assigned to technician: " + technician.getFullName())
                .changedBy(currentUser)
                .build();
        ticketLogRepository.save(log);

        syncService.publishEvent("TICKET", "STATUS_CHANGED", updated.getId(), updated.getTicketNumber(), currentUser.getUsername());

        return updated;
    }

    public void validateTransition(TicketStatus currentStatus, TicketStatus newStatus) {
        if (currentStatus == newStatus) {
            return; // Idempotent same-status
        }
        if (TERMINAL_STATUSES.contains(currentStatus)) {
            throw new BadRequestException("Cannot change status: Ticket is in terminal state '" + currentStatus + "'. No further transitions are allowed.");
        }
        // Delivering to customer requires device to be marked READY_FOR_DELIVERY first
        if (newStatus == TicketStatus.DELIVERED && currentStatus != TicketStatus.READY_FOR_DELIVERY) {
            throw new BadRequestException("Cannot mark as DELIVERED directly from '" + currentStatus + 
                    "'. Ticket must be in 'READY_FOR_DELIVERY' before handing over to the customer.");
        }
    }

    private void validateTransitionRolePermissions(RepairTicket ticket, TicketStatus currentStatus, TicketStatus newStatus, User currentUser) {
        if (currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.RECEPTIONIST) {
            return; // Admin and Receptionist have full lifecycle management permissions
        }

        if (currentUser.getRole() == Role.TECHNICIAN) {
            // Technicians can only operate on tickets assigned to them
            if (ticket.getAssignedTechnician() == null || !ticket.getAssignedTechnician().getId().equals(currentUser.getId())) {
                String assignedName = ticket.getAssignedTechnician() != null ? ticket.getAssignedTechnician().getFullName() : "unassigned";
                throw new AccessDeniedException("Access denied: Technicians can only transition tickets assigned to them (this ticket is assigned to: " + assignedName + ").");
            }

            // Technicians can perform diagnosing, quote approval/rejection, bench progress, and ready-for-delivery.
            // Customer handover delivery and cancellation are front-desk receptionist / admin actions.
            if (newStatus == TicketStatus.DELIVERED) {
                throw new AccessDeniedException("Access denied: Technicians cannot deliver devices. Handover must be executed by receptionist or administrator.");
            }
            if (newStatus == TicketStatus.CANCELLED) {
                throw new AccessDeniedException("Access denied: Technicians cannot cancel tickets. Cancellation must be authorized by receptionist or administrator.");
            }
            return;
        }

        throw new AccessDeniedException("Access denied: Unauthorized role for repair ticket transitions.");
    }

    private void validateDeliveryInvoiceRequirements(RepairTicket ticket) {
        Optional<Invoice> invoiceOpt = invoiceRepository.findByRepairTicketId(ticket.getId());
        if (invoiceOpt.isPresent()) {
            Invoice invoice = invoiceOpt.get();
            if (invoice.getStatus() != InvoiceStatus.PAID || invoice.getBalanceAmount().compareTo(BigDecimal.ZERO) > 0) {
                throw new BadRequestException("Cannot deliver device: Invoice #" + invoice.getInvoiceNumber() + 
                        " has an outstanding balance of ₹" + invoice.getBalanceAmount() + ". Payment must be completed before delivery.");
            }
        } else {
            List<TicketPartUsed> parts = ticketPartUsedRepository.findByTicketId(ticket.getId());
            boolean hasCharges = (ticket.getLaborCharge() != null && ticket.getLaborCharge().compareTo(BigDecimal.ZERO) > 0)
                    || (ticket.getEstimatedCost() != null && ticket.getEstimatedCost().compareTo(BigDecimal.ZERO) > 0)
                    || !parts.isEmpty();
            if (hasCharges) {
                throw new BadRequestException("Cannot deliver device: An invoice must be generated and settled prior to customer delivery.");
            }
        }
    }

    @Transactional
    public RepairTicket updateTicketStatus(Long id, TicketStatusUpdateRequest request, User currentUser) {
        RepairTicket ticket = getTicketById(id);
        TicketStatus newStatus;
        try {
            newStatus = TicketStatus.valueOf(request.getStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: " + request.getStatus());
        }

        TicketStatus currentStatus = ticket.getStatus();

        // 1. Validate State Transition
        validateTransition(currentStatus, newStatus);

        // 2. Validate Role Permissions
        validateTransitionRolePermissions(ticket, currentStatus, newStatus, currentUser);

        // 3. Validate Delivery Requirements (Invoice & Payment)
        if (newStatus == TicketStatus.DELIVERED) {
            validateDeliveryInvoiceRequirements(ticket);
        }

        String prevStatus = currentStatus.name();
        ticket.setStatus(newStatus);

        if (newStatus == TicketStatus.READY_FOR_DELIVERY && ticket.getCompletedAt() == null) {
            ticket.setCompletedAt(LocalDateTime.now());
        } else if (newStatus == TicketStatus.DELIVERED && ticket.getDeliveredAt() == null) {
            ticket.setDeliveredAt(LocalDateTime.now());
        }

        RepairTicket updated = ticketRepository.save(ticket);

        // Audit Trail
        RepairTicketLog log = RepairTicketLog.builder()
                .ticket(updated)
                .previousStatus(prevStatus)
                .newStatus(newStatus.name())
                .remarks(request.getRemarks() != null && !request.getRemarks().trim().isEmpty() 
                        ? request.getRemarks().trim() 
                        : "Status transitioned from " + prevStatus + " to " + newStatus.name())
                .changedBy(currentUser)
                .build();
        ticketLogRepository.save(log);

        syncService.publishEvent("TICKET", "STATUS_CHANGED", updated.getId(), updated.getTicketNumber(), currentUser.getUsername());

        return updated;
    }

    @Transactional
    public TicketPartUsed consumePart(Long ticketId, ConsumePartRequest request, User currentUser) {
        RepairTicket ticket = getTicketById(ticketId);

        if (currentUser.getRole() == Role.TECHNICIAN) {
            if (ticket.getAssignedTechnician() == null || !ticket.getAssignedTechnician().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("Access denied: You can only consume parts for tickets assigned to you.");
            }
        }

        InventoryItem item = inventoryRepository.findById(request.getItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + request.getItemId()));

        if (item.getCurrentStock() < request.getQuantity()) {
            throw new BadRequestException("Insufficient inventory for item: " + item.getName() + 
                    ". Requested: " + request.getQuantity() + ", Available: " + item.getCurrentStock());
        }

        // Deduct stock
        int newBalance = item.getCurrentStock() - request.getQuantity();
        item.setCurrentStock(newBalance);
        inventoryRepository.save(item);

        // Save part consumed entry
        TicketPartUsed partUsed = TicketPartUsed.builder()
                .ticket(ticket)
                .item(item)
                .quantity(request.getQuantity())
                .unitPrice(item.getSellingPrice())
                .build();
        TicketPartUsed savedPart = ticketPartUsedRepository.save(partUsed);

        // Record stock movement ledger entry
        StockMovement movement = StockMovement.builder()
                .item(item)
                .movementType(MovementType.REPAIR_CONSUMPTION)
                .quantity(-request.getQuantity())
                .balanceAfter(newBalance)
                .referenceType("TICKET")
                .referenceId(ticket.getId())
                .notes("Consumed in Repair Ticket #" + ticket.getTicketNumber())
                .performedBy(currentUser)
                .build();
        stockMovementRepository.save(movement);

        syncService.publishEvent("TICKET", "PART_CONSUMED", ticket.getId(), ticket.getTicketNumber(), currentUser.getUsername());
        syncService.publishEvent("INVENTORY", "PART_CONSUMED", savedPart.getId(), item.getSku(), currentUser.getUsername());

        return savedPart;
    }

    @Transactional(readOnly = true)
    public List<TicketPartUsed> getPartsUsed(Long ticketId) {
        return ticketPartUsedRepository.findByTicketId(ticketId);
    }

    @Transactional(readOnly = true)
    public List<RepairTicketLog> getTicketLogs(Long ticketId) {
        return ticketLogRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }

    @Transactional
    public TicketAttachment addAttachment(Long ticketId, TicketAttachmentRequest request) {
        RepairTicket ticket = getTicketById(ticketId);

        TicketAttachment attachment = TicketAttachment.builder()
                .ticket(ticket)
                .fileName(request.getFileName())
                .fileUrl(request.getFileUrl())
                .attachmentType(request.getAttachmentType())
                .build();

        return attachmentRepository.save(attachment);
    }

    @Transactional(readOnly = true)
    public List<TicketAttachment> getAttachments(Long ticketId) {
        return attachmentRepository.findByTicketId(ticketId);
    }

    @Transactional
    public void deleteTicket(Long ticketId, User currentUser) {
        RepairTicket ticket = getTicketById(ticketId);

        if (currentUser.getRole() != Role.ADMIN && currentUser.getRole() != Role.RECEPTIONIST) {
            throw new AccessDeniedException("Access denied: Only administrators and receptionists can cancel or delete tickets.");
        }

        if (ticket.getStatus() == TicketStatus.CANCELLED) {
            throw new BadRequestException("Ticket #" + ticket.getTicketNumber() + " is already cancelled.");
        }
        if (ticket.getStatus() == TicketStatus.DELIVERED) {
            throw new BadRequestException("Cannot cancel ticket #" + ticket.getTicketNumber() + " because it is already delivered.");
        }
        if (ticket.getStatus() == TicketStatus.REJECTED) {
            throw new BadRequestException("Cannot cancel ticket #" + ticket.getTicketNumber() + " because it has been rejected.");
        }

        TicketStatusUpdateRequest cancelRequest = new TicketStatusUpdateRequest();
        cancelRequest.setStatus("CANCELLED");
        cancelRequest.setRemarks("Ticket cancelled and preserved by " + currentUser.getFullName() + " (" + currentUser.getRole() + ")");

        updateTicketStatus(ticketId, cancelRequest, currentUser);
    }

    @Transactional
    public void deleteTicket(Long ticketId) {
        // Safe non-destructive soft cancellation fallback
        RepairTicket ticket = getTicketById(ticketId);
        ticket.setStatus(TicketStatus.CANCELLED);
        ticketRepository.save(ticket);
    }

    @Transactional
    public RepairTicket customerApproveQuote(String ticketNumber) {
        RepairTicket ticket = getTicketByNumber(ticketNumber);
        if (ticket.getStatus() == TicketStatus.DELIVERED || ticket.getStatus() == TicketStatus.CANCELLED) {
            throw new BadRequestException("Quote cannot be approved in current status: " + ticket.getStatus());
        }
        ticket.setStatus(TicketStatus.APPROVED);
        RepairTicket updated = ticketRepository.save(ticket);

        RepairTicketLog log = RepairTicketLog.builder()
                .ticket(updated)
                .previousStatus(TicketStatus.ESTIMATION_PENDING.name())
                .newStatus(TicketStatus.APPROVED.name())
                .remarks("Customer approved estimated repair quotation (₹" + updated.getEstimatedCost() + ") via tracking portal")
                .build();
        ticketLogRepository.save(log);

        syncService.publishEvent("TICKET", "STATUS_CHANGED", updated.getId(), updated.getTicketNumber(), "Customer");
        return updated;
    }

    @Transactional
    public RepairTicket customerRejectQuote(String ticketNumber) {
        RepairTicket ticket = getTicketByNumber(ticketNumber);
        ticket.setStatus(TicketStatus.REJECTED);
        RepairTicket updated = ticketRepository.save(ticket);

        RepairTicketLog log = RepairTicketLog.builder()
                .ticket(updated)
                .previousStatus(ticket.getStatus().name())
                .newStatus(TicketStatus.REJECTED.name())
                .remarks("Customer declined estimated quotation via tracking portal")
                .build();
        ticketLogRepository.save(log);

        syncService.publishEvent("TICKET", "STATUS_CHANGED", updated.getId(), updated.getTicketNumber(), "Customer");
        return updated;
    }
}
