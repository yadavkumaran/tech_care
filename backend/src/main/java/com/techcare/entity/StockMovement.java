package com.techcare.entity;

import com.techcare.entity.enums.MovementType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private InventoryItem item;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 30)
    private MovementType movementType;

    @Column(nullable = false)
    private Integer quantity; // Positive for additions, negative for deductions

    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;

    @Column(name = "reference_type", length = 30)
    private String referenceType; // TICKET, PURCHASE, INVOICE, MANUAL

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_id")
    private User performedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

