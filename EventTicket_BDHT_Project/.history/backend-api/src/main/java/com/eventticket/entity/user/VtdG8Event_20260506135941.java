package com.eventticket.entity.user;

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
public class VtdG8Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_event_id")
    private Integer eventId;

    @Column(name = "G8_event_name", nullable = false, length = 200)
    private String eventName;

    @Column(name = "G8_description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "G8_location", nullable = false, length = 255)
    private String location;

    @Column(name = "G8_event_date", nullable = false)
    private LocalDateTime eventDate;

    @Column(name = "G8_event_end_date")
    private LocalDateTime eventEndDate;

    @Column(name = "G8_total_capacity", nullable = false)
    private Integer totalCapacity;

    @Column(name = "G8_available_seats", nullable = false)
    private Integer availableSeats;

    @Column(name = "G8_status", length = 20)
    private String status; // UPCOMING, ONGOING, COMPLETED, CANCELLED

    @Column(name = "G8_image_url", length = 500)
    private String imageUrl;

    @Column(name = "G8_created_by")
    private Integer createdBy;

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "G8_updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "UPCOMING";
        }
        if (this.availableSeats == null && this.totalCapacity != null) {
            this.availableSeats = this.totalCapacity;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
