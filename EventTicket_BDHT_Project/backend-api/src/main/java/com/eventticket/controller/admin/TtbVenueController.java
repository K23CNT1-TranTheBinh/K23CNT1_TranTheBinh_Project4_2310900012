package com.eventticket.controller.admin;

import com.eventticket.entity.G8_venue;
import com.eventticket.service.admin.TtbVenueService; // Hoặc VenueService tùy bạn đặt tên
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ttb/venues")
@RequiredArgsConstructor
public class TtbVenueController {

    private final TtbVenueService ttbVenueService;

    /**
     * API: Lấy danh sách kết hợp tìm kiếm và lọc
     * URL ví dụ: 
     * - Lấy tất cả: GET /api/ttb/venues
     * - Tìm theo tên: GET /api/ttb/venues?keyword=Hà Nội
     * - Lọc sức chứa: GET /api/ttb/venues?minCapacity=500&maxCapacity=2000
     * - Kết hợp: GET /api/ttb/venues?keyword=Sân&minCapacity=1000
     */
    @GetMapping
    public ResponseEntity<List<G8_venue>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) Integer maxCapacity) {
        
        // Gọi hàm tìm kiếm động từ Service (Nếu tất cả param là null, nó sẽ tự động trả về toàn bộ danh sách)
        List<G8_venue> venues = ttbVenueService.searchAndFilterVenues(keyword, minCapacity, maxCapacity);
        return ResponseEntity.ok(venues);
    }

    /**
     * API: Xem chi tiết 1 địa điểm
     */
    @GetMapping("/{id}")
    public ResponseEntity<G8_venue> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(ttbVenueService.getVenueDetails(id));
    }

    /**
     * API: Thêm mới địa điểm
     */
    @PostMapping("/add")
    public ResponseEntity<G8_venue> create(@RequestBody G8_venue venue) {
        return ResponseEntity.ok(ttbVenueService.createVenue(venue));
    }

    /**
     * API: Cập nhật thông tin địa điểm
     */
    @PutMapping("/update/{id}")
    public ResponseEntity<G8_venue> update(@PathVariable Integer id, @RequestBody G8_venue venue) {
        return ResponseEntity.ok(ttbVenueService.updateVenue(id, venue));
    }

    /**
     * API: Xóa địa điểm
     */
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> delete(@PathVariable Integer id) {
        ttbVenueService.deleteVenue(id);
        return ResponseEntity.ok("Xóa địa điểm thành công!");
    }
}