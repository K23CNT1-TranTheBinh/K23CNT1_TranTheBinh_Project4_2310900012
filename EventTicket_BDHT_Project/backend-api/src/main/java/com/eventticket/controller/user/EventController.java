package com.eventticket.controller.user;

import com.eventticket.entity.G8_event;
import com.eventticket.entity.G8_event_image;
import com.eventticket.entity.G8_venue;
import com.eventticket.service.EventImageService;
import com.eventticket.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
public class EventController {

    private final EventService eventService;
    private final EventImageService eventImageService;

    public EventController(EventService eventService, EventImageService eventImageService) {
        this.eventService = eventService;
        this.eventImageService = eventImageService;
    }

    /**
     * GUEST: Lấy các sự kiện nổi bật cho trang chủ
     */
    @GetMapping("/api/ttb/public/events/featured")
    public ResponseEntity<List<G8_event>> getFeaturedEvents() {
        List<G8_event> events = eventService.getFeaturedEvents();
        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Lấy danh sách toàn bộ sự kiện đã công bố
     */
    @GetMapping("/api/ttb/public/events")
    public ResponseEntity<List<G8_event>> getAllPublishedEvents() {
        List<G8_event> events = eventService.getAllPublishedEvents();
        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Tìm kiếm sự kiện theo tên hoặc tên nghệ sĩ
     */
    @GetMapping("/api/ttb/public/events/search")
    public ResponseEntity<List<G8_event>> searchEvents(@RequestParam String keyword) {
        List<G8_event> events = eventService.searchEventsByTitle(keyword);
        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Lọc sự kiện theo danh mục
     */
    @GetMapping("/api/ttb/public/events/category/{categoryName}")
    public ResponseEntity<List<G8_event>> filterEventsByCategory(@PathVariable String categoryName) {
        List<G8_event> events = eventService.filterEventsByCategory(categoryName);
        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Lọc sự kiện theo khoảng thời gian
     */
    @GetMapping("/api/ttb/public/events/date-range")
    public ResponseEntity<List<G8_event>> getEventsInTimeRange(
            @RequestParam LocalDateTime startDate,
            @RequestParam LocalDateTime endDate) {

        List<G8_event> events =
                eventService.getEventsInTimeRange(startDate, endDate);

        return ResponseEntity.ok(events);
    }

    /**
     * GUEST: Xem chi tiết sự kiện
     */
    @GetMapping("/api/ttb/public/events/{eventId}")
    public ResponseEntity<G8_event> getEventDetails(
            @PathVariable Integer eventId) {

        G8_event event = eventService.getEventDetails(eventId);

        return ResponseEntity.ok(event);
    }

    /**
     * GUEST: Xem chi tiết địa điểm tổ chức
     */
    @GetMapping("/api/ttb/public/events/{eventId}/venue")
    public ResponseEntity<G8_venue> getEventVenue(
            @PathVariable Integer eventId) {

        G8_venue venue = eventService.getEventVenue(eventId);

        return ResponseEntity.ok(venue);
    }

    /**
     * GUEST: Xem hình ảnh sự kiện
     */
    @GetMapping("/api/ttb/public/events/{eventId}/images")
    public ResponseEntity<List<G8_event_image>> getEventImages(
            @PathVariable Integer eventId) {

        List<G8_event_image> images =
                eventImageService.getEventImages(eventId);

        return ResponseEntity.ok(images);
    }
}