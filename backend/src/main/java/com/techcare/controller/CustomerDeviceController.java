package com.techcare.controller;

import com.techcare.dto.request.DeviceRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.entity.CustomerDevice;
import com.techcare.service.CustomerDeviceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class CustomerDeviceController {

    private final CustomerDeviceService deviceService;

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

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerDevice>> registerDevice(@Valid @RequestBody DeviceRequest request) {
        CustomerDevice device = deviceService.registerDevice(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Device registered successfully", device));
    }
}

