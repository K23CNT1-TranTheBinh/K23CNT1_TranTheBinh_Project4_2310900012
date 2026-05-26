package com.eventticket.entity.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "G8_reviews", uniqueConstraints = @UniqueConstraint(columnNames = { "G8_user_id",
        "G8_event_id" }, name = "UQ_user_event_review"))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Vtd_G_review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_review_id")
    private Integer reviewId;

    @ManyToOne
    @JoinColumn(name = "G8_user_id", nullable = false)
    private Vtd_G8_users user;

    @ManyToOne
    @JoinColumn(name = "G8_event_id", nullable = false)
    private Vtd_G8_event event; // Reference từ bảng G8_events

    @Column(name = "G8_rating", nullable = false)
    private Integer rating; // 1-5 sao

    @Column(name = "G8_comment", columnDefinition = "NVARCHAR(MAX)")
    private String comment;

    @Column(name = "G8_is_hidden")
    private Boolean isHidden;

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "G8_updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.isHidden == null) {
            this.isHidden = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
