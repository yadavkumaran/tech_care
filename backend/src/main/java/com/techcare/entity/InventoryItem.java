package com.techcare.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String sku;

    @Column(unique = true, length = 100)
    private String barcode;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 50)
    private String category; // RAM, SSD, HDD, SCREEN, BATTERY, KEYBOARD, ADAPTER, etc.

    @Column(name = "current_stock", nullable = false)
    @Builder.Default
    private Integer currentStock = 0;

    @Column(name = "reorder_level", nullable = false)
    @Builder.Default
    private Integer reorderLevel = 5;

    @Column(name = "cost_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal costPrice;

    @Column(name = "selling_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal sellingPrice;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

