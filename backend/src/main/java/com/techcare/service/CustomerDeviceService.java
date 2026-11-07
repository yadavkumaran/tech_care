package com.techcare.service;

import com.techcare.dto.request.DeviceRequest;
import com.techcare.dto.response.DevicePinResponse;
import com.techcare.entity.Customer;
import com.techcare.entity.CustomerDevice;
import com.techcare.entity.DevicePinAuditLog;
import com.techcare.entity.RepairTicket;
import com.techcare.entity.User;
import com.techcare.entity.enums.Role;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.CustomerDeviceRepository;
import com.techcare.repository.DevicePinAuditLogRepository;
import com.techcare.repository.RepairTicketRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerDeviceService {

    private static final Logger auditLogger = LoggerFactory.getLogger("AUDIT_SECURITY");

    private final CustomerDeviceRepository deviceRepository;
    private final CustomerService customerService;
    private final RepairTicketRepository ticketRepository;
    private final DevicePinAuditService auditService;

    @Transactional(readOnly = true)
    public List<CustomerDevice> getDevicesByCustomerId(Long customerId) {
        return deviceRepository.findByCustomerId(customerId);
    }

    @Transactional(readOnly = true)
    public CustomerDevice getDeviceById(Long id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer device not found with id: " + id));
    }

    @Transactional
    public CustomerDevice registerDevice(DeviceRequest request) {
        Customer customer = customerService.getCustomerById(request.getCustomerId());

        CustomerDevice device = CustomerDevice.builder()
                .customer(customer)
                .deviceType(request.getDeviceType().toUpperCase())
                .brand(request.getBrand())
                .modelName(request.getModelName())
                .serialNumber(request.getSerialNumber())
                .devicePassword(request.getDevicePassword())
                .physicalCondition(request.getPhysicalCondition())
                .accessoriesReceived(request.getAccessoriesReceived())
                .build();

        return deviceRepository.save(device);
    }

    @Transactional
    public void deleteDevice(Long id) {
        CustomerDevice device = getDeviceById(id);
        boolean hasTickets = ticketRepository.existsByDeviceId(id);
        if (hasTickets) {
            throw new BadRequestException("Cannot delete device '" + device.getBrand() + " " + device.getModelName() + 
                    "' because it is associated with historical repair tickets.");
        }
        deviceRepository.delete(device);
    }

    public DevicePinResponse revealDevicePin(Long deviceId, User currentUser) {
        CustomerDevice device = getDeviceById(deviceId);
        List<RepairTicket> tickets = ticketRepository.findByDeviceId(deviceId);

        boolean isAuthorized = false;
        Long activeTicketId = null;

        if (currentUser.getRole() == Role.ADMIN) {
            isAuthorized = true;
            activeTicketId = tickets.stream().map(RepairTicket::getId).findFirst().orElse(null);
        } else if (currentUser.getRole() == Role.TECHNICIAN) {
            for (RepairTicket t : tickets) {
                if (t.getAssignedTechnician() != null &&
                    t.getAssignedTechnician().getId().equals(currentUser.getId()) &&
                    !"DELIVERED".equals(t.getStatus().name()) &&
                    !"CANCELLED".equals(t.getStatus().name())) {
                    isAuthorized = true;
                    activeTicketId = t.getId();
                    break;
                }
            }
        }

        if (!isAuthorized) {
            String outcome = "DENIED_" + currentUser.getRole().name();
            try {
                auditService.recordAudit(
                        currentUser.getId(),
                        currentUser.getUsername(),
                        currentUser.getRole().name(),
                        deviceId,
                        activeTicketId,
                        outcome);
            } catch (Exception e) {
                auditLogger.error("Failed to persist security audit record for denied access", e);
            }
            auditLogger.warn("AUDIT_SECURITY: Unauthorized attempt to access device PIN for deviceId={} by userId={} ({})",
                    deviceId, currentUser.getId(), currentUser.getUsername());
            throw new AccessDeniedException("Access denied: You are not authorized to view the device PIN for this device.");
        }

        String outcome = "SUCCESS_" + currentUser.getRole().name();
        try {
            auditService.recordAudit(
                    currentUser.getId(),
                    currentUser.getUsername(),
                    currentUser.getRole().name(),
                    deviceId,
                    activeTicketId,
                    outcome);
        } catch (Exception e) {
            auditLogger.error("Failed to persist security audit record for authorized access", e);
        }

        // Audit log access without logging the sensitive PIN
        auditLogger.info("AUDIT_SECURITY: Authorized device PIN revealed for deviceId={} by userId={} ({}) at {}",
                deviceId, currentUser.getId(), currentUser.getUsername(), LocalDateTime.now());

        return DevicePinResponse.builder()
                .deviceId(device.getId())
                .serialNumber(device.getSerialNumber())
                .devicePassword(device.getDevicePassword())
                .revealedAt(LocalDateTime.now())
                .revealedBy(currentUser.getUsername())
                .build();
    }
}

