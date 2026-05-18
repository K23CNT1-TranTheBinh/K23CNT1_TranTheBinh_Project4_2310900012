package com.eventticket.service.admin;

import com.eventticket.entity.G8_promotion;
import com.eventticket.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor 
public class AdminPromotionService {

    // Bỏ @Autowired đi, dùng private final
    private final PromotionRepository promotionRepository;

    /**
     * Xem toàn bộ danh sách mã giảm giá
     */
    public List<G8_promotion> getAllPromotions() {
        return promotionRepository.findAll();
    }

    /**
     * Tìm kiếm theo mã code (keyword) và lọc theo trạng thái (isActive)
     */
    public List<G8_promotion> searchAndFilterPromotions(String keyword, Boolean isActive) {
        return promotionRepository.searchAndFilterAdmin(keyword, isActive);
    }

    /**
     * HÀM PHỤ TRỢ: Lấy chi tiết 1 mã giảm giá bằng ID
     */
    public G8_promotion getPromotionById(Integer promotionId) {
        return promotionRepository.findById(promotionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã giảm giá với ID: " + promotionId));
    }

    /**
     * Thêm mới mã giảm giá
     */
    public G8_promotion createPromotion(G8_promotion promotion) {
        if (promotionRepository.findByCode(promotion.getCode()).isPresent()) {
            throw new RuntimeException("Mã giảm giá (Code) này đã tồn tại!");
        }
        
        promotion.setIsActive(true);
        promotion.setUsedCount(0);
        
        return promotionRepository.save(promotion);
    }

    /**
     * Cập nhật thông tin mã giảm giá
     */
    public G8_promotion updatePromotion(Integer promotionId, G8_promotion promotionDetails) {
        G8_promotion existingPromo = getPromotionById(promotionId);

        if (!existingPromo.getCode().equalsIgnoreCase(promotionDetails.getCode())) {
            Optional<G8_promotion> checkCode = promotionRepository.findByCode(promotionDetails.getCode());
            if (checkCode.isPresent()) {
                throw new RuntimeException("Mã giảm giá (Code) mới đã bị trùng với chương trình khác!");
            }
        }

        existingPromo.setCode(promotionDetails.getCode());
        existingPromo.setDiscountType(promotionDetails.getDiscountType());
        existingPromo.setDiscountValue(promotionDetails.getDiscountValue());
        existingPromo.setMinOrderValue(promotionDetails.getMinOrderValue());
        existingPromo.setUsageLimit(promotionDetails.getUsageLimit());
        existingPromo.setValidTo(promotionDetails.getValidTo());

        return promotionRepository.save(existingPromo);
    }

    /**
     * Bật/Tắt trạng thái hoạt động của mã giảm giá
     */
    public G8_promotion togglePromotionStatus(Integer promotionId) {
        G8_promotion promo = getPromotionById(promotionId);
        
        promo.setIsActive(!promo.getIsActive());
        
        return promotionRepository.save(promo);
    }
}