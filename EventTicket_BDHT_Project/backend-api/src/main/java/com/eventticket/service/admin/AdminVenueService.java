package com.eventticket.service.admin;

import com.eventticket.entity.G8_venue;
import com.eventticket.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminVenueService {

    private final VenueRepository venueRepository;

    // Lấy toàn bộ danh sách địa điểm
    public List<G8_venue> getAllVenues() {
        return venueRepository.findAll();
    }

    // Thêm mới địa điểm
    public G8_venue createVenue(G8_venue venue) {
        return venueRepository.save(venue);
    }

    // Lấy chi tiết địa điểm theo ID (Sử dụng venueId khớp với Entity)
    public G8_venue getVenueById(Integer id) {
        return venueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa điểm với ID: " + id));
    }

    // Cập nhật địa điểm (Khớp đúng tên biến venueName)
    public G8_venue updateVenue(Integer id, G8_venue venueDetails) {
        G8_venue venue = getVenueById(id);
        
        venue.setVenueName(venueDetails.getVenueName()); // Khớp venueName
        venue.setAddress(venueDetails.getAddress());
        venue.setCapacity(venueDetails.getCapacity());
        
        return venueRepository.save(venue);
    }

    // Xóa địa điểm
    public void deleteVenue(Integer id) {
        G8_venue venue = getVenueById(id);
        venueRepository.delete(venue);
    }
}