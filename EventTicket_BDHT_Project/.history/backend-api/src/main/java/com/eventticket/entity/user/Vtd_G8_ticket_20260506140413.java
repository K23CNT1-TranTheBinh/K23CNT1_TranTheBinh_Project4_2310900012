package com.eventticket.entity.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "G8_tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Vtd_G8_ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_ticket_id")
    private Integer ticketId;

    @ManyToOne
    @JoinColumn(name = "G8_order_id", nullable = false)
    private VtdG8Order order;

    @ManyToOne
    @JoinColumn(name = "G8_ticket_type_id", nullable = false)
    private Vtd_G8_ticketType ticketType;

    @Column(name = "G8_ticket_code", unique = true, nullable = false, length = 50)
    private String ticketCode;

    @Column(name = "G8_qr_code", columnDefinition = "NVARCHAR(MAX)")
    private String qrCode;

    @Column(name = "G8_status", length = 20)
    private String status; // VALID, USED, CANCELLED

    @Column(name = "G8_used_at")
    private LocalDateTime usedAt;

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "VALID";
        }
    }
}
