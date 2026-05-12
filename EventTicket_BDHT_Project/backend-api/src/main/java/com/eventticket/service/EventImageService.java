package com.eventticket.service;

import com.eventticket.entity.G8_event_image;
import com.eventticket.repository.EventImageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EventImageService {

    @Autowired
    private EventImageRepository eventImageRepository;

    /**
     * GUEST: Xem thư viện hình ảnh sự kiện (Event Gallery)
     */
    public List<G8_event_image> getEventImages(Integer eventId) {
        return eventImageRepository.findByEventIdOrderBySortOrder(eventId);
    }

    /**
     * ADMIN: Thêm hình ảnh vào thư viện ảnh sự kiện
     */
    public G8_event_image addEventImage(G8_event_image eventImage) {
        return eventImageRepository.save(eventImage);
    }

    /**
     * ADMIN: Xóa hình ảnh khỏi thư viện ảnh sự kiện
     */
    public void deleteEventImage(Integer imageId) {
        eventImageRepository.deleteById(imageId);
    }

    /**
     * ADMIN: Cập nhật thứ tự sắp xếp ảnh
     */
    public G8_event_image updateImageSortOrder(Integer imageId, Integer sortOrder) {
        G8_event_image image = eventImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Hình ảnh không tồn tại"));

        image.setSortOrder(sortOrder);
        return eventImageRepository.save(image);
    }
}
