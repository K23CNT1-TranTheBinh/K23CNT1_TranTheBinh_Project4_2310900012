package com.eventticket.service.user;

import com.eventticket.entity.G8_promotion;
import com.eventticket.repository.PromotionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class VtdPromotionService {

    @Autowired
    private PromotionRepository promotionRepository;

    /**
     * MEMBER: Nhập và áp dụng Mã giảm giá
     */
    public G8_promotion validateAndApplyPromotion(String code) {
        Optional<G8_promotion> promoOpt = promotionRepository.findByCode(code);

        if (promoOpt.isEmpty()) {
            throw new RuntimeException("Mã giảm giá không tồn tại");
        }

        G8_promotion promo = promoOpt.get();

        // Kiểm tra mã còn hiệu lực
        if (!promo.getIsActive() || promo.getValidTo().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã giảm giá đã hết hiệu lực");
        }

        // Kiểm tra lượt sử dụng
        if (promo.getUsageLimit() != null && promo.getUsedCount() >= promo.getUsageLimit()) {
            throw new RuntimeException("Mã giảm giá đã hết lượt sử dụng");
        }

        return promo;
    }

    /**
     * INTERNAL: Tăng lượt sử dụng mã
     */
    public void incrementUsageCount(Integer promotionId) {
        G8_promotion promo = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new RuntimeException("Mã giảm giá không tồn tại"));

        promo.setUsedCount(promo.getUsedCount() + 1);
        promotionRepository.save(promo);
    }
}
