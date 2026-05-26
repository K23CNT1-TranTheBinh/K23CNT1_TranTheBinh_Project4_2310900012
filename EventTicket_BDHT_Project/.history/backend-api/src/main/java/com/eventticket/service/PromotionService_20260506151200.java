package com.eventticket.service;

import com.eventticket.entity.user.G8_promotion;
import com.eventticket.repository.PromotionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PromotionService {
    
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
        if (!promo.getIsActive() || promo.getValidUntil().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã giảm giá đã hết hiệu lực");
        }
        
        // Kiểm tra lượt sử dụng
        if (promo.getUsageLimit() != null && promo.getUsedCount() >= promo.getUsageLimit()) {
            throw new RuntimeException("Mã giảm giá đã hết lượt sử dụng");
        }
        
        return promo;
    }
    
    /**
     * ADMIN: Xem danh sách mã giảm giá
     */
    public List<G8_promotion> getAllPromotions() {
        return promotionRepository.findAll();
    }
    
    /**
     * ADMIN: Lọc mã giảm giá (Theo trạng thái)
     */
    public List<G8_promotion> getActivePromotions() {
        return promotionRepository.findAllActivePromotions();
    }
    
    /**
     * ADMIN: Lọc mã giảm giá - Còn lượt sử dụng
     */
    public List<G8_promotion> getAvailablePromotions() {
        return promotionRepository.findAvailablePromotions();
    }
    
    /**
     * ADMIN: Thêm mới mã giảm giá
     */
    public G8_promotion createPromotion(G8_promotion promotion) {
        if (promotionRepository.findByCode(promotion.getCode()).isPresent()) {
            throw new RuntimeException("Mã code đã tồn tại");
        }
        
        promotion.setIsActive(true);
        promotion.setUsedCount(0);
        
        return promotionRepository.save(promotion);
    }
    
    /**
     * ADMIN: Cập nhật thông tin mã giảm giá
     */
    public G8_promotion updatePromotion(Integer promotionId, G8_promotion promotionDetails) {
        G8_promotion promo = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new RuntimeException("Mã giảm giá không tồn tại"));
        
        if (promotionDetails.getDiscountValue() != null) promo.setDiscountValue(promotionDetails.getDiscountValue());
        if (promotionDetails.getMinOrderAmount() != null) promo.setMinOrderAmount(promotionDetails.getMinOrderAmount());
        if (promotionDetails.getUsageLimit() != null) promo.setUsageLimit(promotionDetails.getUsageLimit());
        if (promotionDetails.getValidUntil() != null) promo.setValidUntil(promotionDetails.getValidUntil());
        
        return promotionRepository.save(promo);
    }
    
    /**
     * ADMIN: Kích hoạt / Vô hiệu hóa mã giảm giá
     */
    public G8_promotion togglePromotionStatus(Integer promotionId, Boolean isActive) {
        G8_promotion promo = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new RuntimeException("Mã giảm giá không tồn tại"));
        
        promo.setIsActive(isActive);
        return promotionRepository.save(promo);
    }
    
    /**
     * INTERNAL: Tăng lượt sử dụng mã
     */
    public void incrementUsageCount(Integer promotionId) {
        Vtd_G8_promotion promo = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new RuntimeException("Mã giảm giá không tồn tại"));
        
        promo.setUsedCount(promo.getUsedCount() + 1);
        promotionRepository.save(promo);
    }
}
