package com.eventticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "G8_ai_chat_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class G8_AiChatLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_log_id")
    private Integer logId;

    @ManyToOne
    @JoinColumn(name = "G8_user_id")
    private G8_users user; // Nullable: cho phép khách vãng lai

    @Column(name = "G8_session_code", nullable = false, length = 100)
    private String sessionCode; // Mã phiên để gom nhóm hội thoại

    @Column(name = "G8_sender", nullable = false, length = 20)
    private String sender; // USER hoặc AI

    @Column(name = "G8_message_text", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String messageText;

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

}
