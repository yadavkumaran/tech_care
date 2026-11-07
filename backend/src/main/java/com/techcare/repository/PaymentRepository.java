package com.techcare.repository;

import com.techcare.entity.Payment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByPaymentReference(String paymentReference);
    List<Payment> findByInvoiceId(Long invoiceId);

    // Latest payment references for current year to safely compute sequence
    @Query("SELECT p.paymentReference FROM Payment p WHERE p.paymentReference LIKE CONCAT('PAY-', :year, '-%') ORDER BY p.id DESC")
    List<String> findPaymentReferencesByYear(@Param("year") int year, Pageable pageable);

    // Calculate sum of payments collected within a date/time window
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.paymentDate BETWEEN :start AND :end")
    BigDecimal sumPaymentsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}

