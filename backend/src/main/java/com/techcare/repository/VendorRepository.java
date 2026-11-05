package com.techcare.repository;

import com.techcare.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, Long> {
    Optional<Vendor> findByPhone(String phone);
    List<Vendor> findByIsActiveTrue();
}

