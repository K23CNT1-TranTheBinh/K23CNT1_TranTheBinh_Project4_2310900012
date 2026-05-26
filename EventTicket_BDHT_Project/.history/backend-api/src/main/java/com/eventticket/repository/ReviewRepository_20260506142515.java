package com.eventticket.repository;

import com.eventticket.entity.user.VtdG8Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<VtdG8Review, Integer> {
    @Query("SELECT r FROM VtdG8Review r WHERE r.event.eventId = :eventId AND r.isHidden = false ORDER BY r.createdAt DESC")
    List<VtdG8Review> findByEventIdNotHidden(@Param("eventId") Integer eventId);
    
    Optional<VtdG8Review> findByUserIdAndEventId(Integer userId, Integer eventId);
    
    @Query("SELECT AVG(r.rating) FROM VtdG8Review r WHERE r.event.eventId = :eventId AND r.isHidden = false")
    Double getAverageRatingByEventId(@Param("eventId") Integer eventId);
    
    @Query("SELECT r FROM VtdG8Review r WHERE r.user.userId = :userId ORDER BY r.createdAt DESC")
    List<VtdG8Review> findByUserId(@Param("userId") Integer userId);
    
    @Query("SELECT COUNT(r) FROM VtdG8Review r WHERE r.event.eventId = :eventId AND r.isHidden = false")
    long countReviewsByEventId(@Param("eventId") Integer eventId);
}
