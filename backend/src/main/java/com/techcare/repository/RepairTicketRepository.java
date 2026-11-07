package com.techcare.repository;

import com.techcare.entity.RepairTicket;
import com.techcare.entity.enums.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RepairTicketRepository extends JpaRepository<RepairTicket, Long> {
    Optional<RepairTicket> findByTicketNumber(String ticketNumber);
    boolean existsByTicketNumber(String ticketNumber);
    List<RepairTicket> findByStatus(TicketStatus status);
    List<RepairTicket> findByAssignedTechnicianId(Long technicianId);
    List<RepairTicket> findByCustomerId(Long customerId);
    boolean existsByCustomerId(Long customerId);
    List<RepairTicket> findByDeviceId(Long deviceId);
    boolean existsByDeviceId(Long deviceId);
    boolean existsByCreatedById(Long createdById);
    boolean existsByAssignedTechnicianId(Long technicianId);

    // Count tickets in active workshop states (excluding terminal states: DELIVERED, CANCELLED, REJECTED)
    @Query("SELECT COUNT(t) FROM RepairTicket t WHERE t.status NOT IN ('DELIVERED', 'CANCELLED', 'REJECTED')")
    long countActiveTickets();

    long countByStatus(TicketStatus status);

    // Technician-specific metrics
    @Query("SELECT COUNT(t) FROM RepairTicket t WHERE t.assignedTechnician.id = :techId AND t.status NOT IN ('DELIVERED', 'CANCELLED', 'REJECTED')")
    long countActiveByTechnicianId(@Param("techId") Long techId);

    @Query("SELECT COUNT(t) FROM RepairTicket t WHERE t.assignedTechnician.id = :techId AND t.status IN ('READY_FOR_DELIVERY', 'DELIVERED')")
    long countCompletedByTechnicianId(@Param("techId") Long techId);

    @Query("SELECT COUNT(t) FROM RepairTicket t WHERE t.assignedTechnician.id = :techId AND t.status IN ('DIAGNOSING', 'ESTIMATION_PENDING', 'WAITING_FOR_PARTS')")
    long countPendingDiagnosticsByTechnicianId(@Param("techId") Long techId);

    @Query("SELECT COUNT(t) FROM RepairTicket t WHERE t.assignedTechnician.id = :techId AND t.priority IN (com.techcare.entity.enums.TicketPriority.HIGH, com.techcare.entity.enums.TicketPriority.URGENT) AND t.status NOT IN ('DELIVERED', 'CANCELLED', 'REJECTED')")
    long countHighPriorityByTechnicianId(@Param("techId") Long techId);

    @Query("SELECT t FROM RepairTicket t WHERE t.assignedTechnician.id = :techId AND t.status NOT IN ('DELIVERED', 'CANCELLED') ORDER BY t.createdAt DESC")
    List<RepairTicket> findRecentAssignedTickets(@Param("techId") Long techId, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT t FROM RepairTicket t WHERE " +
           "LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(t.customer.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "t.customer.phone LIKE CONCAT('%', :query, '%')")
    List<RepairTicket> searchTickets(@Param("query") String query);
}

