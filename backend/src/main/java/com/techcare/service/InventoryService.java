package com.techcare.service;

import com.techcare.dto.request.InventoryItemRequest;
import com.techcare.dto.request.StockAdjustmentRequest;
import com.techcare.entity.InventoryItem;
import com.techcare.entity.StockMovement;
import com.techcare.entity.User;
import com.techcare.entity.enums.MovementType;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.InventoryItemRepository;
import com.techcare.repository.PurchaseItemRepository;
import com.techcare.repository.StockMovementRepository;
import com.techcare.repository.TicketPartUsedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryItemRepository inventoryRepository;
    private final StockMovementRepository stockMovementRepository;
    private final TicketPartUsedRepository ticketPartUsedRepository;
    private final PurchaseItemRepository purchaseItemRepository;

    @Transactional(readOnly = true)
    public List<InventoryItem> getAllItems() {
        return inventoryRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<InventoryItem> searchItems(String query) {
        if (query == null || query.trim().isEmpty()) {
            return getAllItems();
        }
        return inventoryRepository.searchInventory(query.trim());
    }

    @Transactional(readOnly = true)
    public List<InventoryItem> getLowStockAlerts() {
        return inventoryRepository.findLowStockItems();
    }

    @Transactional(readOnly = true)
    public InventoryItem getItemById(Long id) {
        return inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + id));
    }

    @Transactional
    public InventoryItem createItem(InventoryItemRequest request, User currentUser) {
        if (inventoryRepository.existsBySku(request.getSku())) {
            throw new BadRequestException("Inventory item with SKU " + request.getSku() + " already exists");
        }

        InventoryItem item = InventoryItem.builder()
                .sku(request.getSku())
                .barcode(request.getBarcode())
                .name(request.getName())
                .category(request.getCategory().toUpperCase())
                .currentStock(request.getCurrentStock())
                .reorderLevel(request.getReorderLevel())
                .costPrice(request.getCostPrice())
                .sellingPrice(request.getSellingPrice())
                .build();

        InventoryItem savedItem = inventoryRepository.save(item);

        // If initial stock is greater than zero, log it into the movement ledger
        if (request.getCurrentStock() > 0) {
            StockMovement movement = StockMovement.builder()
                    .item(savedItem)
                    .movementType(MovementType.ADJUSTMENT_ADD)
                    .quantity(request.getCurrentStock())
                    .balanceAfter(request.getCurrentStock())
                    .referenceType("MANUAL")
                    .notes("Initial stock entry upon creation")
                    .performedBy(currentUser)
                    .build();
            stockMovementRepository.save(movement);
        }

        return savedItem;
    }

    @Transactional
    public InventoryItem updateItem(Long id, InventoryItemRequest request) {
        InventoryItem item = getItemById(id);

        item.setName(request.getName());
        item.setBarcode(request.getBarcode());
        item.setCategory(request.getCategory().toUpperCase());
        item.setReorderLevel(request.getReorderLevel());
        item.setCostPrice(request.getCostPrice());
        item.setSellingPrice(request.getSellingPrice());

        return inventoryRepository.save(item);
    }

    @Transactional
    public InventoryItem adjustStock(Long id, StockAdjustmentRequest request, User currentUser) {
        InventoryItem item = getItemById(id);
        int newBalance = item.getCurrentStock() + request.getQuantity();

        if (newBalance < 0) {
            throw new BadRequestException("Insufficient stock. Cannot adjust by " + request.getQuantity() + ". Current stock: " + item.getCurrentStock());
        }

        item.setCurrentStock(newBalance);
        InventoryItem updatedItem = inventoryRepository.save(item);

        MovementType movementType = request.getQuantity() > 0 ? MovementType.ADJUSTMENT_ADD : MovementType.ADJUSTMENT_SUB;

        StockMovement movement = StockMovement.builder()
                .item(updatedItem)
                .movementType(movementType)
                .quantity(request.getQuantity())
                .balanceAfter(newBalance)
                .referenceType("MANUAL")
                .notes(request.getNotes() != null ? request.getNotes() : "Manual stock adjustment")
                .performedBy(currentUser)
                .build();

        stockMovementRepository.save(movement);
        return updatedItem;
    }

    @Transactional(readOnly = true)
    public List<StockMovement> getItemMovements(Long itemId) {
        return stockMovementRepository.findByItemIdOrderByCreatedAtDesc(itemId);
    }

    @Transactional
    public void deleteItem(Long id) {
        InventoryItem item = getItemById(id);
        boolean hasMovements = stockMovementRepository.existsByItemId(id);
        boolean hasTicketParts = ticketPartUsedRepository.existsByItemId(id);
        boolean hasPurchases = purchaseItemRepository.existsByItemId(id);

        if (hasMovements || hasTicketParts || hasPurchases) {
            // Soft-deactivate to prevent foreign key violation and preserve historical invoices/repairs
            item.setIsActive(false);
            inventoryRepository.save(item);
        } else {
            inventoryRepository.delete(item);
        }
    }
}

