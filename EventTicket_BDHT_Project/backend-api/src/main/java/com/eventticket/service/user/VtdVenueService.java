package com.eventticket.service.user;

import com.eventticket.entity.G8_venue;
import com.eventticket.repository.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VtdVenueService {

    @Autowired
    private VenueRepository venueRepository;

    /**
     * GUEST: Xem chi tiết địa điểm tổ chức (Bản đồ/Địa chỉ, Sức chứa)
     */
    public G8_venue getVenueDetails(Integer venueId) {
        return venueRepository.findById(venueId)
                .orElseThrow(() -> new RuntimeException("Địa điểm không tồn tại"));
    }

    /**
     * người dùng: Tìm kiếm địa điểm (Theo tên, địa chỉ)
     */
    public List<G8_venue> searchVenues(String keyword) {
        return venueRepository.searchByName(keyword);
    }

    /**
     * Người dùng: Filter địa điểm theo sức chứa tối thiểu
     */
    public List<G8_venue> findVenuesByMinCapacity(Integer minCapacity) {
        return venueRepository.findByMinCapacity(minCapacity);
    }

}
