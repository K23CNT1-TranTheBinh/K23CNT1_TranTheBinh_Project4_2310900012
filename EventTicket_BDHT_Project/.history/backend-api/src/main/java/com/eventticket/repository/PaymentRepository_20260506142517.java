package com.eventticket.repository;

import com.eventticket.entity.user.VtdG8Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<VtdG8Payment, Integer> {
    @Query("SELECT p FROM VtdG8Payment p WHERE p.order.orderId = :orderId")
    List<VtdG8Payment> findByOrderId(@Param("orderId") Integer orderId);
    
    Optional<VtdG8Payment> findByTransactionId(String transactionId);
    
    @Query("SELECT p FROM VtdG8Payment p WHERE p.status = :status")
    List<VtdG8Payment> findByStatus(@Param("status") String status);
    
    @Query("SELECT p FROM VtdG8Payment p WHERE p.paymentMethod = :method")
    List<VtdG8Payment> findByPaymentMethod(@Param("method") String method);
    
    @Query("SELECT p FROM VtdG8Payment p WHERE p.paidAt BETWEEN :startDate AND :endDate")
    List<VtdG8Payment> findPaymentsByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}
