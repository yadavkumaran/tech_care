package com.techcare.controller;

import com.techcare.dto.request.InventoryItemRequest;
import com.techcare.dto.request.StockAdjustmentRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.entity.InventoryItem;
import com.techcare.entity.StockMovement;
import com.techcare.entity.User;
import com.techcare.repository.UserRepository;
import com.techcare.security.UserDetailsImpl;
import com.techcare.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<InventoryItem>>> getAllItems(@RequestParam(required = false) String search) {
        List<InventoryItem> items = inventoryService.searchItems(search);
        return ResponseEntity.ok(ApiResponse.success(items));
    }

    @GetMapping("/alerts/low-stock")
    public ResponseEntity<ApiResponse<List<InventoryItem>>> getLowStockAlerts() {
        List<InventoryItem> items = inventoryService.getLowStockAlerts();
        return ResponseEntity.ok(ApiResponse.success(items));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryItem>> getItemById(@PathVariable Long id) {
        InventoryItem item = inventoryService.getItemById(id);
        return ResponseEntity.ok(ApiResponse.success(item));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InventoryItem>> createItem(
            @Valid @RequestBody InventoryItemRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = userRepository.getReferenceById(userDetails.getId());
        InventoryItem created = inventoryService.createItem(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Inventory item created successfully", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InventoryItem>> updateItem(
            @PathVariable Long id,
            @Valid @RequestBody InventoryItemRequest request) {
        InventoryItem updated = inventoryService.updateItem(id, request);
        return ResponseEntity.ok(ApiResponse.success("Inventory item updated successfully", updated));
    }

    @PostMapping("/{id}/adjust-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ApiResponse<InventoryItem>> adjustStock(
            @PathVariable Long id,
            @Valid @RequestBody StockAdjustmentRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = userRepository.getReferenceById(userDetails.getId());
        InventoryItem updated = inventoryService.adjustStock(id, request, user);
        return ResponseEntity.ok(ApiResponse.success("Stock adjusted successfully", updated));
    }

    @GetMapping("/{id}/movements")
    public ResponseEntity<ApiResponse<List<StockMovement>>> getItemMovements(@PathVariable Long id) {
        List<StockMovement> movements = inventoryService.getItemMovements(id);
        return ResponseEntity.ok(ApiResponse.success(movements));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable Long id) {
        inventoryService.deleteItem(id);
        return ResponseEntity.ok(ApiResponse.success("Inventory item deleted or deactivated successfully", null));
    }
}

