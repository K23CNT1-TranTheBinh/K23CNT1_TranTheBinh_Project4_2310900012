package com.eventticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "G8_ticket_types")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class G8_ticketType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_ticket_type_id")
    private Integer ticketTypeId;

    @ManyToOne
    @JoinColumn(name = "G8_event_id", nullable = false)
    private G8_event event;

    @Column(name = "G8_type_name", nullable = false, length = 100)
    private String typeName; // VIP, Standard, Early Bird

    @Column(name = "G8_price", nullable = false)
    private BigDecimal price;

    @Column(name = "G8_total_quantity", nullable = false)
    private Integer totalQuantity; // Tổng số lượng vé phát hành

    @Column(name = "G8_sold_quantity")
    private Integer soldQuantity; // Số lượng vé đã bán

    @Column(name = "G8_version")
    private Integer version; // Optimistic locking để chặn 2 người mua cùng 1 vé lúc nghẽn mạng

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.soldQuantity == null) {
            this.soldQuantity = 0;
        }
        if (this.version == null) {
            this.version = 1;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
