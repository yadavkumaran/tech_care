package com.techcare.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncEvent {
    private String entity; // TICKET, INVOICE, PAYMENT, INVENTORY, CUSTOMER, DEVICE, PURCHASE, STAFF
    private String action; // CREATED, UPDATED, STATUS_CHANGED, CANCELLED, RECORDED, DELETED
    private Long id;
    private String reference; // e.g. TC-2026-0001, INV-2026-0001
    private String actorUsername;
    private LocalDateTime timestamp;
}
