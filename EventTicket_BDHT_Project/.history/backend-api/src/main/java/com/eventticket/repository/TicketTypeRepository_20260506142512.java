package com.eventticket.repository;

import com.eventticket.entity.user.Vtd_G8_ticketType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketTypeRepository extends JpaRepository<Vtd_G8_ticketType, Integer> {
    @Query("SELECT t FROM Vtd_G8_ticketType t WHERE t.event.eventId = :eventId")
    List<Vtd_G8_ticketType> findByEventId(@Param("eventId") Integer eventId);
    
    @Query("SELECT t FROM Vtd_G8_ticketType t WHERE t.event.eventId = :eventId AND t.isActive = true")
    List<Vtd_G8_ticketType> findActiveTicketTypesByEventId(@Param("eventId") Integer eventId);
    
    @Query("SELECT t FROM Vtd_G8_ticketType t WHERE t.event.eventId = :eventId AND t.quantityAvailable > t.quantitySold")
    List<Vtd_G8_ticketType> findAvailableTicketsByEventId(@Param("eventId") Integer eventId);
    
    @Query("SELECT COUNT(t) FROM Vtd_G8_ticketType t WHERE t.event.eventId = :eventId")
    long countByEventId(@Param("eventId") Integer eventId);
}
