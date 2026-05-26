package com.eventticket.service;

import com.eventticket.entity.user.Vtd_G8_event;
import com.eventticket.repository.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class EventService {
    
    @Autowired
    private EventRepository eventRepository;
    
    /**
     * GUEST: Xem trang chủ (Hiển thị Banner và Slider sự kiện nổi bật)
     */
    public List<Vtd_G8_event> getFeaturedEvents() {
        return eventRepository.findUpcomingEvents();
    }
    
    /**
     * GUEST: Xem danh sách toàn bộ sự kiện (Hiển thị phân trang)
     */
    public List<Vtd_G8_event> getAllPublishedEvents() {
        return eventRepository.findByStatus("PUBLISHED");
    }
    
    /**
     * GUEST: Tìm kiếm sự kiện (Theo tên sự kiện hoặc tên nghệ sĩ)
     */
    public List<Vtd_G8_event> searchEventsByTitle(String keyword) {
        return eventRepository.searchByTitle(keyword);
    }
    
    /**
     * GUEST: Lọc sự kiện (Theo danh mục)
     */
    public List<Vtd_G8_event> filterEventsByCategory(String categoryName) {
        // TODO: Implement category filter (có thể cần thêm field hoặc query)
        return eventRepository.findAll();
    }
    
    /**
     * GUEST: Lọc sự kiện theo thời gian (Sắp diễn ra, Trong tuần, Trong tháng)
     */
    public List<Vtd_G8_event> getEventsInTimeRange(LocalDateTime startDate, LocalDateTime endDate) {
        return eventRepository.findEventsByDateRange(startDate, endDate);
    }
    
    /**
     * GUEST: Xem chi tiết thông tin sự kiện
     */
    public Vtd_G8_event getEventDetails(Integer eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));
    }
    
    /**
     * ADMIN: Xem danh sách sự kiện nội bộ (Tất cả trạng thái)
     */
    public List<Vtd_G8_event> getAllEventsForAdmin() {
        return eventRepository.findAll();
    }
    
    /**
     * ADMIN: Tìm kiếm sự kiện trong hệ thống Admin
     */
    public List<Vtd_G8_event> searchEventsForAdmin(String keyword) {
        return eventRepository.searchByTitle(keyword);
    }
    
    /**
     * ADMIN: Lọc sự kiện (Theo trạng thái)
     */
    public List<Vtd_G8_event> getEventsByStatus(String status) {
        return eventRepository.findByStatus(status);
    }
    
    /**
     * ADMIN: Thêm mới sự kiện
     */
    public Vtd_G8_event createEvent(Vtd_G8_event event) {
        if (event.getStatus() == null) {
            event.setStatus("DRAFT");
        }
        return eventRepository.save(event);
    }
    
    /**
     * ADMIN: Cập nhật thông tin sự kiện
     */
    public Vtd_G8_event updateEvent(Integer eventId, Vtd_G8_event eventDetails) {
        Vtd_G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));
        
        if (eventDetails.getTitle() != null) event.setTitle(eventDetails.getTitle());
        if (eventDetails.getDescription() != null) event.setDescription(eventDetails.getDescription());
        if (eventDetails.getEventDate() != null) event.setEventDate(eventDetails.getEventDate());
        if (eventDetails.getEventEndDate() != null) event.setEventEndDate(eventDetails.getEventEndDate());
        if (eventDetails.getVenueId() != null) event.setVenueId(eventDetails.getVenueId());
        if (eventDetails.getCategoryName() != null) event.setCategoryName(eventDetails.getCategoryName());
        
        return eventRepository.save(event);
    }
    
    /**
     * ADMIN: Cập nhật trạng thái sự kiện
     */
    public Vtd_G8_event updateEventStatus(Integer eventId, String status) {
        Vtd_G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));
        
        event.setStatus(status);
        return eventRepository.save(event);
    }
    
    /**
     * ADMIN: Xóa sự kiện (Xóa mềm)
     */
    public void softDeleteEvent(Integer eventId) {
        Vtd_G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));
        
        event.setDeletedAt(LocalDateTime.now());
        eventRepository.save(event);
    }
}
