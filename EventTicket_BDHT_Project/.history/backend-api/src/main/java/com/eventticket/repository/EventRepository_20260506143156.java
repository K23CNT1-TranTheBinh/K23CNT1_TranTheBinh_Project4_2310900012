package com.eventticket.repository;

import com.eventticket.entity.user.G8_event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<G8_event, Integer> {
    @Query("SELECT e FROM Vtd_G8_event e WHERE e.status = :status AND e.deletedAt IS NULL")
    List<G8_event> findByStatus(@Param("status") String status);

    @Query("SELECT e FROM Vtd_G8_event e WHERE e.status = 'PUBLISHED' AND e.deletedAt IS NULL ORDER BY e.eventDate ASC")
    List<G8_event> findUpcomingEvents();

    @Query("SELECT e FROM Vtd_G8_event e WHERE e.eventDate BETWEEN :startDate AND :endDate AND e.deletedAt IS NULL")
    List<G8_event> findEventsByDateRange(@Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT e FROM Vtd_G8_event e WHERE LOWER(e.title) LIKE LOWER(CONCAT('%', :keyword, '%')) AND e.deletedAt IS NULL")
    List<G8_event> searchByTitle(@Param("keyword") String keyword);

    @Query("SELECT e FROM Vtd_G8_event e WHERE e.venueId = :venueId AND e.deletedAt IS NULL")
    List<G8_event> findByVenueId(@Param("venueId") Integer venueId);
}
