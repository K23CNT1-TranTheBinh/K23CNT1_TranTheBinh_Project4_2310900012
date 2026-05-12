package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.eventticket.entity.G8_ticketType;

import java.util.List;

@Repository
public interface TicketTypeRepository extends JpaRepository<G8_ticketType, Integer> {
    @Query("SELECT t FROM G8_ticketType t WHERE t.event.eventId = :eventId")
    List<G8_ticketType> findByEventId(@Param("eventId") Integer eventId);

    @Query("SELECT t FROM G8_ticketType t WHERE t.event.eventId = :eventId AND t.totalQuantity > t.soldQuantity")
    List<G8_ticketType> findAvailableTicketsByEventId(@Param("eventId") Integer eventId);

    @Query("SELECT COUNT(t) FROM G8_ticketType t WHERE t.event.eventId = :eventId")
    long countByEventId(@Param("eventId") Integer eventId);
}
