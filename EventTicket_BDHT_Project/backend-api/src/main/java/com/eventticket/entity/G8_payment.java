package com.eventticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "G8_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class G8_payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_payment_id")
    private Integer paymentId;

    @ManyToOne
    @JoinColumn(name = "G8_order_id", nullable = false)
    private G8_order order;

    @Column(name = "G8_payment_method", nullable = false, length = 50)
    private String paymentMethod; // MOMO, VNPAY, ZALOPAY, CASH

    @Column(name = "G8_amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "G8_transaction_id", length = 100)
    private String transactionId;

    @Column(name = "G8_status", length = 50)
    private String status; // PENDING, SUCCESS, FAILED

    @Column(name = "G8_paid_at")
    private LocalDateTime paidAt;

    @PrePersist
    protected void onCreate() {
        if (this.status == null) {
            this.status = "PENDING";
        }
    }

}
