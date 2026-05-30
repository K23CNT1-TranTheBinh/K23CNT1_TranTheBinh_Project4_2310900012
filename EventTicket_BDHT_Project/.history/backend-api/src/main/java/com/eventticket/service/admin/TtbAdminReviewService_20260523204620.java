package com.eventticket.service.admin;

import com.eventticket.entity.G8_review;
import com.eventticket.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminReviewService {

    private final ReviewRepository reviewRepository;

    // =======================================================================
    // TÍNH NĂNG #76: XEM VÀ LỌC DANH SÁCH ĐÁNH GIÁ (ADMIN DASHBOARD)
    // =======================================================================

    /**
     * Lấy toàn bộ danh sách đánh giá kết hợp lọc động.
     * Sử dụng Stream API để lọc theo eventId hoặc trạng thái isHidden.
     */
    public List<G8_review> getAllReviewsAndFilter(Integer eventId, Boolean isHidden) {
        List<G8_review> reviews = reviewRepository.findAll();

        return reviews.stream()
                .filter(review -> (eventId == null ||
                        (review.getEvent() != null && review.getEvent().getEventId().equals(eventId))))
                .filter(review -> (isHidden == null ||
                        review.getIsHidden().equals(isHidden))) // Sử dụng isHidden cho khớp Entity
                .collect(Collectors.toList());
    }

    /**
     * (Tùy chọn) Sử dụng trực tiếp Query có sẵn trong Repo:
     * Lấy danh sách các bình luận hợp lệ (chưa bị ẩn) của 1 sự kiện
     */
    public List<G8_review> getValidReviewsByEvent(Integer eventId) {
        return reviewRepository.findByEventIdNotHidden(eventId);
    }

    /**
     * (Tùy chọn) Tìm tất cả đánh giá của 1 user cụ thể
     */
    public List<G8_review> getReviewsByUserId(Integer userId) {
        return reviewRepository.findByUser_UserId(userId);
    }

    // =======================================================================
    // TÍNH NĂNG #77: KIỂM DUYỆT - ẨN/XÓA BÌNH LUẬN VI PHẠM
    // =======================================================================

    /**
     * Đổi trạng thái Ẩn / Hiện của bình luận (Soft Delete)
     */
    public G8_review toggleReviewHiddenStatus(Integer reviewId, boolean isHidden) {
        G8_review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đánh giá với ID: " + reviewId));

        review.setIsHidden(isHidden); // Cập nhật dựa theo property isHidden của bạn
        return reviewRepository.save(review);
    }

    /**
     * Xóa vĩnh viễn một bình luận khỏi cơ sở dữ liệu (Hard Delete)
     */
    public void deleteReviewPermanently(Integer reviewId) {
        G8_review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đánh giá với ID: " + reviewId));

        reviewRepository.delete(review);
    }

    // =======================================================================
    // CÁC HÀM THỐNG KÊ (Dùng cho Chart/Báo cáo của Admin)
    // =======================================================================

    /**
     * Lấy điểm đánh giá trung bình của 1 sự kiện
     */
    public Double getAverageEventRating(Integer eventId) {
        Double avgRating = reviewRepository.getAverageRatingByEventId(eventId);
        return avgRating != null ? avgRating : 0.0; // Tránh lỗi null nếu sự kiện chưa có ai đánh giá
    }

    /**
     * Đếm tổng số đánh giá hợp lệ của 1 sự kiện
     */
    public long countValidReviews(Integer eventId) {
        return reviewRepository.countReviewsByEventId(eventId);
    }
}