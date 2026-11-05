package com.techcare.service;

import com.techcare.dto.request.PurchaseRequest;
import com.techcare.entity.*;
import com.techcare.entity.enums.MovementType;
import com.techcare.exception.BadRequestException;
import com.techcare.repository.InventoryItemRepository;
import com.techcare.repository.PurchaseRepository;
import com.techcare.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
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

    @Transactional(readOnly = true)
    public List<Purchase> getAllPurchases() {
        return purchaseRepository.findAll();
    }

    @Transactional
    public Purchase recordPurchase(PurchaseRequest request, User currentUser) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Purchase must contain at least one item");
        }

        Vendor vendor = vendorService.getVendorById(request.getVendorId());

        long count = purchaseRepository.count() + 1;
        String poNumber = String.format("PO-%d-%04d", Year.now().getValue(), count);

        BigDecimal totalAmount = BigDecimal.ZERO;

        Purchase purchase = Purchase.builder()
                .purchaseOrderNumber(poNumber)
                .vendor(vendor)
                .vendorBillNumber(request.getVendorBillNumber())
                .purchaseDate(request.getPurchaseDate())
                .paidAmount(request.getPaidAmount())
                .notes(request.getNotes())
                .items(new ArrayList<>())
                .build();

        for (PurchaseRequest.PurchaseItemDto itemDto : request.getItems()) {
            InventoryItem item = inventoryRepository.findById(itemDto.getItemId())
                    .orElseThrow(() -> new BadRequestException("Inventory item not found: " + itemDto.getItemId()));

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

            // Log stock movement
            StockMovement movement = StockMovement.builder()
                    .item(item)
                    .movementType(MovementType.PURCHASE)
                    .quantity(itemDto.getQuantity())
                    .balanceAfter(newBalance)
                    .referenceType("PURCHASE")
                    .referenceId(null) // Assigned after save
                    .notes("Received from " + vendor.getCompanyName() + " via PO " + poNumber)
                    .performedBy(currentUser)
                    .build();
            stockMovementRepository.save(movement);
        }

        purchase.setTotalAmount(totalAmount);

        // Calculate payment status
        if (request.getPaidAmount().compareTo(totalAmount) >= 0) {
            purchase.setPaymentStatus("PAID");
        } else if (request.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            purchase.setPaymentStatus("PARTIALLY_PAID");
        } else {
            purchase.setPaymentStatus("UNPAID");
        }

        return purchaseRepository.save(purchase);
    }
}

