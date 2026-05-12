package com.eventticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "G8_promotions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class G8_promotion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_promotion_id")
    private Integer promotionId;

    @Column(name = "G8_code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "G8_discount_type", nullable = false, length = 20)
    private String discountType; // PERCENT hoặc FIXED

    @Column(name = "G8_discount_value", nullable = false)
    private BigDecimal discountValue;

    @Column(name = "G8_min_order_value")
    private BigDecimal minOrderValue; // Điều kiện tổng tiền đơn hàng tối thiểu

    @Column(name = "G8_usage_limit")
    private Integer usageLimit; // Giới hạn tổng số lần sử dụng (NULL = Vô hạn)

    @Column(name = "G8_used_count")
    private Integer usedCount; // Theo dõi đã được sử dụng bao nhiêu lần

    @Column(name = "G8_valid_to", nullable = false)
    private LocalDateTime validTo; // Hạn chót sử dụng mã

    @Column(name = "G8_is_active")
    private Boolean isActive; // 1 = Đang chạy, 0 = Đã tắt

    @PrePersist
    protected void onCreate() {
        if (this.usedCount == null) {
            this.usedCount = 0;
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }
}
