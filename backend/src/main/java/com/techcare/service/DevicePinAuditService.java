package com.techcare.service;

import com.techcare.entity.DevicePinAuditLog;
import com.techcare.repository.DevicePinAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DevicePinAuditService {

    private final DevicePinAuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public DevicePinAuditLog recordAudit(Long userId, String username, String role, Long deviceId, Long ticketId, String outcome) {
        return auditLogRepository.save(DevicePinAuditLog.builder()
                .userId(userId)
                .username(username)
                .userRole(role)
                .deviceId(deviceId)
                .ticketId(ticketId)
                .outcome(outcome)
                .accessedAt(LocalDateTime.now())
                .build());
    }
}

