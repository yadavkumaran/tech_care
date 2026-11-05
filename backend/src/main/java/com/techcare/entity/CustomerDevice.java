package com.techcare.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "customer_devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "device_type", nullable = false, length = 30)
    private String deviceType; // LAPTOP, DESKTOP, ALL_IN_ONE, PRINTER, CUSTOM_PC

    @Column(nullable = false, length = 50)
    private String brand;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(name = "device_password", length = 100)
    private String devicePassword;

    @Column(name = "physical_condition", columnDefinition = "TEXT")
    private String physicalCondition;

    @Column(name = "accessories_received", columnDefinition = "TEXT")
    private String accessoriesReceived;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

