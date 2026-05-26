package com.eventticket.service.user;

import com.eventticket.entity.G8_event;
import com.eventticket.entity.G8_review;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.EventRepository;
import com.eventticket.repository.PaymentRepository;
import com.eventticket.repository.ReviewRepository;
import com.eventticket.repository.TicketRepository;
import com.eventticket.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class VtdReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    /**
     * GUEST: Xem danh sách đánh giá, bình luận công khai của sự kiện.
     */
    public List<G8_review> getEventReviews(Integer eventId) {
        return reviewRepository.findByEventIdNotHidden(eventId);
    }

    /**
     * MEMBER: Viết đánh giá và chấm sao.
     * Điều kiện: user đã mua vé thành công và sự kiện đã kết thúc.
     * Nếu user đã có review cho event này thì cập nhật review cũ.
     */
    public G8_review createReview(Integer userId, Integer eventId, Integer rating, String comment) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại"));

        if (!canReviewEvent(userId, event.getEventId())) {
            throw new RuntimeException("Chỉ có thể đánh giá sau khi đã mua vé và thanh toán thành công");
        }

        validateRating(rating);

        return reviewRepository.findByUserIdAndEventId(user.getUserId(), event.getEventId())
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
     * MEMBER: Chỉnh sửa đánh giá cá nhân.
     * SECURITY: Chỉ chủ review mới được sửa.
     */
    public G8_review updateReview(Integer userId, Integer reviewId, Integer rating, String comment) {
        G8_review review = getOwnedReview(userId, reviewId);

        if (rating != null) {
            validateRating(rating);
            review.setRating(rating);
        }
        if (comment != null) {
            review.setComment(comment);
        }
        review.setUpdatedAt(LocalDateTime.now());

        return reviewRepository.save(review);
    }

    /**
     * MEMBER: Xóa đánh giá cá nhân.
     * SECURITY: Chỉ chủ review mới được xóa.
     */
    public void deleteReview(Integer userId, Integer reviewId) {
        getOwnedReview(userId, reviewId);
        reviewRepository.deleteById(reviewId);
    }

    /**
     * INTERNAL/GUEST: Tính rating trung bình của sự kiện.
     */
    public Double getAverageRating(Integer eventId) {
        return reviewRepository.getAverageRatingByEventId(eventId);
    }

    public Map<String, Object> getReviewEligibility(Integer userId, Integer eventId) {
        eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Su kien khong ton tai"));

        boolean hasPurchased = canReviewEvent(userId, eventId);
        boolean hasReviewed = reviewRepository.findByUserIdAndEventId(userId, eventId).isPresent();

        Map<String, Object> result = new HashMap<>();
        result.put("eventId", eventId);
        result.put("hasPurchased", hasPurchased);
        result.put("hasReviewed", hasReviewed);
        result.put("eligible", hasPurchased && !hasReviewed);
        result.put("reason", hasPurchased ? (hasReviewed ? "ALREADY_REVIEWED" : null) : "NOT_PURCHASED_OR_NOT_PAID");
        return result;
    }

    private G8_review getOwnedReview(Integer userId, Integer reviewId) {
        G8_review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Đánh giá không tồn tại"));

        if (review.getUser() == null || !review.getUser().getUserId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền thao tác đánh giá này");
        }

        return review;
    }

    private void validateRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new RuntimeException("Rating phải từ 1 đến 5 sao");
        }
    }

    private boolean canReviewEvent(Integer userId, Integer eventId) {
        return paymentRepository.countSuccessfulPaymentsByUserAndEvent(userId, eventId) > 0;
    }
}
