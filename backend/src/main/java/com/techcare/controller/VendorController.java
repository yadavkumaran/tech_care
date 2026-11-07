package com.techcare.controller;

import com.techcare.dto.request.VendorRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.entity.Vendor;
import com.techcare.service.VendorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vendors")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Vendor>>> getAllVendors() {
        return ResponseEntity.ok(ApiResponse.success(vendorService.getAllVendors()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Vendor>> getVendorById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vendorService.getVendorById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<Vendor>> createVendor(@Valid @RequestBody VendorRequest request) {
        Vendor vendor = vendorService.createVendor(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Vendor created successfully", vendor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<Vendor>> updateVendor(
            @PathVariable Long id,
            @Valid @RequestBody VendorRequest request) {
        Vendor updated = vendorService.updateVendor(id, request);
        return ResponseEntity.ok(ApiResponse.success("Vendor updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<Void>> deleteVendor(@PathVariable Long id) {
        vendorService.deleteVendor(id);
        return ResponseEntity.ok(ApiResponse.success("Vendor deleted successfully", null));
    }
}

