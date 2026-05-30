package com.eventticket.controller.admin;

import com.eventticket.entity.G8_event;
import com.eventticket.service.admin.TtbAdminEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lpth/admin/events")
@RequiredArgsConstructor
public class TtbAdminEventController {

    private final AdminEventService adminEventService;

    @GetMapping
    public ResponseEntity<List<G8_event>> getAll() {
        return ResponseEntity.ok(adminEventService.getAllEvents());
    }

    // Khi tạo event, mình truyền thêm venueId qua Parameter để dễ xử lý
    @PostMapping("/add")
    public ResponseEntity<G8_event> create(@RequestBody G8_event event, @RequestParam Integer venueId) {
        return ResponseEntity.ok(adminEventService.createEvent(event, venueId));
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<G8_event> update(
            @PathVariable Integer id,
            @RequestBody G8_event event,
            @RequestParam(required = false) Integer venueId) {
        return ResponseEntity.ok(adminEventService.updateEvent(id, event, venueId));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> delete(@PathVariable Integer id) {
        adminEventService.deleteEvent(id);
        return ResponseEntity.ok("Đã đánh dấu xóa sự kiện!");
    }
}