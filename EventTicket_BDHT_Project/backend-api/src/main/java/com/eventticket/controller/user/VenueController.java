package com.eventticket.controller.user;

import com.eventticket.entity.G8_venue;
import com.eventticket.service.VenueService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class VenueController {

    private final VenueService venueService;

    public VenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    /**
     * GUEST: Xem chi tiết địa điểm tổ chức (bản đồ, địa chỉ, sức chứa)
     */
    @GetMapping("/api/ttb/public/venues/{venueId}")
    public ResponseEntity<G8_venue> getVenueDetails(@PathVariable Integer venueId) {
        G8_venue venue = venueService.getVenueDetails(venueId);
        return ResponseEntity.ok(venue);
    }

    /**
     * GUEST: Tìm kiếm địa điểm theo tên hoặc địa chỉ
     */
    @GetMapping("/api/ttb/public/venues/search")
    public ResponseEntity<List<G8_venue>> searchVenues(@RequestParam String keyword) {
        List<G8_venue> venues = venueService.searchVenues(keyword);
        return ResponseEntity.ok(venues);
    }

    /**
     * GUEST: Lọc địa điểm theo sức chứa tối thiểu
     */
    @GetMapping("/api/ttb/public/venues/by-capacity")
    public ResponseEntity<List<G8_venue>> findVenuesByCapacity(@RequestParam Integer minCapacity) {
        List<G8_venue> venues = venueService.findVenuesByMinCapacity(minCapacity);
        return ResponseEntity.ok(venues);
    }
}
