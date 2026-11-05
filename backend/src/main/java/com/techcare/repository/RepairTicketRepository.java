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
    List<RepairTicket> findByStatus(TicketStatus status);
    List<RepairTicket> findByAssignedTechnicianId(Long technicianId);
    List<RepairTicket> findByCustomerId(Long customerId);

    // Count tickets in non-delivered/non-cancelled active states
    @Query("SELECT COUNT(t) FROM RepairTicket t WHERE t.status NOT IN ('DELIVERED', 'CANCELLED')")
    long countActiveTickets();

    long countByStatus(TicketStatus status);

    @Query("SELECT t FROM RepairTicket t WHERE " +
           "LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(t.customer.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "t.customer.phone LIKE CONCAT('%', :query, '%')")
    List<RepairTicket> searchTickets(@Param("query") String query);
}

