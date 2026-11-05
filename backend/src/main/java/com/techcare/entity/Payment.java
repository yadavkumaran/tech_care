package com.techcare.entity;

import com.techcare.entity.enums.PaymentMethod;
import com.techcare.entity.enums.PaymentType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_reference", nullable = false, unique = true, length = 50)
    private String paymentReference; // e.g. PAY-2026-0001

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, length = 30)
    private PaymentType paymentType;

    @Column(name = "transaction_notes", columnDefinition = "TEXT")
    private String transactionNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collected_by_id")
    private User collectedBy;

    @CreationTimestamp
    @Column(name = "payment_date", updatable = false)
    private LocalDateTime paymentDate;
}

