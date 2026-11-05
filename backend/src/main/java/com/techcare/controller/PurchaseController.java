package com.techcare.controller;

import com.techcare.dto.request.PurchaseRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.entity.Purchase;
import com.techcare.entity.User;
import com.techcare.repository.UserRepository;
import com.techcare.security.UserDetailsImpl;
import com.techcare.service.PurchaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService purchaseService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Purchase>>> getAllPurchases() {
        return ResponseEntity.ok(ApiResponse.success(purchaseService.getAllPurchases()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Purchase>> recordPurchase(
            @Valid @RequestBody PurchaseRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = userRepository.getReferenceById(userDetails.getId());
        Purchase purchase = purchaseService.recordPurchase(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Purchase recorded and stock added to inventory", purchase));
    }
}

