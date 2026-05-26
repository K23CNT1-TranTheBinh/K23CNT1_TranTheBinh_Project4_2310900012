package com.eventticket.repository;

import com.eventticket.entity.user.G8_review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<G8_review, Integer> {
    @Query("SELECT r FROM G8_review r WHERE r.event.eventId = :eventId AND r.isHidden = false ORDER BY r.createdAt DESC")
    List<G8_review> findByEventIdNotHidden(@Param("eventId") Integer eventId);

    Optional<G8_review> findByUserIdAndEventId(Integer userId, Integer eventId);

    @Query("SELECT AVG(r.rating) FROM G8_review r WHERE r.event.eventId = :eventId AND r.isHidden = false")
    Double getAverageRatingByEventId(@Param("eventId") Integer eventId);

    @Query("SELECT r FROM G8_review r WHERE r.user.userId = :userId ORDER BY r.createdAt DESC")
    List<G8_review> findByUserId(@Param("userId") Integer userId);

    @Query("SELECT COUNT(r) FROM G8_review r WHERE r.event.eventId = :eventId AND r.isHidden = false")
    long countReviewsByEventId(@Param("eventId") Integer eventId);
}
