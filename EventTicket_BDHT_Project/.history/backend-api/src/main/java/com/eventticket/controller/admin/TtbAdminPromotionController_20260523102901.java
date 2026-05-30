package com.eventticket.controller.admin;

import com.eventticket.entity.G8_promotion;
import com.eventticket.service.admin.AdminPromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lpth/admin/promotions")
@RequiredArgsConstructor // Dùng chuẩn Lombok giống bên Ticket
public class AdminPromotionController {

    // Khai báo private final thay vì @Autowired (Chuẩn xịn của Spring Boot hiện nay)
    private final AdminPromotionService adminPromotionService;

    // Xem danh sách và Lọc (Giữ nguyên gốc nhưng form gọi service đã đổi)
    // API: GET /api/lpth/admin/promotions
    @GetMapping
    public ResponseEntity<List<G8_promotion>> getPromotions(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive) {
        
        if (keyword == null && isActive == null) {
            return ResponseEntity.ok(adminPromotionService.getAllPromotions());
        }
        return ResponseEntity.ok(adminPromotionService.searchAndFilterPromotions(keyword, isActive));
    }

    // Lấy chi tiết 1 mã
    // API: GET /api/lpth/admin/promotions/{id}
    @GetMapping("/{id}")
    public ResponseEntity<G8_promotion> getPromotionById(@PathVariable Integer id) {
        return ResponseEntity.ok(adminPromotionService.getPromotionById(id));
    }

    // Thêm mới mã giảm giá (Thêm /add cho giống bên Ticket)
    // API: POST /api/lpth/admin/promotions/add
    @PostMapping("/add")
    public ResponseEntity<G8_promotion> createPromotion(@RequestBody G8_promotion promotion) {
        return ResponseEntity.ok(adminPromotionService.createPromotion(promotion));
    }

    // Cập nhật mã giảm giá (Thêm /update/{id} cho giống bên Ticket)
    // API: PUT /api/lpth/admin/promotions/update/{id}
    @PutMapping("/update/{id}")
    public ResponseEntity<G8_promotion> updatePromotion(
            @PathVariable Integer id,
            @RequestBody G8_promotion promotionDetails) {
        return ResponseEntity.ok(adminPromotionService.updatePromotion(id, promotionDetails));
    }

    // Bật/Tắt trạng thái hoạt động (Thêm /toggle-status/{id})
    // API: PATCH /api/lpth/admin/promotions/toggle-status/{id}
    @PatchMapping("/toggle-status/{id}")
    public ResponseEntity<G8_promotion> togglePromotionStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(adminPromotionService.togglePromotionStatus(id));
    }
}