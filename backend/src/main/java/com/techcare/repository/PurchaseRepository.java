package com.techcare.repository;

import com.techcare.entity.Purchase;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    Optional<Purchase> findByPurchaseOrderNumber(String purchaseOrderNumber);
    List<Purchase> findByVendorId(Long vendorId);

    @Query("SELECT p.purchaseOrderNumber FROM Purchase p WHERE p.purchaseOrderNumber LIKE CONCAT('PO-', :year, '-%') ORDER BY p.id DESC")
    List<String> findPurchaseOrderNumbersByYear(@Param("year") int year, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM Purchase p WHERE p.purchaseDate BETWEEN :start AND :end")
    BigDecimal sumPurchasesBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM Purchase p")
    BigDecimal sumAllPurchases();
}

