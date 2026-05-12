package com.eventticket.service;

import com.eventticket.entity.G8_event;
import com.eventticket.entity.G8_review;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.EventRepository;
import com.eventticket.repository.ReviewRepository;
import com.eventticket.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EventRepository eventRepository;

    /**
     * GUEST: Xem danh sách các đánh giá, bình luận của sự kiện
     */
    public List<G8_review> getEventReviews(Integer eventId) {
        return reviewRepository.findByEventIdNotHidden(eventId);
    }

    /**
     * MEMBER: Viết đánh giá và chấm điểm sao
     * Policy: Nếu user đã có review cho cùng (userId, eventId) thì cập nhật (B).
     */
    public G8_review createReview(Integer userId, Integer eventId, Integer rating, String comment) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));

        // Validate rating
        if (rating == null || rating < 1 || rating > 5) {
            throw new RuntimeException("Rating phải từ 1 đến 5 sao");
        }

        // Nếu tồn tại review của user cho event này => update
        return reviewRepository.findByUserAndEvent(user, event)
                .map(existing -> {
                    existing.setRating(rating);
                    existing.setComment(comment);
                    existing.setIsHidden(false);
                    existing.setUpdatedAt(LocalDateTime.now());
                    return reviewRepository.save(existing);
                })
                .orElseGet(() -> {
                    G8_review review = new G8_review();
                    review.setUser(user);
                    review.setEvent(event);
                    review.setRating(rating);
                    review.setComment(comment);
                    review.setIsHidden(false);
                    review.setCreatedAt(LocalDateTime.now());
                    return reviewRepository.save(review);
                });
    }

    /**
     * MEMBER: Chỉnh sửa nội dung đánh giá cá nhân
     */
    public G8_review updateReview(Integer reviewId, Integer rating, String comment) {
        G8_review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Đánh giá không tồn tại"));

        if (rating != null && (rating < 1 || rating > 5)) {
            throw new RuntimeException("Rating phải từ 1 đến 5 sao");
        }

        if (rating != null)
            review.setRating(rating);
        if (comment != null)
            review.setComment(comment);
        review.setUpdatedAt(LocalDateTime.now());

        return reviewRepository.save(review);
    }

    /**
     * MEMBER: Xóa đánh giá cá nhân
     */
    public void deleteReview(Integer reviewId) {
        reviewRepository.deleteById(reviewId);
    }

    /**
     * ADMIN: Xem danh sách đánh giá của toàn hệ thống
     */
    public List<G8_review> getAllReviews() {
        return reviewRepository.findAll();
    }

    /**
     * ADMIN: Xóa/Ẩn bình luận vi phạm tiêu chuẩn
     */
    public G8_review hideReview(Integer reviewId) {
        G8_review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Đánh giá không tồn tại"));

        review.setIsHidden(true);
        return reviewRepository.save(review);
    }

    /**
     * INTERNAL: Tính rating trung bình sự kiện
     */
    public Double getAverageRating(Integer eventId) {
        return reviewRepository.getAverageRatingByEventId(eventId);
    }
}
