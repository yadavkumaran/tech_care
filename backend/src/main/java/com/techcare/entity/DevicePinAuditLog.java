package com.techcare.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "device_pin_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevicePinAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(name = "user_role", nullable = false, length = 30)
    private String userRole;

    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Column(name = "ticket_id")
    private Long ticketId;

    @Column(nullable = false, length = 50)
    private String outcome; // e.g. "SUCCESS_ADMIN", "SUCCESS_ASSIGNED_TECH", "DENIED_UNASSIGNED_TECH", "DENIED_RECEPTIONIST"

    @CreationTimestamp
    @Column(name = "accessed_at", updatable = false)
    private LocalDateTime accessedAt;
}

