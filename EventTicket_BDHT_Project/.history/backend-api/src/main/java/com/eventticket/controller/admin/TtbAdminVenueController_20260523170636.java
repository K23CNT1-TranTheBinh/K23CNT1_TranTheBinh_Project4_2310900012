package com.eventticket.controller.admin;

import com.eventticket.entity.G8_venue;
import com.eventticket.service.admin.AdminVenueService; // Hoặc VenueService tùy bạn đặt tên
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lpth/admin/venues")
@RequiredArgsConstructor
public class AdminVenueController {

    private final AdminVenueService adminVenueService;

    /**
     * API: Lấy danh sách kết hợp tìm kiếm và lọc
     * URL ví dụ: 
     * - Lấy tất cả: GET /api/lpth/admin/venues
     * - Tìm theo tên: GET /api/lpth/admin/venues?keyword=Hà Nội
     * - Lọc sức chứa: GET /api/lpth/admin/venues?minCapacity=500&maxCapacity=2000
     * - Kết hợp: GET /api/lpth/admin/venues?keyword=Sân&minCapacity=1000
     */
    @GetMapping
    public ResponseEntity<List<G8_venue>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) Integer maxCapacity) {
        
        // Gọi hàm tìm kiếm động từ Service (Nếu tất cả param là null, nó sẽ tự động trả về toàn bộ danh sách)
        List<G8_venue> venues = adminVenueService.searchAndFilterVenues(keyword, minCapacity, maxCapacity);
        return ResponseEntity.ok(venues);
    }

    /**
     * API: Xem chi tiết 1 địa điểm
     */
    @GetMapping("/{id}")
    public ResponseEntity<G8_venue> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(adminVenueService.getVenueDetails(id));
    }

    /**
     * API: Thêm mới địa điểm
     */
    @PostMapping("/add")
    public ResponseEntity<G8_venue> create(@RequestBody G8_venue venue) {
        return ResponseEntity.ok(adminVenueService.createVenue(venue));
    }

    /**
     * API: Cập nhật thông tin địa điểm
     */
    @PutMapping("/update/{id}")
    public ResponseEntity<G8_venue> update(@PathVariable Integer id, @RequestBody G8_venue venue) {
        return ResponseEntity.ok(adminVenueService.updateVenue(id, venue));
    }

    /**
     * API: Xóa địa điểm
     */
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> delete(@PathVariable Integer id) {
        adminVenueService.deleteVenue(id);
        return ResponseEntity.ok("Xóa địa điểm thành công!");
    }
}