package com.eventticket.service;

import com.eventticket.entity.G8_event;
import com.eventticket.entity.G8_venue;
import com.eventticket.repository.EventRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EventService {

    @Autowired
    private EventRepository eventRepository;

    /**
     * GUEST: Xem trang chủ (Hiển thị Banner và Slider sự kiện nổi bật)
     */
    public List<G8_event> getFeaturedEvents() {
        return eventRepository.findUpcomingEvents();
    }

    /**
     * GUEST: Xem danh sách toàn bộ sự kiện (Hiển thị phân trang)
     */
    public List<G8_event> getAllPublishedEvents() {
        return eventRepository.findByStatus("PUBLISHED");
    }

    /**
     * GUEST: Tìm kiếm sự kiện (Theo tên sự kiện hoặc tên nghệ sĩ)
     */
    public List<G8_event> searchEventsByTitle(String keyword) {
        return eventRepository.searchByTitle(keyword);
    }

    /**
     * GUEST: Lọc sự kiện (Theo danh mục)
     */
    public List<G8_event> filterEventsByCategory(String categoryName) {
        // Lọc bằng cách tìm tất cả và filter by categoryName
        List<G8_event> allEvents = eventRepository.findByStatus("PUBLISHED");
        return allEvents.stream()
                .filter(e -> e.getCategoryName() != null && e.getCategoryName().equals(categoryName))
                .toList();
    }

    /**
     * GUEST: Lọc sự kiện theo thời gian (Sắp diễn ra, Trong tuần, Trong tháng)
     */
    public List<G8_event> getEventsInTimeRange(LocalDateTime startDate, LocalDateTime endDate) {
        return eventRepository.findEventsByDateRange(startDate, endDate);
    }

    /**
     * GUEST: Xem chi tiết thông tin sự kiện
     */
    public G8_event getEventDetails(Integer eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));
    }

    /**
     * GUEST: Xem chi tiết địa điểm tổ chức
     */
    public G8_venue getEventVenue(Integer eventId) {
        G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));
        return event.getVenue();
    }

    /**
     * ADMIN: Xem danh sách sự kiện nội bộ (Tất cả trạng thái)
     */
    public List<G8_event> getAllEventsForAdmin() {
        return eventRepository.findAll();
    }

    /**
     * ADMIN: Tìm kiếm sự kiện trong hệ thống Admin
     */
    public List<G8_event> searchEventsForAdmin(String keyword) {
        return eventRepository.searchByTitle(keyword);
    }

    /**
     * ADMIN: Lọc sự kiện (Theo trạng thái)
     */
    public List<G8_event> getEventsByStatus(String status) {
        return eventRepository.findByStatus(status);
    }

    /**
     * ADMIN: Thêm mới sự kiện
     */
    public G8_event createEvent(G8_event event) {
        if (event.getStatus() == null) {
            event.setStatus("DRAFT");
        }
        return eventRepository.save(event);
    }

    /**
     * ADMIN: Cập nhật thông tin sự kiện
     */
    public G8_event updateEvent(Integer eventId, G8_event eventDetails) {
        G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));

        if (eventDetails.getTitle() != null)
            event.setTitle(eventDetails.getTitle());

        if (eventDetails.getArtistNames() != null)
            event.setArtistNames(eventDetails.getArtistNames());

        if (eventDetails.getDescription() != null)
            event.setDescription(eventDetails.getDescription());

        if (eventDetails.getCategoryName() != null)
            event.setCategoryName(eventDetails.getCategoryName());

        if (eventDetails.getBannerImageUrl() != null)
            event.setBannerImageUrl(eventDetails.getBannerImageUrl());

        if (eventDetails.getStartTime() != null)
            event.setStartTime(eventDetails.getStartTime());

        if (eventDetails.getEndTime() != null)
            event.setEndTime(eventDetails.getEndTime());

        if (eventDetails.getVenue() != null)
            event.setVenue(eventDetails.getVenue());

        return eventRepository.save(event);
    }

    /**
     * ADMIN: Cập nhật trạng thái sự kiện
     */
    public G8_event updateEventStatus(Integer eventId, String status) {
        G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));

        event.setStatus(status);
        return eventRepository.save(event);
    }

    /**
     * ADMIN: Xóa sự kiện (Xóa mềm)
     */
    public void deleteEvent(Integer eventId) {
        G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));

        event.setDeletedAt(LocalDateTime.now());
        eventRepository.save(event);
    }
}
