package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.eventticket.entity.G8_ticket;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<G8_ticket, Integer> {
    Optional<G8_ticket> findByQrCode(String qrCode);

    @Query("SELECT t FROM G8_ticket t WHERE t.order.orderId = :orderId")
    List<G8_ticket> findByOrderId(@Param("orderId") Integer orderId);

    @Query("SELECT t FROM G8_ticket t WHERE t.order.user.userId = :userId")
    List<G8_ticket> findByUserId(@Param("userId") Integer userId);

    @Query("SELECT t FROM G8_ticket t WHERE t.checkInStatus = :checkInStatus")
    List<G8_ticket> findByCheckInStatus(@Param("checkInStatus") Boolean checkInStatus);

    @Query("SELECT COUNT(t) FROM G8_ticket t WHERE t.checkInStatus = true")
    long countCheckedInTickets();

    @Query("SELECT COUNT(t) FROM G8_ticket t WHERE t.order.orderId = :orderId")
    long countTicketsByOrderId(@Param("orderId") Integer orderId);
}
