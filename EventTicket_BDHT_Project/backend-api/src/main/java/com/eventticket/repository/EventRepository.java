package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.eventticket.entity.G8_event;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<G8_event, Integer> {
    @Query("SELECT e FROM G8_event e WHERE e.status = :status AND e.deletedAt IS NULL")
    List<G8_event> findByStatus(@Param("status") String status);

    @Query("SELECT e FROM G8_event e WHERE e.status = 'PUBLISHED' AND e.deletedAt IS NULL ORDER BY e.startTime ASC")
    List<G8_event> findUpcomingEvents();

    @Query("SELECT e FROM G8_event e WHERE e.startTime BETWEEN :startDate AND :endDate AND e.deletedAt IS NULL")
    List<G8_event> findEventsByDateRange(@Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT e FROM G8_event e WHERE LOWER(e.title) LIKE LOWER(CONCAT('%', :keyword, '%')) AND e.deletedAt IS NULL")
    List<G8_event> searchByTitle(@Param("keyword") String keyword);

    @Query("SELECT e FROM G8_event e WHERE e.venue.venueId = :venueId AND e.deletedAt IS NULL")
    List<G8_event> findByVenueId(@Param("venueId") Integer venueId);
}
