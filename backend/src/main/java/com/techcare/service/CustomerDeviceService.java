package com.techcare.service;

import com.techcare.dto.request.DeviceRequest;
import com.techcare.entity.Customer;
import com.techcare.entity.CustomerDevice;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.CustomerDeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerDeviceService {

    private final CustomerDeviceRepository deviceRepository;
    private final CustomerService customerService;

    @Transactional(readOnly = true)
    public List<CustomerDevice> getDevicesByCustomerId(Long customerId) {
        return deviceRepository.findByCustomerId(customerId);
    }

    @Transactional(readOnly = true)
    public CustomerDevice getDeviceById(Long id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer device not found with id: " + id));
    }

    @Transactional
    public CustomerDevice registerDevice(DeviceRequest request) {
        Customer customer = customerService.getCustomerById(request.getCustomerId());

        CustomerDevice device = CustomerDevice.builder()
                .customer(customer)
                .deviceType(request.getDeviceType().toUpperCase())
                .brand(request.getBrand())
                .modelName(request.getModelName())
                .serialNumber(request.getSerialNumber())
                .devicePassword(request.getDevicePassword())
                .physicalCondition(request.getPhysicalCondition())
                .accessoriesReceived(request.getAccessoriesReceived())
                .build();

        return deviceRepository.save(device);
    }
}

