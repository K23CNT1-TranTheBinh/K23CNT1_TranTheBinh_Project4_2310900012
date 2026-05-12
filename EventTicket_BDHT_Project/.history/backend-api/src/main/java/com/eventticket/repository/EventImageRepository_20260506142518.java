package com.eventticket.repository;

import com.eventticket.entity.user.VtdG8EventImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventImageRepository extends JpaRepository<VtdG8EventImage, Integer> {
    @Query("SELECT ei FROM VtdG8EventImage ei WHERE ei.event.eventId = :eventId ORDER BY ei.sortOrder ASC")
    List<VtdG8EventImage> findByEventIdOrderBySortOrder(@Param("eventId") Integer eventId);
    
    @Query("SELECT COUNT(ei) FROM VtdG8EventImage ei WHERE ei.event.eventId = :eventId")
    long countByEventId(@Param("eventId") Integer eventId);
}
