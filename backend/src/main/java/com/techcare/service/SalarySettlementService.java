package com.techcare.service;

import com.techcare.dto.request.SalarySettlementRequest;
import com.techcare.dto.response.SalarySettlementResponse;
import com.techcare.entity.SalarySettlement;
import com.techcare.entity.User;
import com.techcare.exception.BadRequestException;
import com.techcare.exception.ResourceNotFoundException;
import com.techcare.repository.SalarySettlementRepository;
import com.techcare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalarySettlementService {

    private final SalarySettlementRepository salaryRepository;
    private final UserRepository userRepository;
    private final SyncNotificationService syncService;

    @Transactional(readOnly = true)
    public List<SalarySettlementResponse> getAllSettlements() {
        return salaryRepository.findAllWithStaff().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalarySettlementResponse> getSettlementsByStaff(Long staffId) {
        return salaryRepository.findByStaffIdOrderByPaymentDateDesc(staffId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SalarySettlementResponse settleSalary(SalarySettlementRequest request, User settledBy) {
        User staff = userRepository.findById(request.getStaffId())
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + request.getStaffId()));

        BigDecimal base = request.getBaseSalary() != null ? request.getBaseSalary() : BigDecimal.ZERO;
        BigDecimal bonus = request.getBonus() != null ? request.getBonus() : BigDecimal.ZERO;
        BigDecimal deductions = request.getDeductions() != null ? request.getDeductions() : BigDecimal.ZERO;

        BigDecimal netSalary = base.add(bonus).subtract(deductions);
        if (netSalary.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Net salary cannot be negative");
        }

        SalarySettlement settlement = SalarySettlement.builder()
                .staff(staff)
                .salaryMonth(request.getSalaryMonth().trim())
                .baseSalary(base)
                .bonus(bonus)
                .deductions(deductions)
                .netSalary(netSalary)
                .paymentMethod(request.getPaymentMethod().toUpperCase().trim())
                .transactionRef(request.getTransactionRef() != null ? request.getTransactionRef().trim() : null)
                .paymentDate(request.getPaymentDate() != null ? request.getPaymentDate() : java.time.LocalDate.now())
                .status("PAID")
                .notes(request.getNotes())
                .settledBy(settledBy)
                .build();

        SalarySettlement saved = salaryRepository.save(settlement);

        // Update staff member's base salary if not set yet or changed
        if (staff.getBaseSalary() == null || staff.getBaseSalary().compareTo(base) != 0) {
            staff.setBaseSalary(base);
            userRepository.save(staff);
        }

        syncService.publishEvent(
                "STAFF",
                "SALARY_SETTLED",
                saved.getId(),
                saved.getSalaryMonth(),
                settledBy != null ? settledBy.getUsername() : "Admin"
        );

        return toResponse(saved);
    }

    @Transactional
    public void deleteSettlement(Long id) {
        SalarySettlement settlement = salaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary settlement record not found with id: " + id));
        salaryRepository.delete(settlement);
    }

    public SalarySettlementResponse toResponse(SalarySettlement s) {
        return SalarySettlementResponse.builder()
                .id(s.getId())
                .staffId(s.getStaff().getId())
                .staffName(s.getStaff().getFullName())
                .staffEmail(s.getStaff().getEmail())
                .staffPhone(s.getStaff().getPhone())
                .staffRole(s.getStaff().getRole().name())
                .salaryMonth(s.getSalaryMonth())
                .baseSalary(s.getBaseSalary())
                .bonus(s.getBonus())
                .deductions(s.getDeductions())
                .netSalary(s.getNetSalary())
                .paymentMethod(s.getPaymentMethod())
                .transactionRef(s.getTransactionRef())
                .paymentDate(s.getPaymentDate())
                .status(s.getStatus())
                .notes(s.getNotes())
                .settledById(s.getSettledBy() != null ? s.getSettledBy().getId() : null)
                .settledByName(s.getSettledBy() != null ? s.getSettledBy().getFullName() : null)
                .createdAt(s.getCreatedAt())
                .build();
    }
}
