package com.techcare.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techcare.dto.response.DevicePinResponse;
import com.techcare.entity.*;
import com.techcare.entity.enums.Role;
import com.techcare.entity.enums.TicketPriority;
import com.techcare.entity.enums.TicketStatus;
import com.techcare.repository.*;
import com.techcare.service.CustomerDeviceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class DeviceSecurityTest {

    @Autowired
    private CustomerDeviceService deviceService;

    @Autowired
    private CustomerDeviceRepository deviceRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RepairTicketRepository ticketRepository;

    @Autowired
    private RepairTicketLogRepository ticketLogRepository;

    @Autowired
    private DevicePinAuditLogRepository auditLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private User adminUser;
    private User assignedTech;
    private User otherTech;
    private User receptionistUser;
    private Customer customer;
    private CustomerDevice device;
    private RepairTicket ticket;

    @BeforeEach
    public void setup() {
        auditLogRepository.deleteAllInBatch();
        ticketLogRepository.deleteAllInBatch();
        ticketRepository.deleteAllInBatch();
        deviceRepository.deleteAllInBatch();
        customerRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();

        adminUser = userRepository.save(User.builder()
                .username("test_admin")
                .email("admin@test.com")
                .passwordHash("hashed")
                .fullName("Test Admin")
                .role(Role.ADMIN)
                .isActive(true)
                .build());

        assignedTech = userRepository.save(User.builder()
                .username("tech_assigned")
                .email("tech1@test.com")
                .passwordHash("hashed")
                .fullName("Assigned Tech")
                .role(Role.TECHNICIAN)
                .isActive(true)
                .build());

        otherTech = userRepository.save(User.builder()
                .username("tech_unassigned")
                .email("tech2@test.com")
                .passwordHash("hashed")
                .fullName("Other Tech")
                .role(Role.TECHNICIAN)
                .isActive(true)
                .build());

        receptionistUser = userRepository.save(User.builder()
                .username("receptionist_user")
                .email("frontdesk@test.com")
                .passwordHash("hashed")
                .fullName("Front Desk")
                .role(Role.RECEPTIONIST)
                .isActive(true)
                .build());

        customer = customerRepository.save(Customer.builder()
                .fullName("John Doe")
                .phone("+91 9999988888")
                .email("john@test.com")
                .build());

        device = deviceRepository.save(CustomerDevice.builder()
                .customer(customer)
                .deviceType("LAPTOP")
                .brand("Dell")
                .modelName("XPS 15")
                .serialNumber("SN-XPS-9988")
                .devicePassword("SuperSecretPin123")
                .build());

        ticket = ticketRepository.save(RepairTicket.builder()
                .ticketNumber("TC-TEST-001")
                .customer(customer)
                .device(device)
                .assignedTechnician(assignedTech)
                .createdBy(receptionistUser)
                .status(TicketStatus.IN_PROGRESS)
                .priority(TicketPriority.HIGH)
                .problemReported("Keyboard not typing")
                .estimatedCost(BigDecimal.valueOf(1500))
                .laborCharge(BigDecimal.valueOf(500))
                .build());
    }

    @Test
    @DisplayName("Verify that device JSON serialization NEVER leaks the plaintext device password")
    public void testDevicePasswordExcludedFromJson() throws Exception {
        CustomerDevice fetchedDevice = deviceService.getDeviceById(device.getId());
        String json = objectMapper.writeValueAsString(fetchedDevice);

        assertNotNull(json);
        assertFalse(json.contains("SuperSecretPin123"), "JSON response must not contain plaintext device password");
        assertFalse(json.contains("devicePassword"), "JSON response must not contain devicePassword field");
    }

    @Test
    @DisplayName("Admin can reveal device PIN and audit record is persisted without PIN")
    public void testAdminCanRevealPin() {
        DevicePinResponse response = deviceService.revealDevicePin(device.getId(), adminUser);
        assertNotNull(response);
        assertEquals("SuperSecretPin123", response.getDevicePassword());
        assertEquals("test_admin", response.getRevealedBy());

        List<DevicePinAuditLog> audits = auditLogRepository.findByDeviceIdOrderByAccessedAtDesc(device.getId());
        assertFalse(audits.isEmpty(), "Audit log must be created");
        DevicePinAuditLog latest = audits.get(0);
        assertEquals(adminUser.getId(), latest.getUserId());
        assertEquals("SUCCESS_ADMIN", latest.getOutcome());
    }

    @Test
    @DisplayName("Assigned technician can reveal device PIN and audit record is persisted")
    public void testAssignedTechnicianCanRevealPin() {
        DevicePinResponse response = deviceService.revealDevicePin(device.getId(), assignedTech);
        assertNotNull(response);
        assertEquals("SuperSecretPin123", response.getDevicePassword());
        assertEquals("tech_assigned", response.getRevealedBy());

        List<DevicePinAuditLog> audits = auditLogRepository.findByDeviceIdOrderByAccessedAtDesc(device.getId());
        assertFalse(audits.isEmpty());
        DevicePinAuditLog latest = audits.get(0);
        assertEquals(assignedTech.getId(), latest.getUserId());
        assertEquals("SUCCESS_TECHNICIAN", latest.getOutcome());
    }

    @Test
    @DisplayName("Unassigned technician is denied access to device PIN")
    public void testUnassignedTechnicianDeniedPin() {
        assertThrows(AccessDeniedException.class, () -> {
            deviceService.revealDevicePin(device.getId(), otherTech);
        });

        List<DevicePinAuditLog> audits = auditLogRepository.findByDeviceIdOrderByAccessedAtDesc(device.getId());
        assertFalse(audits.isEmpty(), "Denied attempt must be audited");
        DevicePinAuditLog latest = audits.get(0);
        assertEquals(otherTech.getId(), latest.getUserId());
        assertEquals("DENIED_TECHNICIAN", latest.getOutcome());
    }

    @Test
    @DisplayName("Receptionist is denied access to device PIN")
    public void testReceptionistDeniedPin() {
        assertThrows(AccessDeniedException.class, () -> {
            deviceService.revealDevicePin(device.getId(), receptionistUser);
        });

        List<DevicePinAuditLog> audits = auditLogRepository.findByDeviceIdOrderByAccessedAtDesc(device.getId());
        assertFalse(audits.isEmpty(), "Denied attempt must be audited");
        DevicePinAuditLog latest = audits.get(0);
        assertEquals(receptionistUser.getId(), latest.getUserId());
        assertEquals("DENIED_RECEPTIONIST", latest.getOutcome());
    }
}
