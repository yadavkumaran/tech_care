package com.techcare.repository;

import com.techcare.entity.TicketPartUsed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketPartUsedRepository extends JpaRepository<TicketPartUsed, Long> {
    List<TicketPartUsed> findByTicketId(Long ticketId);
}

