package com.techcare.controller;

import com.techcare.dto.request.DeviceRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.dto.response.DevicePinResponse;
import com.techcare.entity.CustomerDevice;
import com.techcare.entity.User;
import com.techcare.repository.UserRepository;
import com.techcare.security.UserDetailsImpl;
import com.techcare.service.CustomerDeviceService;
import com.techcare.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class CustomerDeviceController {

    private final CustomerDeviceService deviceService;
    private final UserRepository userRepository;

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<CustomerDevice>>> getDevicesByCustomer(@PathVariable Long customerId) {
        List<CustomerDevice> devices = deviceService.getDevicesByCustomerId(customerId);
        return ResponseEntity.ok(ApiResponse.success(devices));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerDevice>> getDeviceById(@PathVariable Long id) {
        CustomerDevice device = deviceService.getDeviceById(id);
        return ResponseEntity.ok(ApiResponse.success(device));
    }

    @GetMapping("/{id}/security-pin")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ApiResponse<DevicePinResponse>> revealDevicePin(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userDetails.getId()));
        DevicePinResponse pinResponse = deviceService.revealDevicePin(id, user);
        return ResponseEntity.ok(ApiResponse.success("Device PIN accessed", pinResponse));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerDevice>> registerDevice(@Valid @RequestBody DeviceRequest request) {
        CustomerDevice device = deviceService.registerDevice(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Device registered successfully", device));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<Void>> deleteDevice(@PathVariable Long id) {
        deviceService.deleteDevice(id);
        return ResponseEntity.ok(ApiResponse.success("Device removed successfully", null));
    }
}

