package com.eventticket.entity.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "G8_order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Vtd_G8_orderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_order_item_id")
    private Integer orderItemId;

    @ManyToOne
    @JoinColumn(name = "G8_order_id", nullable = false)
    private Vtd_G8_order order;

    @ManyToOne
    @JoinColumn(name = "G8_ticket_type_id", nullable = false)
    private Vtd_G8_ticketType ticketType;

    @Column(name = "G8_quantity", nullable = false)
    private Integer quantity;

    @Column(name = "G8_price_at_time", nullable = false)
    private BigDecimal priceAtTime; // Giá tại thời điểm mua để lưu lịch sử
}
