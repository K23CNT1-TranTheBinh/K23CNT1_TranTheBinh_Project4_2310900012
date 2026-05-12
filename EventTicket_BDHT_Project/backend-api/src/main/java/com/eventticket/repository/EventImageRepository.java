package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.eventticket.entity.G8_event_image;

import java.util.List;

@Repository
public interface EventImageRepository extends JpaRepository<G8_event_image, Integer> {
    @Query("SELECT ei FROM G8_event_image ei WHERE ei.event.eventId = :eventId ORDER BY ei.sortOrder ASC")
    List<G8_event_image> findByEventIdOrderBySortOrder(@Param("eventId") Integer eventId);

    @Query("SELECT COUNT(ei) FROM G8_event_image ei WHERE ei.event.eventId = :eventId")
    long countByEventId(@Param("eventId") Integer eventId);
}