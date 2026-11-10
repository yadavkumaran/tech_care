package com.techcare.repository;

import com.techcare.entity.SalarySettlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface SalarySettlementRepository extends JpaRepository<SalarySettlement, Long> {

    List<SalarySettlement> findByStaffIdOrderByPaymentDateDesc(Long staffId);

    @Query("SELECT s FROM SalarySettlement s JOIN FETCH s.staff LEFT JOIN FETCH s.settledBy ORDER BY s.paymentDate DESC, s.id DESC")
    List<SalarySettlement> findAllWithStaff();

    List<SalarySettlement> findBySalaryMonth(String salaryMonth);

    boolean existsByStaffIdAndSalaryMonth(Long staffId, String salaryMonth);

    @Query("SELECT COALESCE(SUM(s.netSalary), 0) FROM SalarySettlement s WHERE s.paymentDate BETWEEN :start AND :end AND s.status = 'PAID'")
    BigDecimal sumNetSalaryBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(s.netSalary), 0) FROM SalarySettlement s WHERE s.status = 'PAID'")
    BigDecimal sumAllNetSalary();

    @Query("SELECT COUNT(s) FROM SalarySettlement s WHERE s.paymentDate BETWEEN :start AND :end AND s.status = 'PAID'")
    long countSettlementsBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);
}
