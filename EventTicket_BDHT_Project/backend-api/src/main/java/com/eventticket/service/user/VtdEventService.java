package com.eventticket.service.user;

import com.eventticket.entity.G8_event;
import com.eventticket.entity.G8_venue;
import com.eventticket.repository.EventRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class VtdEventService {

    @Autowired
    private EventRepository eventRepository;

    public List<G8_event> getFeaturedEvents() {

        return eventRepository.findTop16ByStatusAndDeletedAtIsNullOrderByEventIdDesc("PUBLISHED");
    }

    /**
     * GUEST: Xem danh sách toàn bộ sự kiện (Hiển thị phân trang)
     */
    public List<G8_event> getAllPublishedEvents() {
        return eventRepository.findByStatus("PUBLISHED");
    }

    /**
     * GUEST: Xem danh sách sự kiện có phân trang.
     */
    public Page<G8_event> getAllPublishedEvents(Pageable pageable) {
        return eventRepository.findByStatus("PUBLISHED", pageable);
    }

    /**
     * GUEST: Tìm kiếm sự kiện (Theo tên sự kiện hoặc tên nghệ sĩ)
     */
    public List<G8_event> searchEventsByTitle(String keyword) {
        return eventRepository.searchByTitleOrArtist(keyword);
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
     * GUEST: Lọc nhanh theo thời gian.
     * upcoming = sắp diễn ra, this-week = trong 7 ngày tới, this-month = trong 1
     * tháng tới.
     */
    public List<G8_event> getEventsByTimeFilter(String filter) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endDate;

        switch (filter == null ? "" : filter.toLowerCase()) {
            case "upcoming":
                endDate = now.plusYears(5);
                break;
            case "this-week":
                endDate = now.plusDays(7);
                break;
            case "this-month":
                endDate = now.plusMonths(1);
                break;
            default:
                throw new RuntimeException("Bộ lọc thời gian không hợp lệ. Dùng: upcoming, this-week, this-month");
        }

        return eventRepository.findEventsByDateRange(now, endDate);
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
     * GUEST: Xem sự kiện mới nhất (Tạo trong 5 ngày gần đây) - THÊM MỚI
     */
    public List<G8_event> getLatestEvents() {
        LocalDateTime fiveDaysAgo = LocalDateTime.now().minusDays(5);
        return eventRepository.findLatestEvents(fiveDaysAgo);
    }

    /**
     * GUEST: Lấy ngẫu nhiên 3 ảnh Banner cho trang chủ - THÊM MỚI
     */
    public List<String> getRandomBanners() {
        // Vẫn dùng stream để shuffle vì SQL Server dùng ORDER BY NEWID() khá chậm với
        // bảng lớn
        List<G8_event> allPublished = eventRepository.findByStatus("PUBLISHED");
        List<String> banners = allPublished.stream()
                .map(G8_event::getBannerImageUrl)
                .filter(url -> url != null && !url.isBlank())
                .collect(Collectors.toList());

        java.util.Collections.shuffle(banners);
        return banners.stream().limit(3).toList();
    }
}
