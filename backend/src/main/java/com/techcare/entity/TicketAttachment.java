package com.techcare.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_attachments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private RepairTicket ticket;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_url", nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "attachment_type", nullable = false, length = 30)
    @Builder.Default
    private String attachmentType = "INTAKE_DAMAGE"; // INTAKE_DAMAGE, DIAGNOSTIC_PROOF, BILL_SCAN

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;
}

