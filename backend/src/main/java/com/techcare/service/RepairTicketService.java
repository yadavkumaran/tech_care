package com.techcare.service;

import com.techcare.dto.request.*;
import com.techcare.entity.*;
import com.techcare.entity.enums.MovementType;
import com.techcare.entity.enums.TicketPriority;
import com.techcare.entity.enums.TicketStatus;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RepairTicketService {

    private final RepairTicketRepository ticketRepository;
    private final RepairTicketLogRepository ticketLogRepository;
    private final TicketAttachmentRepository attachmentRepository;
    private final TicketPartUsedRepository ticketPartUsedRepository;
    private final CustomerService customerService;
    private final CustomerDeviceService deviceService;
    private final InventoryItemRepository inventoryRepository;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;

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

        return savedTicket;
    }

    @Transactional
    public RepairTicket updateDiagnosis(Long id, TicketDiagnosisRequest request, User currentUser) {
        RepairTicket ticket = getTicketById(id);

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

        return updated;
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

        String prevStatus = ticket.getStatus().name();
        ticket.setStatus(newStatus);

        if (newStatus == TicketStatus.READY_FOR_DELIVERY) {
            ticket.setCompletedAt(LocalDateTime.now());
        } else if (newStatus == TicketStatus.DELIVERED) {
            ticket.setDeliveredAt(LocalDateTime.now());
        }

        RepairTicket updated = ticketRepository.save(ticket);

        // Audit Trail
        RepairTicketLog log = RepairTicketLog.builder()
                .ticket(updated)
                .previousStatus(prevStatus)
                .newStatus(newStatus.name())
                .remarks(request.getRemarks() != null ? request.getRemarks() : "Status updated to " + newStatus)
                .changedBy(currentUser)
                .build();
        ticketLogRepository.save(log);

        return updated;
    }

    @Transactional
    public TicketPartUsed consumePart(Long ticketId, ConsumePartRequest request, User currentUser) {
        RepairTicket ticket = getTicketById(ticketId);
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
    public void deleteTicket(Long ticketId) {
        RepairTicket ticket = getTicketById(ticketId);
        ticketRepository.delete(ticket);
    }
}

