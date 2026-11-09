package com.techcare.controller;

import com.techcare.dto.request.CustomerRequest;
import com.techcare.dto.response.ApiResponse;
import com.techcare.entity.Customer;
import com.techcare.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Customer>>> getAllCustomers(
            @RequestParam(required = false) String search) {
        List<Customer> customers = customerService.searchCustomers(search);
        return ResponseEntity.ok(ApiResponse.success(customers));
    }

    @GetMapping("/by-phone")
    public ResponseEntity<ApiResponse<Customer>> getCustomerByPhone(@RequestParam String phone) {
        Customer customer = customerService.getCustomerByPhone(phone);
        return ResponseEntity.ok(ApiResponse.success(customer));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Customer>> getCustomerById(@PathVariable Long id) {
        Customer customer = customerService.getCustomerById(id);
        return ResponseEntity.ok(ApiResponse.success(customer));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Customer>> createCustomer(@Valid @RequestBody CustomerRequest request) {
        Customer created = customerService.createCustomer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Customer created successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Customer>> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request) {
        Customer updated = customerService.updateCustomer(id, request);
        return ResponseEntity.ok(ApiResponse.success("Customer updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok(ApiResponse.success("Customer deleted successfully", null));
    }
}

