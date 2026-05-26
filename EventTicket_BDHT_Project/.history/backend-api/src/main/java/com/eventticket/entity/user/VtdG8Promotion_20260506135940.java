package com.eventticket.entity.user;

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
public class VtdG8Promotion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_promotion_id")
    private Integer promotionId;

    @Column(name = "G8_code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "G8_description", length = 255)
    private String description;

    @Column(name = "G8_discount_type", nullable = false, length = 20)
    private String discountType; // PERCENTAGE, FIXED_AMOUNT

    @Column(name = "G8_discount_value", nullable = false)
    private BigDecimal discountValue;

    @Column(name = "G8_max_discount", nullable = false)
    private BigDecimal maxDiscount;

    @Column(name = "G8_min_order_amount")
    private BigDecimal minOrderAmount;

    @Column(name = "G8_usage_limit")
    private Integer usageLimit;

    @Column(name = "G8_used_count")
    private Integer usedCount;

    @Column(name = "G8_valid_from", nullable = false)
    private LocalDateTime validFrom;

    @Column(name = "G8_valid_until", nullable = false)
    private LocalDateTime validUntil;

    @Column(name = "G8_is_active")
    private Boolean isActive;

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "G8_updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.usedCount == null) {
            this.usedCount = 0;
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
