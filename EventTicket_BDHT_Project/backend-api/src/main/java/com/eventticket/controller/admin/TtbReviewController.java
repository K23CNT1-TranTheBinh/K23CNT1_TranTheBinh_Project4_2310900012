package com.eventticket.controller.admin;

import com.eventticket.entity.G8_review;
import com.eventticket.service.admin.TtbReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ttb/reviews")
@RequiredArgsConstructor
public class TtbReviewController {

    private final TtbReviewService ttbReviewService;

    // ==========================================
    // TÍNH NĂNG #76: XEM VÀ LỌC ĐÁNH GIÁ
    // ==========================================

    /**
     * API: Lấy danh sách đánh giá & Lọc
     * URL ví dụ:
     * - Lấy tất cả: GET /api/ttb/reviews
     * - Xem đánh giá của sự kiện 1: GET /api/ttb/reviews?eventId=1
     * - Xem các đánh giá ĐANG BỊ ẨN (vi phạm): GET /api/ttb/reviews?isHidden=true
     */
    @GetMapping
    public ResponseEntity<List<G8_review>> getAllReviews(
            @RequestParam(required = false) Integer eventId,
            @RequestParam(required = false) Boolean isHidden) {
        
        return ResponseEntity.ok(ttbReviewService.getAllReviewsAndFilter(eventId, isHidden));
    }

    /**
     * API: Lấy danh sách đánh giá của 1 User cụ thể
     * URL: GET /api/ttb/reviews/user/5
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<G8_review>> getReviewsByUser(@PathVariable Integer userId) {
        return ResponseEntity.ok(ttbReviewService.getReviewsByUserId(userId));
    }


    // ==========================================
    // TÍNH NĂNG #77: KIỂM DUYỆT (ẨN / XÓA)
    // ==========================================

    /**
     * API: ẨN một đánh giá (Vi phạm)
     * URL: PUT /api/ttb/reviews/10/hide
     */
    @PutMapping("/{id}/hide")
    public ResponseEntity<Map<String, String>> hideReview(@PathVariable Integer id) {
        ttbReviewService.toggleReviewHiddenStatus(id, true); // true = Bị ẩn
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã ẨN đánh giá thành công!");
        return ResponseEntity.ok(response);
    }

    /**
     * API: HIỂN THỊ LẠI một đánh giá (Khôi phục nếu nhầm)
     * URL: PUT /api/ttb/reviews/10/show
     */
    @PutMapping("/{id}/show")
    public ResponseEntity<Map<String, String>> showReview(@PathVariable Integer id) {
        ttbReviewService.toggleReviewHiddenStatus(id, false); // false = Không ẩn
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã KHÔI PHỤC hiển thị đánh giá!");
        return ResponseEntity.ok(response);
    }

    /**
     * API: XÓA VĨNH VIỄN một đánh giá
     * URL: DELETE /api/ttb/reviews/10
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteReviewPermanently(@PathVariable Integer id) {
        ttbReviewService.deleteReviewPermanently(id);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã XÓA VĨNH VIỄN đánh giá khỏi hệ thống!");
        return ResponseEntity.ok(response);
    }


    // ==========================================
    // API BỔ SUNG: THỐNG KÊ ĐÁNH GIÁ
    // ==========================================

    /**
     * API: Xem tóm tắt thống kê đánh giá của 1 sự kiện (Dành cho biểu đồ ttb)
     * URL: GET /api/ttb/reviews/stats/event/1
     */
    @GetMapping("/stats/event/{eventId}")
    public ResponseEntity<Map<String, Object>> getEventReviewStats(@PathVariable Integer eventId) {
        Double avgRating = ttbReviewService.getAverageEventRating(eventId);
        long totalValid = ttbReviewService.countValidReviews(eventId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("eventId", eventId);
        stats.put("averageRating", avgRating);
        stats.put("totalValidReviews", totalValid);

        return ResponseEntity.ok(stats);
    }
}