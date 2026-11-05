package com.techcare.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "repair_ticket_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepairTicketLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private RepairTicket ticket;

    @Column(name = "previous_status", length = 30)
    private String previousStatus;

    @Column(name = "new_status", nullable = false, length = 30)
    private String newStatus;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_id")
    private User changedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

