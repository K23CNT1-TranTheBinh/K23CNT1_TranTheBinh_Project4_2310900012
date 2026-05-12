package com.eventticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "G8_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class G8_order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_order_id")
    private Integer orderId;

    @ManyToOne
    @JoinColumn(name = "G8_user_id", nullable = false)
    private G8_users user;

    @ManyToOne
    @JoinColumn(name = "G8_promotion_id")
    private G8_promotion promotion; // Entity Promotion xem ở dưới

    @Column(name = "G8_total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "G8_final_amount", nullable = false)
    private BigDecimal finalAmount;

    @Column(name = "G8_status")
    private String status; // PENDING, COMPLETED, CANCELLED

    @Column(name = "G8_created_at")
    private LocalDateTime createdAt;

    @Column(name = "G8_cancelled_at")
    private LocalDateTime cancelledAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null)
            this.status = "PENDING";
    }

}
