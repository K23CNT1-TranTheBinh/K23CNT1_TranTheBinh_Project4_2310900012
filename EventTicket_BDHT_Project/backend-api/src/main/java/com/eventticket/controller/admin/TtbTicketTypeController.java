package com.eventticket.controller.admin;

import com.eventticket.entity.G8_ticketType;
import com.eventticket.service.admin.TtbTicketTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ttb/ticket-types")
@RequiredArgsConstructor
public class TtbTicketTypeController {

    private final TtbTicketTypeService ttbTicketTypeService;

    // Lấy danh sách loại vé theo sự kiện (Ví dụ: /api/admin/ticket-types/event/1)
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<G8_ticketType>> getByEvent(@PathVariable Integer eventId) {
        return ResponseEntity.ok(ttbTicketTypeService.getTicketTypesByEvent(eventId));
    }

    // Thêm loại vé mới (Ví dụ: /api/ttb/ticket-types/add?eventId=1)
    @PostMapping("/add")
    public ResponseEntity<G8_ticketType> create(@RequestBody G8_ticketType type, @RequestParam Integer eventId) {
        return ResponseEntity.ok(ttbTicketTypeService.createTicketType(type, eventId));
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<G8_ticketType> update(@PathVariable Integer id, @RequestBody G8_ticketType type) {
        return ResponseEntity.ok(ttbTicketTypeService.updateTicketType(id, type));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> delete(@PathVariable Integer id) {
        ttbTicketTypeService.deleteTicketType(id);
        return ResponseEntity.ok("Xóa loại vé thành công!");
    }
}