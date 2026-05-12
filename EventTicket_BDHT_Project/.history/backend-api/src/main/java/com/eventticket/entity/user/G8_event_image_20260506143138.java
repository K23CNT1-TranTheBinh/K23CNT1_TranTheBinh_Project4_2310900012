package com.eventticket.entity.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "G8_event_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class G8_event_image {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_image_id")
    private Integer imageId;

    @ManyToOne
    @JoinColumn(name = "G8_event_id", nullable = false)
    private G8_event event;

    @Column(name = "G8_image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "G8_sort_order")
    private Integer sortOrder;

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
    }
}
