package com.techcare.repository;

import com.techcare.entity.RepairTicketLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RepairTicketLogRepository extends JpaRepository<RepairTicketLog, Long> {
    List<RepairTicketLog> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
}

