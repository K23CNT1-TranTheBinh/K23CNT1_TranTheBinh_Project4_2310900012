package com.eventticket.entity.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "G8_venues")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class G8_venue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "G8_venue_id")
    private Integer venueId;

    @Column(name = "G8_venue_name", nullable = false, length = 200)
    private String venueName;

    @Column(name = "G8_address", nullable = false, columnDefinition = "NVARCHAR(500)")
    private String address;

    @Column(name = "G8_capacity", nullable = false)
    private Integer capacity;

    @Column(name = "G8_created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
