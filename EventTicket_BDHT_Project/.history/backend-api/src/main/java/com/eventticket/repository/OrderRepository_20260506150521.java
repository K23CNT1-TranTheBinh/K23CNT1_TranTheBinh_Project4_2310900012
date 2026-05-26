package com.eventticket.repository;

import com.eventticket.entity.user.G8_order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<G8_order, Integer> {
    List<G8_order> findByUserId(Integer userId);

    @Query("SELECT o FROM G8_order o WHERE o.user.userId = :userId AND o.status = :status")
    List<G8_order> findByUserIdAndStatus(@Param("userId") Integer userId, @Param("status") String status);

    @Query("SELECT o FROM G8_order o WHERE o.status = :status")
    List<G8_order> findByStatus(@Param("status") String status);

    @Query("SELECT o FROM G8_order o WHERE o.createdAt BETWEEN :startDate AND :endDate")
    List<G8_order> findOrdersByDateRange(@Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COUNT(o) FROM G8_order o WHERE o.status = 'COMPLETED'")
    long countCompletedOrders();
}
