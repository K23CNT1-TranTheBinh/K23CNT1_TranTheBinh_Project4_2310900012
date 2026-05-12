package com.eventticket.entity;

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
public class G8_ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_ticket_id")
    private Integer ticketId;

    @ManyToOne
    @JoinColumn(name = "G8_order_id", nullable = false)
    private G8_order order;

    @ManyToOne
    @JoinColumn(name = "G8_ticket_type_id", nullable = false)
    private G8_ticketType ticketType;

    @Column(name = "G8_qr_code", unique = true, nullable = false, length = 255)
    private String qrCode; // Chuỗi ngẫu nhiên bảo mật để sinh QR Code

    @Column(name = "G8_check_in_status")
    private Boolean checkInStatus; // 0 = Chưa dùng, 1 = Đã quét mã (Không cho quét lại)

    @Column(name = "G8_checked_in_at")
    private LocalDateTime checkedInAt; // Thời điểm quét mã QR

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.checkInStatus == null) {
            this.checkInStatus = false;
        }
    }
}
