package com.eventticket.service.admin;

import com.eventticket.entity.G8_event;
import com.eventticket.entity.G8_venue;
import com.eventticket.repository.EventRepository;
import com.eventticket.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TtbAdminEventService {

    private final EventRepository eventRepository;
    private final VenueRepository venueRepository;

    public List<G8_event> getAllEvents() {
        return eventRepository.findAll();
    }

    public G8_event createEvent(G8_event event, Integer venueId) {
        // Kiểm tra xem địa điểm có tồn tại không trước khi gắn vào sự kiện
        G8_venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa điểm với ID: " + venueId));

        event.setVenue(venue);
        return eventRepository.save(event);
    }

    public G8_event updateEvent(Integer id, G8_event eventDetails, Integer venueId) {
        G8_event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện ID: " + id));

        // Cập nhật các thông tin cơ bản
        event.setTitle(eventDetails.getTitle());
        event.setArtistNames(eventDetails.getArtistNames());
        event.setDescription(eventDetails.getDescription());
        event.setCategoryName(eventDetails.getCategoryName());
        event.setBannerImageUrl(eventDetails.getBannerImageUrl());
        event.setStartTime(eventDetails.getStartTime());
        event.setEndTime(eventDetails.getEndTime());
        event.setStatus(eventDetails.getStatus());

        // Nếu có thay đổi địa điểm
        if (venueId != null) {
            G8_venue venue = venueRepository.findById(venueId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy địa điểm ID: " + venueId));
            event.setVenue(venue);
        }

        return eventRepository.save(event);
    }

    public void deleteEvent(Integer id) {
        G8_event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện ID: " + id));
        // Xóa mềm bằng cách set deletedAt (nếu bạn muốn giữ lại data) hoặc xóa hẳn
        event.setDeletedAt(LocalDateTime.now());
        eventRepository.save(event);
        // Hoặc: eventRepository.delete(event);
    }
}