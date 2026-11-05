package com.techcare.service;

import com.techcare.dto.request.VendorRequest;
import com.techcare.entity.Vendor;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VendorService {

    private final VendorRepository vendorRepository;

    @Transactional(readOnly = true)
    public List<Vendor> getAllVendors() {
        return vendorRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Vendor getVendorById(Long id) {
        return vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));
    }

    @Transactional
    public Vendor createVendor(VendorRequest request) {
        if (vendorRepository.findByPhone(request.getPhone()).isPresent()) {
            throw new BadRequestException("Vendor with phone number " + request.getPhone() + " already exists");
        }

        Vendor vendor = Vendor.builder()
                .companyName(request.getCompanyName())
                .contactPerson(request.getContactPerson())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .taxId(request.getTaxId())
                .build();

        return vendorRepository.save(vendor);
    }
}

