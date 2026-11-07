package com.techcare.repository;

import com.techcare.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    List<StockMovement> findByItemIdOrderByCreatedAtDesc(Long itemId);
    boolean existsByItemId(Long itemId);
}

