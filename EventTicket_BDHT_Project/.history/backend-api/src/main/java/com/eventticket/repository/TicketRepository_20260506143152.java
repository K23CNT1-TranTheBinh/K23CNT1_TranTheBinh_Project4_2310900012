package com.eventticket.repository;

import com.eventticket.entity.user.G8_ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<G8_ticket, Integer> {
    Optional<G8_ticket> findByQrCode(String qrCode);

    @Query("SELECT t FROM Vtd_G8_ticket t WHERE t.order.orderId = :orderId")
    List<G8_ticket> findByOrderId(@Param("orderId") Integer orderId);

    @Query("SELECT t FROM Vtd_G8_ticket t WHERE t.order.user.userId = :userId")
    List<G8_ticket> findByUserId(@Param("userId") Integer userId);

    @Query("SELECT t FROM Vtd_G8_ticket t WHERE t.status = :status")
    List<G8_ticket> findByStatus(@Param("status") String status);

    @Query("SELECT COUNT(t) FROM Vtd_G8_ticket t WHERE t.status = 'USED'")
    long countUsedTickets();

    @Query("SELECT COUNT(t) FROM Vtd_G8_ticket t WHERE t.order.orderId = :orderId")
    long countTicketsByOrderId(@Param("orderId") Integer orderId);
}
