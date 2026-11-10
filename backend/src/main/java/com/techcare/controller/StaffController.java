package com.techcare.controller;

import com.techcare.dto.request.StaffRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.entity.User;
import com.techcare.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<List<User>>> getAllStaff() {
        return ResponseEntity.ok(ApiResponse.success(staffService.getAllStaff()));
    }

    @GetMapping("/technicians")
    public ResponseEntity<ApiResponse<List<User>>> getTechnicians() {
        return ResponseEntity.ok(ApiResponse.success(staffService.getActiveTechnicians()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<User>> getStaffById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(staffService.getStaffById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<User>> createStaff(@Valid @RequestBody StaffRequest request) {
        User created = staffService.createStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Staff member created successfully", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<User>> updateStaff(
            @PathVariable Long id,
            @Valid @RequestBody StaffRequest request) {
        User updated = staffService.updateStaff(id, request);
        return ResponseEntity.ok(ApiResponse.success("Staff member updated successfully", updated));
    }

    @PatchMapping("/{id}/base-salary")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<User>> updateBaseSalary(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, java.math.BigDecimal> payload) {
        java.math.BigDecimal baseSalary = payload.get("baseSalary");
        User updated = staffService.updateBaseSalary(id, baseSalary);
        return ResponseEntity.ok(ApiResponse.success("Base salary updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteStaff(@PathVariable Long id) {
        staffService.deleteStaff(id);
        return ResponseEntity.ok(ApiResponse.success("Staff member deleted or deactivated successfully", null));
    }
}
