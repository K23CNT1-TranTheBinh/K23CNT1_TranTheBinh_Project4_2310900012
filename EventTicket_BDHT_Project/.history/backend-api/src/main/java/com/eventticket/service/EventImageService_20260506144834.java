package com.eventticket.service;

import com.eventticket.entity.user.VtdG8EventImage;
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
    public List<VtdG8EventImage> getEventImages(Integer eventId) {
        return eventImageRepository.findByEventIdOrderBySortOrder(eventId);
    }
    
    /**
     * ADMIN: Thêm hình ảnh vào thư viện ảnh sự kiện
     */
    public VtdG8EventImage addEventImage(VtdG8EventImage eventImage) {
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
    public VtdG8EventImage updateImageSortOrder(Integer imageId, Integer sortOrder) {
        VtdG8EventImage image = eventImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Hình ảnh không tồn tại"));
        
        image.setSortOrder(sortOrder);
        return eventImageRepository.save(image);
    }
}
