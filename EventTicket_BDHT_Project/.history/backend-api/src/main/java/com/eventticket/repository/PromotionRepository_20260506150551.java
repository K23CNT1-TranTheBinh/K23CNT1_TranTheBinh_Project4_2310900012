package com.eventticket.repository;

import com.eventticket.entity.user.G8_promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<G8_promotion, Integer> {
    Optional<G8_promotion> findByCode(String code);

    @Query("SELECT p FROM G8_promotion p WHERE p.isActive = true AND p.validUntil > CURRENT_TIMESTAMP")
    List<G8_promotion> findAllActivePromotions();

    @Query("SELECT p FROM G8_promotion p WHERE p.isActive = true AND p.usageLimit > p.usedCount")
    List<G8_promotion> findAvailablePromotions();

    @Query("SELECT p FROM G8_promotion p WHERE p.validFrom <= :date AND p.validUntil >= :date AND p.isActive = true")
    List<G8_promotion> findValidPromotionsAt(@Param("date") LocalDateTime date);
}
