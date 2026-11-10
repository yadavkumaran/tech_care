package com.techcare.controller;

import com.techcare.dto.response.ApiResponse;
import com.techcare.dto.response.DashboardStatsResponse;
import com.techcare.dto.response.FinancialAnalyticsResponse;
import com.techcare.entity.User;
import com.techcare.repository.UserRepository;
import com.techcare.security.UserDetailsImpl;
import com.techcare.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getStats(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User currentUser = null;
        if (userDetails != null) {
            currentUser = userRepository.findById(userDetails.getId()).orElse(null);
        }
        DashboardStatsResponse stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/financial-analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<FinancialAnalyticsResponse>> getFinancialAnalytics(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getFinancialAnalytics(period)));
    }
}

