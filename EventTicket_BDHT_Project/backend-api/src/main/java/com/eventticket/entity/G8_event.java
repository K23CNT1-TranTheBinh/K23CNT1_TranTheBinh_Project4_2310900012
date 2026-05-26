package com.eventticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "G8_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class G8_event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_event_id")
    private Integer eventId;

    @ManyToOne
    @JoinColumn(name = "G8_venue_id", nullable = false)
    private G8_venue venue;

    @Column(name = "G8_title", nullable = false, length = 255)
    private String title;

    @Column(name = "G8_artist_names", length = 500)
    private String artistNames;

    @Column(name = "G8_description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "G8_category_name", length = 100)
    private String categoryName;

    @Column(name = "G8_banner_image_url", length = 500)
    private String bannerImageUrl;

    @Column(name = "G8_start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "G8_end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "G8_status", length = 50)
    private String status; // DRAFT, PUBLISHED, CANCELLED

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "G8_deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "DRAFT";
        }
    }

}
