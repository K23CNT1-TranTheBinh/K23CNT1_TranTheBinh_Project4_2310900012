package com.eventticket.controller.user;

import com.eventticket.entity.G8_event;
import com.eventticket.entity.G8_event_image;
import com.eventticket.entity.G8_venue;
import com.eventticket.service.user.VtdEventImageService;
import com.eventticket.service.user.VtdEventService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
public class VtdEventController {

    private final VtdEventService eventService;
    private final VtdEventImageService eventImageService;

    public VtdEventController(VtdEventService eventService, VtdEventImageService eventImageService) {
        this.eventService = eventService;
        this.eventImageService = eventImageService;
    }

    /**
     * GUEST: Lấy các sự kiện nổi bật cho trang chủ
     */
    @GetMapping("/api/vtd/public/events/featured")
    public ResponseEntity<List<G8_event>> getFeaturedEvents() {
        List<G8_event> events = eventService.getFeaturedEvents();
        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Lấy danh sách toàn bộ sự kiện đã công bố
     */
    @GetMapping("/api/vtd/public/events")
    public ResponseEntity<Page<G8_event>> getAllPublishedEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        // GUEST: Phân trang danh sách sự kiện. page bắt đầu từ 0.
        Pageable pageable = PageRequest.of(page, size);
        Page<G8_event> events = eventService.getAllPublishedEvents(pageable);
        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Tìm kiếm sự kiện theo tên hoặc tên nghệ sĩ
     */
    @GetMapping("/api/vtd/public/events/search")
    public ResponseEntity<List<G8_event>> searchEvents(@RequestParam String keyword) {
        List<G8_event> events = eventService.searchEventsByTitle(keyword);
        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Lọc sự kiện theo danh mục
     */
    @GetMapping("/api/vtd/public/events/category/{categoryName}")
    public ResponseEntity<List<G8_event>> filterEventsByCategory(@PathVariable String categoryName) {
        List<G8_event> events = eventService.filterEventsByCategory(categoryName);
        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Lọc sự kiện theo khoảng thời gian
     */
    @GetMapping("/api/vtd/public/events/date-range")
    public ResponseEntity<List<G8_event>> getEventsInTimeRange(
            @RequestParam LocalDateTime startDate,
            @RequestParam LocalDateTime endDate) {
        List<G8_event> events = eventService.getEventsInTimeRange(startDate, endDate);
        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Lọc nhanh theo thời gian.
     * filter = upcoming | this-week | this-month
     */
    @GetMapping("/api/vtd/public/events/time-filter")
    public ResponseEntity<List<G8_event>> getEventsByTimeFilter(@RequestParam String filter) {
        List<G8_event> events = eventService.getEventsByTimeFilter(filter);
        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Xem chi tiết sự kiện
     */
    @GetMapping("/api/vtd/public/events/{eventId}")
    public ResponseEntity<G8_event> getEventDetails(@PathVariable Integer eventId) {
        G8_event event = eventService.getEventDetails(eventId);
        return ResponseEntity.ok(event);
    }

    /**
     * GUEST: Xem chi tiết địa điểm tổ chức
     */
    @GetMapping("/api/vtd/public/events/{eventId}/venue")
    public ResponseEntity<G8_venue> getEventVenue(@PathVariable Integer eventId) {
        G8_venue venue = eventService.getEventVenue(eventId);
        return ResponseEntity.ok(venue);
    }

    /**
     * GUEST: Xem hình ảnh sự kiện
     */
    @GetMapping("/api/vtd/public/events/{eventId}/images")
    public ResponseEntity<List<G8_event_image>> getEventImages(@PathVariable Integer eventId) {
        List<G8_event_image> images = eventImageService.getEventImages(eventId);
        return ResponseEntity.ok(images);
    }
}
