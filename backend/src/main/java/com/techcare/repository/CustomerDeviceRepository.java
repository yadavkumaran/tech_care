package com.techcare.repository;

import com.techcare.entity.CustomerDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerDeviceRepository extends JpaRepository<CustomerDevice, Long> {
    List<CustomerDevice> findByCustomerId(Long customerId);
}

