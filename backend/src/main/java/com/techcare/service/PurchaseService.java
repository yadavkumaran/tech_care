package com.techcare.service;

import com.techcare.dto.request.PurchaseRequest;
import com.techcare.entity.*;
import com.techcare.entity.enums.MovementType;
import com.techcare.exception.BadRequestException;
import com.techcare.repository.InventoryItemRepository;
import com.techcare.repository.PurchaseRepository;
import com.techcare.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final VendorService vendorService;
    private final InventoryItemRepository inventoryRepository;
    private final StockMovementRepository stockMovementRepository;
    private final SyncNotificationService syncService;

    @Transactional(readOnly = true)
    public List<Purchase> getAllPurchases() {
        return purchaseRepository.findAll();
    }

    private synchronized String generateNextPurchaseOrderNumber() {
        int currentYear = Year.now().getValue();
        List<String> latestList = purchaseRepository.findPurchaseOrderNumbersByYear(currentYear, PageRequest.of(0, 1));
        int nextSequence = 1;
        if (!latestList.isEmpty()) {
            String latest = latestList.get(0);
            try {
                String[] parts = latest.split("-");
                if (parts.length >= 3) {
                    nextSequence = Integer.parseInt(parts[2]) + 1;
                }
            } catch (Exception e) {
                nextSequence = (int) purchaseRepository.count() + 1;
            }
        }
        return String.format("PO-%d-%04d", currentYear, nextSequence);
    }

    @Transactional
    public Purchase recordPurchase(PurchaseRequest request, User currentUser) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Purchase must contain at least one item");
        }

        Vendor vendor = vendorService.getVendorById(request.getVendorId());

        String poNumber = generateNextPurchaseOrderNumber();

        BigDecimal paidAmount = request.getPaidAmount() != null ? request.getPaidAmount() : BigDecimal.ZERO;
        if (paidAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Paid amount cannot be negative");
        }

        Purchase purchase = Purchase.builder()
                .purchaseOrderNumber(poNumber)
                .vendor(vendor)
                .vendorBillNumber(request.getVendorBillNumber())
                .purchaseDate(request.getPurchaseDate())
                .paidAmount(paidAmount)
                .notes(request.getNotes())
                .items(new ArrayList<>())
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<StockMovement> movements = new ArrayList<>();

        for (PurchaseRequest.PurchaseItemDto itemDto : request.getItems()) {
            if (itemDto.getQuantity() == null || itemDto.getQuantity() <= 0) {
                throw new BadRequestException("Purchase item quantity must be greater than zero");
            }
            if (itemDto.getUnitCost() == null || itemDto.getUnitCost().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Purchase item unit cost cannot be negative");
            }

            InventoryItem item = inventoryRepository.findById(itemDto.getItemId())
                    .orElseThrow(() -> new BadRequestException("Inventory item not found with ID: " + itemDto.getItemId()));

            BigDecimal lineTotal = itemDto.getUnitCost().multiply(BigDecimal.valueOf(itemDto.getQuantity()));
            totalAmount = totalAmount.add(lineTotal);

            PurchaseItem purchaseItem = PurchaseItem.builder()
                    .purchase(purchase)
                    .item(item)
                    .quantity(itemDto.getQuantity())
                    .unitCost(itemDto.getUnitCost())
                    .totalCost(lineTotal)
                    .build();

            purchase.getItems().add(purchaseItem);

            // Increment inventory stock
            int newBalance = item.getCurrentStock() + itemDto.getQuantity();
            item.setCurrentStock(newBalance);
            // Update cost price to latest purchase cost
            item.setCostPrice(itemDto.getUnitCost());
            inventoryRepository.save(item);

            // Stage stock movement ledger entry
            StockMovement movement = StockMovement.builder()
                    .item(item)
                    .movementType(MovementType.PURCHASE)
                    .quantity(itemDto.getQuantity())
                    .balanceAfter(newBalance)
                    .referenceType("PURCHASE")
                    .notes("Received from " + vendor.getCompanyName() + " via PO " + poNumber)
                    .performedBy(currentUser)
                    .build();
            movements.add(movement);
        }

        purchase.setTotalAmount(totalAmount);

        // Calculate payment status
        if (paidAmount.compareTo(totalAmount) >= 0) {
            purchase.setPaymentStatus("PAID");
        } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            purchase.setPaymentStatus("PARTIALLY_PAID");
        } else {
            purchase.setPaymentStatus("UNPAID");
        }

        Purchase savedPurchase = purchaseRepository.save(purchase);

        // Associate saved purchase ID with stock movements and persist
        for (StockMovement m : movements) {
            m.setReferenceId(savedPurchase.getId());
            stockMovementRepository.save(m);
        }

        String actor = currentUser != null ? currentUser.getUsername() : "Staff";
        syncService.publishEvent("PURCHASE", "RECORDED", savedPurchase.getId(), savedPurchase.getPurchaseOrderNumber(), actor);
        syncService.publishEvent("INVENTORY", "STOCK_INCREASED", savedPurchase.getId(), savedPurchase.getPurchaseOrderNumber(), actor);

        return savedPurchase;
    }
}

