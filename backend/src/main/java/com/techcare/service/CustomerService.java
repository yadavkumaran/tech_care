package com.techcare.service;

import com.techcare.dto.request.CustomerRequest;
import com.techcare.entity.Customer;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public List<Customer> searchCustomers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return getAllCustomers();
        }
        return customerRepository.searchCustomers(query.trim());
    }

    @Transactional
    public Customer createCustomer(CustomerRequest request) {
        if (customerRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Customer with phone number " + request.getPhone() + " already exists");
        }

        Customer customer = Customer.builder()
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .taxId(request.getTaxId())
                .build();

        return customerRepository.save(customer);
    }

    @Transactional
    public Customer updateCustomer(Long id, CustomerRequest request) {
        Customer customer = getCustomerById(id);

        if (!customer.getPhone().equals(request.getPhone()) && customerRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Phone number " + request.getPhone() + " is already in use by another customer");
        }

        customer.setFullName(request.getFullName());
        customer.setPhone(request.getPhone());
        customer.setEmail(request.getEmail());
        customer.setAddress(request.getAddress());
        customer.setTaxId(request.getTaxId());

        return customerRepository.save(customer);
    }
}

