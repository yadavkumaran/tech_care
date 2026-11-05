package com.techcare.controller;

import com.techcare.dto.request.LoginRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.dto.response.JwtResponse;
import com.techcare.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        JwtResponse jwtResponse = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", jwtResponse));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDetails>> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Current user profile retrieved", userDetails));
    }
}

