package com.techcare.repository;

import com.techcare.entity.Invoice;
import com.techcare.entity.enums.InvoiceStatus;
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
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    Optional<Invoice> findByRepairTicketId(Long repairTicketId);
    List<Invoice> findByCustomerId(Long customerId);
    boolean existsByCustomerId(Long customerId);
    List<Invoice> findByStatus(InvoiceStatus status);

    // Latest invoice numbers for current year to safely compute sequence
    @Query("SELECT i.invoiceNumber FROM Invoice i WHERE i.invoiceNumber LIKE CONCAT('INV-', :year, '-%') ORDER BY i.id DESC")
    List<String> findInvoiceNumbersByYear(@Param("year") int year, Pageable pageable);

    // Outstanding customer receivables: sum of balance_amount for unpaid/partially paid
    @Query("SELECT COALESCE(SUM(i.balanceAmount), 0) FROM Invoice i WHERE i.status IN ('UNPAID', 'PARTIALLY_PAID')")
    BigDecimal calculateTotalOutstandingReceivables();

    // Invoices issued on a given date (for today's billing revenue calculation)
    List<Invoice> findByInvoiceDate(LocalDate invoiceDate);
}

