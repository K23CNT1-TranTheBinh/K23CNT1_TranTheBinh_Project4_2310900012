package com.eventticket.controller.user;

import com.eventticket.entity.G8_review;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.UserRepository;
import com.eventticket.service.user.VtdReviewService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class VtdReviewController {

    private final VtdReviewService reviewService;
    private final UserRepository userRepository;

    public VtdReviewController(VtdReviewService reviewService, UserRepository userRepository) {
        this.reviewService = reviewService;
        this.userRepository = userRepository;
    }

    private Integer getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return null;
        }
        return userRepository.findByEmail(auth.getName())
                .map(G8_users::getUserId)
                .orElse(null);
    }

    /**
     * GUEST: Xem danh sách đánh giá, bình luận của sự kiện.
     */
    @GetMapping("/api/vtd/public/events/{eventId}/reviews")
    public ResponseEntity<List<G8_review>> getEventReviews(@PathVariable Integer eventId) {
        return ResponseEntity.ok(reviewService.getEventReviews(eventId));
    }

    /**
     * GUEST: Xem điểm đánh giá trung bình của sự kiện.
     */
    @GetMapping("/api/vtd/public/events/{eventId}/reviews/average")
    public ResponseEntity<Map<String, Object>> getAverageRating(@PathVariable Integer eventId) {
        Map<String, Object> response = new HashMap<>();
        response.put("eventId", eventId);
        response.put("averageRating", reviewService.getAverageRating(eventId));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/vtd/member/events/{eventId}/review-eligibility")
    public ResponseEntity<Map<String, Object>> getReviewEligibility(@PathVariable Integer eventId) {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(reviewService.getReviewEligibility(userId, eventId));
    }

    /**
     * MEMBER: Viết đánh giá và chấm sao.
     * Điều kiện kiểm tra ở service: đã mua vé thành công và sự kiện đã kết thúc.
     */
    @PostMapping("/api/vtd/member/events/{eventId}/reviews")
    public ResponseEntity<G8_review> createReview(
            @PathVariable Integer eventId,
            @RequestBody ReviewRequest request) {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        G8_review review = reviewService.createReview(userId, eventId, request.getRating(), request.getComment());
        return ResponseEntity.ok(review);
    }

    /**
     * MEMBER: Chỉnh sửa nội dung đánh giá cá nhân.
     */
    @PutMapping("/api/vtd/member/reviews/{reviewId}")
    public ResponseEntity<G8_review> updateReview(
            @PathVariable Integer reviewId,
            @RequestBody ReviewRequest request) {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        G8_review review = reviewService.updateReview(userId, reviewId, request.getRating(), request.getComment());
        return ResponseEntity.ok(review);
    }

    /**
     * MEMBER: Xóa đánh giá cá nhân.
     */
    @DeleteMapping("/api/vtd/member/reviews/{reviewId}")
    public ResponseEntity<Void> deleteReview(@PathVariable Integer reviewId) {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        reviewService.deleteReview(userId, reviewId);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class ReviewRequest {
        private Integer rating;
        private String comment;

        public Integer getRating() {
            return rating;
        }

        public void setRating(Integer rating) {
            this.rating = rating;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }
    }
}
