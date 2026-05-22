package com.eventticket.service.admin;

import com.eventticket.entity.G8_venue;
import com.eventticket.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminVenueService {

    private final VenueRepository venueRepository;

    /**
     * 1. HÀM MỚI: Tìm kiếm và lọc danh sách địa điểm (Khớp với Controller)
     * Sử dụng Java Stream API để lọc động các điều kiện.
     */
    public List<G8_venue> searchAndFilterVenues(String keyword, Integer minCapacity, Integer maxCapacity) {
        List<G8_venue> allVenues = venueRepository.findAll();

        return allVenues.stream()
                .filter(venue -> {
                    // Lọc theo tên (Nếu keyword null hoặc rỗng thì bỏ qua điều kiện này)
                    boolean matchKeyword = (keyword == null || keyword.trim().isEmpty()) ||
                            (venue.getVenueName() != null && venue.getVenueName().toLowerCase().contains(keyword.toLowerCase()));
                    
                    // Lọc theo sức chứa tối thiểu
                    boolean matchMin = (minCapacity == null) || 
                            (venue.getCapacity() != null && venue.getCapacity() >= minCapacity);
                    
                    // Lọc theo sức chứa tối đa
                    boolean matchMax = (maxCapacity == null) || 
                            (venue.getCapacity() != null && venue.getCapacity() <= maxCapacity);

                    // Phải thỏa mãn tất cả các điều kiện đang có
                    return matchKeyword && matchMin && matchMax;
                })
                .collect(Collectors.toList());
    }

    /**
     * 2. ĐÃ ĐỔI TÊN: getVenueById -> getVenueDetails (Khớp với Controller)
     */
    public G8_venue getVenueDetails(Integer id) {
        return venueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa điểm với ID: " + id));
    }

    // Thêm mới địa điểm
    public G8_venue createVenue(G8_venue venue) {
        return venueRepository.save(venue);
    }

    // Cập nhật địa điểm
    public G8_venue updateVenue(Integer id, G8_venue venueDetails) {
        // Đã cập nhật gọi hàm getVenueDetails
        G8_venue venue = getVenueDetails(id); 
        
        venue.setVenueName(venueDetails.getVenueName()); 
        venue.setAddress(venueDetails.getAddress());
        venue.setCapacity(venueDetails.getCapacity());
        
        return venueRepository.save(venue);
    }

    // Xóa địa điểm
    public void deleteVenue(Integer id) {
        // Đã cập nhật gọi hàm getVenueDetails
        G8_venue venue = getVenueDetails(id); 
        venueRepository.delete(venue);
    }
    
    // Lấy toàn bộ danh sách địa điểm (Dự phòng nếu cần dùng)
    public List<G8_venue> getAllVenues() {
        return venueRepository.findAll();
    }
}