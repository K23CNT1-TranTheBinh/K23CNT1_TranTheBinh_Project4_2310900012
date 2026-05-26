package com.eventticket.service;

import com.eventticket.entity.user.Vtd_G8_venue;
import com.eventticket.repository.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VenueService {
    
    @Autowired
    private VenueRepository venueRepository;
    
    /**
     * GUEST: Xem chi tiết địa điểm tổ chức (Bản đồ/Địa chỉ, Sức chứa)
     */
    public Vtd_G8_venue getVenueDetails(Integer venueId) {
        return venueRepository.findById(venueId)
                .orElseThrow(() -> new RuntimeException("Địa điểm không tồn tại"));
    }
    
    /**
     * ADMIN: Xem danh sách địa điểm tổ chức
     */
    public List<Vtd_G8_venue> getAllVenues() {
        return venueRepository.findAll();
    }
    
    /**
     * ADMIN: Tìm kiếm địa điểm (Theo tên, địa chỉ)
     */
    public List<Vtd_G8_venue> searchVenues(String keyword) {
        return venueRepository.searchByName(keyword);
    }
    
    /**
     * ADMIN: Filter địa điểm theo sức chứa tối thiểu
     */
    public List<Vtd_G8_venue> findVenuesByMinCapacity(Integer minCapacity) {
        return venueRepository.findByMinCapacity(minCapacity);
    }
    
    /**
     * ADMIN: Thêm mới địa điểm
     */
    public Vtd_G8_venue createVenue(Vtd_G8_venue venue) {
        return venueRepository.save(venue);
    }
    
    /**
     * ADMIN: Cập nhật thông tin địa điểm
     */
    public Vtd_G8_venue updateVenue(Integer venueId, Vtd_G8_venue venueDetails) {
        Vtd_G8_venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new RuntimeException("Địa điểm không tồn tại"));
        
        if (venueDetails.getVenueName() != null) venue.setVenueName(venueDetails.getVenueName());
        if (venueDetails.getAddress() != null) venue.setAddress(venueDetails.getAddress());
        if (venueDetails.getCapacity() != null) venue.setCapacity(venueDetails.getCapacity());
        
        return venueRepository.save(venue);
    }
    
    /**
     * ADMIN: Xóa địa điểm
     */
    public void deleteVenue(Integer venueId) {
        venueRepository.deleteById(venueId);
    }
}
