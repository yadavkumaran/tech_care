package com.techcare.service;

import com.techcare.dto.request.VendorRequest;
import com.techcare.entity.Vendor;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.PurchaseRepository;
import com.techcare.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VendorService {

    private final VendorRepository vendorRepository;
    private final PurchaseRepository purchaseRepository;

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

    @Transactional
    public Vendor updateVendor(Long id, VendorRequest request) {
        Vendor vendor = getVendorById(id);

        if (!vendor.getPhone().equals(request.getPhone()) && vendorRepository.findByPhone(request.getPhone()).isPresent()) {
            throw new BadRequestException("Vendor with phone number " + request.getPhone() + " already exists");
        }

        vendor.setCompanyName(request.getCompanyName());
        vendor.setContactPerson(request.getContactPerson());
        vendor.setPhone(request.getPhone());
        vendor.setEmail(request.getEmail());
        vendor.setAddress(request.getAddress());
        vendor.setTaxId(request.getTaxId());

        return vendorRepository.save(vendor);
    }

    @Transactional
    public void deleteVendor(Long id) {
        Vendor vendor = getVendorById(id);
        boolean hasPurchases = !purchaseRepository.findByVendorId(id).isEmpty();
        if (hasPurchases) {
            // Cannot hard delete due to foreign key constraints in purchases table; soft-deactivate instead
            vendor.setIsActive(false);
            vendorRepository.save(vendor);
        } else {
            vendorRepository.delete(vendor);
        }
    }
}

