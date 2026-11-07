package com.techcare.repository;

import com.techcare.entity.DevicePinAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DevicePinAuditLogRepository extends JpaRepository<DevicePinAuditLog, Long> {
    List<DevicePinAuditLog> findByDeviceIdOrderByAccessedAtDesc(Long deviceId);
    List<DevicePinAuditLog> findByUserIdOrderByAccessedAtDesc(Long userId);
}

