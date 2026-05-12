package com.eventticket.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "events")
@Data
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    private String venue;

    private LocalDateTime date;

    private String category;

    private String imageUrl;

    private BigDecimal minPrice;

    private LocalDateTime createdAt = LocalDateTime.now();

    // TODO: Add ticketTypes, reviews relationships
}
