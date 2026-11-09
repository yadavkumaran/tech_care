package com.techcare.service;

import com.techcare.dto.request.CustomerRequest;
import com.techcare.entity.Customer;
import com.techcare.entity.CustomerDevice;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.CustomerDeviceRepository;
import com.techcare.repository.CustomerRepository;
import com.techcare.repository.InvoiceRepository;
import com.techcare.repository.RepairTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerDeviceRepository deviceRepository;
    private final RepairTicketRepository ticketRepository;
    private final InvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Customer getCustomerByPhone(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return null;
        }
        String cleaned = phone.trim();
        java.util.Optional<Customer> exact = customerRepository.findByPhone(cleaned);
        if (exact.isPresent()) {
            return exact.get();
        }
        String digits = cleaned.replaceAll("\\D", "");
        if (digits.length() >= 10) {
            String suffix = digits.substring(digits.length() - 10);
            return customerRepository.findAll().stream()
                    .filter(c -> c.getPhone() != null && c.getPhone().replaceAll("\\D", "").endsWith(suffix))
                    .findFirst()
                    .orElse(null);
        }
        return null;
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

    @Transactional
    public void deleteCustomer(Long id) {
        Customer customer = getCustomerById(id);

        if (ticketRepository.existsByCustomerId(id)) {
            throw new BadRequestException("Cannot delete customer '" + customer.getFullName() + 
                    "' because they have historical repair tickets associated with their account.");
        }
        if (invoiceRepository.existsByCustomerId(id)) {
            throw new BadRequestException("Cannot delete customer '" + customer.getFullName() + 
                    "' because billing invoices exist for this customer.");
        }

        List<CustomerDevice> customerDevices = deviceRepository.findByCustomerId(id);
        for (CustomerDevice d : customerDevices) {
            if (ticketRepository.existsByDeviceId(d.getId())) {
                throw new BadRequestException("Cannot delete customer '" + customer.getFullName() + 
                        "' because their device '" + d.getBrand() + " " + d.getModelName() + "' is linked to repair tickets.");
            }
        }
        // Remove unlinked devices first to satisfy referential integrity
        if (!customerDevices.isEmpty()) {
            deviceRepository.deleteAll(customerDevices);
        }

        try {
            customerRepository.delete(customer);
        } catch (Exception e) {
            throw new BadRequestException("Cannot delete customer because linked records exist.");
        }
    }
}

