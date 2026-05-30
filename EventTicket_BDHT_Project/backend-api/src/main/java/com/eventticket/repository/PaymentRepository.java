package com.eventticket.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.eventticket.entity.G8_payment;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<G8_payment, Integer> {
    @Query("SELECT p FROM G8_payment p WHERE p.order.orderId = :orderId")
    List<G8_payment> findByOrderId(@Param("orderId") Integer orderId);

    Optional<G8_payment> findTopByOrder_OrderIdAndStatusAndPaymentMethodOrderByPaymentIdDesc(
            Integer orderId,
            String status,
            String paymentMethod);

    Optional<G8_payment> findByTransactionId(String transactionId);

    @Query("SELECT p FROM G8_payment p WHERE p.status = :status")
    List<G8_payment> findByStatus(@Param("status") String status);

    @Query("SELECT p FROM G8_payment p WHERE p.paymentMethod = :method")
    List<G8_payment> findByPaymentMethod(@Param("method") String method);

    @Query("SELECT p FROM G8_payment p WHERE p.paidAt BETWEEN :startDate AND :endDate")
    List<G8_payment> findPaymentsByDateRange(@Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("""
            SELECT COUNT(p) FROM G8_payment p
            WHERE p.order.user.userId = :userId
              AND p.order.status = 'COMPLETED'
              AND p.status = 'SUCCESS'
              AND EXISTS (
                  SELECT oi FROM G8_order_item oi
                  WHERE oi.order.orderId = p.order.orderId
                    AND oi.ticketType.event.eventId = :eventId
              )
            """)
    long countSuccessfulPaymentsByUserAndEvent(@Param("userId") Integer userId, @Param("eventId") Integer eventId);
}
