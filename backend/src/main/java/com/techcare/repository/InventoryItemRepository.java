package com.techcare.repository;

import com.techcare.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    Optional<InventoryItem> findBySku(String sku);
    Optional<InventoryItem> findByBarcode(String barcode);
    Boolean existsBySku(String sku);

    List<InventoryItem> findByIsActiveTrue();

    // Low stock alert query: items where stock <= reorder level
    @Query("SELECT i FROM InventoryItem i WHERE i.isActive = true AND i.currentStock <= i.reorderLevel")
    List<InventoryItem> findLowStockItems();

    @Query("SELECT i FROM InventoryItem i WHERE i.isActive = true AND (" +
           "LOWER(i.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(i.sku) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "i.barcode LIKE CONCAT('%', :query, '%'))")
    List<InventoryItem> searchInventory(@Param("query") String query);
}

