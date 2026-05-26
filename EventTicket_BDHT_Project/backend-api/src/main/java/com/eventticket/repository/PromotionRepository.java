package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.eventticket.entity.G8_promotion;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<G8_promotion, Integer> {
    Optional<G8_promotion> findByCode(String code);

    @Query("SELECT p FROM G8_promotion p WHERE p.isActive = true AND p.validTo > CURRENT_TIMESTAMP")
    List<G8_promotion> findAllActivePromotions();

    @Query("SELECT p FROM G8_promotion p WHERE p.isActive = true AND (p.usageLimit IS NULL OR p.usageLimit > p.usedCount)")
    List<G8_promotion> findAvailablePromotions();

    @Query("SELECT p FROM G8_promotion p WHERE p.validTo >= :date AND p.isActive = true")
    List<G8_promotion> findValidPromotionsAt(@Param("date") LocalDateTime date);

    // Dành cho Admin:  - Tìm kiếm theo keyword (code) và lọc theo trạng thái
    @Query("SELECT p FROM G8_promotion p WHERE " +
           "(:keyword IS NULL OR LOWER(p.code) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:isActive IS NULL OR p.isActive = :isActive) " +
           "ORDER BY p.promotionId DESC")
    List<G8_promotion> searchAndFilterAdmin(@Param("keyword") String keyword, @Param("isActive") Boolean isActive);
}
