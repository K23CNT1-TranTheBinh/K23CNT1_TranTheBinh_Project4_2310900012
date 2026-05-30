package com.eventticket.controller.user;

import com.eventticket.entity.G8_promotion;
import com.eventticket.service.user.VtdPromotionService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

import lombok.Data;

@RestController
public class VtdPromotionController {

    private final VtdPromotionService promotionService;

    public VtdPromotionController(VtdPromotionService promotionService) {
        this.promotionService = promotionService;
    }

    /**
     * GUEST/MEMBER: Nhập mã khuyến mãi để áp dụng
     */
    @PostMapping("/api/vtd/public/promotions/validate")
    public ResponseEntity<PromotionResponse> validatePromotion(@RequestBody ValidatePromotionRequest request) {
        try {
            G8_promotion promotion = promotionService.applyPromotionAndConsumeUsage(request.getCode());
            PromotionResponse response = new PromotionResponse();
            response.setSuccess(true);
            response.setPromotion(promotion);
            response.setDiscountType(promotion.getDiscountType());
            response.setDiscountValue(promotion.getDiscountValue());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            PromotionResponse response = new PromotionResponse();
            response.setSuccess(false);
            response.setMessage(e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * GUEST/MEMBER: Lấy thông tin chi tiết một mã khuyến mãi
     */
    @GetMapping("/api/vtd/public/promotions/{code}")
    public ResponseEntity<G8_promotion> getPromotionByCode(@PathVariable String code) {
        G8_promotion promotion = promotionService.validatePromotion(code);
        return ResponseEntity.ok(promotion);
    }

    /**
     * GUEST/MEMBER: Tính giá sau khi áp dụng khuyến mãi
     */
    @PostMapping("/api/vtd/public/promotions/calculate-discount")
    public ResponseEntity<Map<String, Object>> calculateDiscount(@RequestBody CalculateDiscountRequest request) {
        try {
            G8_promotion promotion = promotionService.validatePromotion(request.getPromotionCode());

            java.math.BigDecimal originalPrice = request.getOriginalPrice();

            if (promotion.getMinOrderValue() != null && originalPrice.compareTo(promotion.getMinOrderValue()) < 0) {
                throw new RuntimeException("Tổng tiền chưa đủ để sử dụng mã này. Cần tối thiểu " + promotion.getMinOrderValue().intValue() + " đ");
            }

            java.math.BigDecimal discountAmount = java.math.BigDecimal.ZERO;

            // Tính chiết khấu theo loại
            if ("PERCENT".equalsIgnoreCase(promotion.getDiscountType())) {
                discountAmount = originalPrice.multiply(promotion.getDiscountValue())
                        .divide(new java.math.BigDecimal(100));
            } else if ("FIXED".equalsIgnoreCase(promotion.getDiscountType())) {
                discountAmount = promotion.getDiscountValue();
            }

            java.math.BigDecimal finalPrice = originalPrice.subtract(discountAmount);
            promotion = promotionService.applyPromotionAndConsumeUsage(request.getPromotionCode());

            Map<String, Object> response = new HashMap<>();
            response.put("originalPrice", originalPrice);
            response.put("discountAmount", discountAmount);
            response.put("discountType", promotion.getDiscountType());
            response.put("discountValue", promotion.getDiscountValue());
            response.put("finalPrice", finalPrice);
            response.put("promotionCode", request.getPromotionCode());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * DTO: Yêu cầu xác nhận mã khuyến mãi
     */
    @Data
    public static class ValidatePromotionRequest {
        private String code;

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }
    }

    /**
     * DTO: Response xác nhận mã khuyến mãi
     */
    @Data
    public static class PromotionResponse {
        private boolean success;
        private String message;
        private G8_promotion promotion;
        private String discountType;
        private java.math.BigDecimal discountValue;

        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public G8_promotion getPromotion() {
            return promotion;
        }

        public void setPromotion(G8_promotion promotion) {
            this.promotion = promotion;
        }

        public String getDiscountType() {
            return discountType;
        }

        public void setDiscountType(String discountType) {
            this.discountType = discountType;
        }

        public java.math.BigDecimal getDiscountValue() {
            return discountValue;
        }

        public void setDiscountValue(java.math.BigDecimal discountValue) {
            this.discountValue = discountValue;
        }
    }

    /**
     * DTO: Yêu cầu tính giá sau giảm
     */
    @Data
    public static class CalculateDiscountRequest {
        private String promotionCode;
        private java.math.BigDecimal originalPrice;

        public String getPromotionCode() {
            return promotionCode;
        }

        public void setPromotionCode(String promotionCode) {
            this.promotionCode = promotionCode;
        }

        public java.math.BigDecimal getOriginalPrice() {
            return originalPrice;
        }

        public void setOriginalPrice(java.math.BigDecimal originalPrice) {
            this.originalPrice = originalPrice;
        }
    }
}
