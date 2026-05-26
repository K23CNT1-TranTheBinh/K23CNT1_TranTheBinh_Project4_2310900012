package com.eventticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "G8_users") // Ánh xạ đúng tên bảng trong SQL Server
@Data // Tự động tạo Getter, Setter, toString, equals, hashCode
@NoArgsConstructor // Tạo constructor không tham số
@AllArgsConstructor // Tạo constructor đầy đủ tham số
public class vtd_G8_users {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_user_id")
    private Integer userId;

    @Column(name = "G8_full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "G8_email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "G8_password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "G8_phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "G8_role", length = 20)
    private String role; // Mặc định 'USER'

    @Column(name = "G8_is_verified")
    private Boolean isVerified;

    @Column(name = "G8_is_active")
    private Boolean isActive;

    @Column(name = "G8_reset_token", length = 255)
    private String resetToken;

    @Column(name = "G8_reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "G8_deleted_at")
    private LocalDateTime deletedAt;

    /**
     * Hàm tự động thiết lập các giá trị mặc định trước khi lưu vào Database
     * Tương ứng với các ràng buộc DEFAULT trong SQL của bạn.
     */
    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.role == null) {
            this.role = "USER";
        }
        if (this.isVerified == null) {
            this.isVerified = false;
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }
}