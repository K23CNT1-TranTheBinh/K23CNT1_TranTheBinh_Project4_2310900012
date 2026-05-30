package com.eventticket.service.user;

import com.eventticket.entity.G8_promotion;
import com.eventticket.repository.PromotionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
@Service
public class VtdPromotionService {

    @Autowired
    private PromotionRepository promotionRepository;

    public G8_promotion validatePromotion(String code) {
        G8_promotion promo = promotionRepository.findByCode(normalizeCode(code))
                .orElseThrow(() -> new RuntimeException("Ma giam gia khong ton tai"));

        validateUsablePromotion(promo);
        return promo;
    }

    @Transactional
    public G8_promotion applyPromotionAndConsumeUsage(String code) {
        G8_promotion promo = promotionRepository.findByCodeForUpdate(normalizeCode(code))
                .orElseThrow(() -> new RuntimeException("Ma giam gia khong ton tai"));

        validateUsablePromotion(promo);

        if (promo.getUsageLimit() != null) {
            promo.setUsageLimit(promo.getUsageLimit() - 1);
        }

        return promotionRepository.save(promo);
    }

    public G8_promotion validateAndApplyPromotion(String code) {
        return validatePromotion(code);
    }

    public void incrementUsageCount(Integer promotionId) {
        G8_promotion promo = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new RuntimeException("Ma giam gia khong ton tai"));

        int usedCount = promo.getUsedCount() == null ? 0 : promo.getUsedCount();
        promo.setUsedCount(usedCount + 1);
        promotionRepository.save(promo);
    }

    private void validateUsablePromotion(G8_promotion promo) {
        if (!Boolean.TRUE.equals(promo.getIsActive()) || promo.getValidTo().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Ma giam gia da het hieu luc");
        }

        if (promo.getUsageLimit() != null && promo.getUsageLimit() <= 0) {
            throw new RuntimeException("Ma giam gia da het luot su dung");
        }
    }

    private String normalizeCode(String code) {
        if (code == null || code.trim().isEmpty()) {
            throw new RuntimeException("Vui long nhap ma giam gia");
        }
        return code.trim();
    }
}
