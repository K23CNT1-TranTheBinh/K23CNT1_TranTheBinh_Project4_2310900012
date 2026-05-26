package com.eventticket.entity.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "G8_ticket_types")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Vtd_G8_ticketType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_ticket_type_id")
    private Integer ticketTypeId;

    @ManyToOne
    @JoinColumn(name = "G8_event_id", nullable = false)
    private Vtd_G8_event event;

    @Column(name = "G8_type_name", nullable = false, length = 100)
    private String typeName; // VIP, Standard, Economy, etc.

    @Column(name = "G8_description", length = 255)
    private String description;

    @Column(name = "G8_price", nullable = false)
    private BigDecimal price;

    @Column(name = "G8_quantity_available", nullable = false)
    private Integer quantityAvailable;

    @Column(name = "G8_quantity_sold", nullable = false)
    private Integer quantitySold;

    @Column(name = "G8_is_active")
    private Boolean isActive;

    @PrePersist
    protected void onCreate() {
        if (this.quantitySold == null) {
            this.quantitySold = 0;
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }
}
