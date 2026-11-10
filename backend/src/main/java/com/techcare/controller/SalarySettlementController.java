package com.techcare.controller;

import com.techcare.dto.request.SalarySettlementRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.dto.response.SalarySettlementResponse;
import com.techcare.entity.User;
import com.techcare.repository.UserRepository;
import com.techcare.security.UserDetailsImpl;
import com.techcare.service.SalarySettlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salaries")
@RequiredArgsConstructor
public class SalarySettlementController {

    private final SalarySettlementService salaryService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<SalarySettlementResponse>>> getAllSettlements() {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getAllSettlements()));
    }

    @GetMapping("/staff/{staffId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<SalarySettlementResponse>>> getSettlementsByStaff(
            @PathVariable Long staffId) {
        return ResponseEntity.ok(ApiResponse.success(salaryService.getSettlementsByStaff(staffId)));
    }

    @PostMapping("/settle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SalarySettlementResponse>> settleSalary(
            @Valid @RequestBody SalarySettlementRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User currentUser = userDetails != null ? userRepository.findById(userDetails.getId()).orElse(null) : null;
        SalarySettlementResponse response = salaryService.settleSalary(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Salary settled and recorded successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSettlement(@PathVariable Long id) {
        salaryService.deleteSettlement(id);
        return ResponseEntity.ok(ApiResponse.success("Salary settlement record removed", null));
    }
}
