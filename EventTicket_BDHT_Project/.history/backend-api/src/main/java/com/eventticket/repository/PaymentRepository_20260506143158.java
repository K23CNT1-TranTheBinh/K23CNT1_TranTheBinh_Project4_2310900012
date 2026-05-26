package com.eventticket.repository;

import com.eventticket.entity.user.G8_payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<G8_payment, Integer> {
    @Query("SELECT p FROM VtdG8Payment p WHERE p.order.orderId = :orderId")
    List<G8_payment> findByOrderId(@Param("orderId") Integer orderId);

    Optional<G8_payment> findByTransactionId(String transactionId);

    @Query("SELECT p FROM VtdG8Payment p WHERE p.status = :status")
    List<G8_payment> findByStatus(@Param("status") String status);

    @Query("SELECT p FROM VtdG8Payment p WHERE p.paymentMethod = :method")
    List<G8_payment> findByPaymentMethod(@Param("method") String method);

    @Query("SELECT p FROM VtdG8Payment p WHERE p.paidAt BETWEEN :startDate AND :endDate")
    List<G8_payment> findPaymentsByDateRange(@Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
}
