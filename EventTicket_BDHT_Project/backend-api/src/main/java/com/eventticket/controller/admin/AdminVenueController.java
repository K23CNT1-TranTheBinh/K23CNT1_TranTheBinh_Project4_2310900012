package com.eventticket.controller.admin;

import com.eventticket.entity.G8_venue;
import com.eventticket.service.admin.AdminVenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/venues")
@RequiredArgsConstructor
public class AdminVenueController {

    private final AdminVenueService adminVenueService;

    @GetMapping
    public ResponseEntity<List<G8_venue>> getAll() {
        return ResponseEntity.ok(adminVenueService.getAllVenues());
    }

    @PostMapping("/add")
    public ResponseEntity<G8_venue> create(@RequestBody G8_venue venue) {
        return ResponseEntity.ok(adminVenueService.createVenue(venue));
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<G8_venue> update(@PathVariable Integer id, @RequestBody G8_venue venue) {
        return ResponseEntity.ok(adminVenueService.updateVenue(id, venue));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> delete(@PathVariable Integer id) {
        adminVenueService.deleteVenue(id);
        return ResponseEntity.ok("Xóa địa điểm thành công!");
    }
}