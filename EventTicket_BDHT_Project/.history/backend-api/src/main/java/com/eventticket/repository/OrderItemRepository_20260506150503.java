package com.eventticket.repository;

import com.eventticket.entity.user.G8_order_item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<G8_order_item, Integer> {
    @Query("SELECT oi FROM G8_order_item oi WHERE oi.order.orderId = :orderId")
    List<G8_order_item> findByOrderId(@Param("orderId") Integer orderId);

    @Query("SELECT oi FROM G8_order_item oi WHERE oi.ticketType.ticketTypeId = :ticketTypeId")
    List<G8_order_item> findByTicketTypeId(@Param("ticketTypeId") Integer ticketTypeId);

    @Query("SELECT SUM(oi.quantity) FROM VtdG8OrderItem oi WHERE oi.order.orderId = :orderId")
    Integer getTotalQuantityByOrderId(@Param("orderId") Integer orderId);
}
