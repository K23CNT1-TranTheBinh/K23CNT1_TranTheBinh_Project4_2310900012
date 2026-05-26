package com.eventticket.service;

import com.eventticket.entity.user.*;
import com.eventticket.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    @Autowired
    private PromotionService promotionService;

    /**
     * MEMBER: Tạo đơn hàng mới (Tạo giỏ hàng)
     */
    @Transactional
    public G8_order createOrder(Integer userId) {
        G8_order order = new G8_order();
        order.setUserId(userId);
        order.setStatus("PENDING");
        order.setTotalAmount(BigDecimal.ZERO);
        order.setFinalAmount(BigDecimal.ZERO);

        return orderRepository.save(order);
    }

    /**
     * MEMBER: Chọn hạng vé và thêm vào giỏ hàng
     */
    @Transactional
    public G8_order_item addTicketTypeToOrder(Integer orderId, Integer ticketTypeId, Integer quantity) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        G8_ticketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new RuntimeException("Hạng vé không tồn tại"));

        // Kiểm tra số lượng còn hàng
        int remainingTickets = ticketType.getQuantityAvailable() - ticketType.getQuantitySold();
        if (quantity > remainingTickets) {
            throw new RuntimeException("Số lượng vé không đủ. Còn lại: " + remainingTickets);
        }

        G8_order_item orderItem = new G8_order_item();
        orderItem.setOrder(order);
        orderItem.setTicketType(ticketType);
        orderItem.setQuantity(quantity);
        orderItem.setPriceAtTime(ticketType.getPrice());

        // Cập nhật tổng tiền
        BigDecimal itemTotal = ticketType.getPrice().multiply(new BigDecimal(quantity));
        order.setTotalAmount(order.getTotalAmount().add(itemTotal));
        order.setFinalAmount(order.getFinalAmount().add(itemTotal));

        orderRepository.save(order);
        return orderItemRepository.save(orderItem);
    }

    /**
     * MEMBER: Điều chỉnh số lượng vé (Tăng/Giảm)
     */
    @Transactional
    public G8_order_item updateOrderItemQuantity(Integer orderItemId, Integer newQuantity) {
        G8_order_item orderItem = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new RuntimeException("Chi tiết đơn hàng không tồn tại"));

        Integer oldQuantity = orderItem.getQuantity();
        orderItem.setQuantity(newQuantity);

        // Cập nhật tổng tiền
        BigDecimal priceDifference = orderItem.getPriceAtTime()
                .multiply(new BigDecimal(newQuantity - oldQuantity));

        G8_order order = orderItem.getOrder();
        order.setTotalAmount(order.getTotalAmount().add(priceDifference));
        order.setFinalAmount(order.getFinalAmount().add(priceDifference));

        orderRepository.save(order);
        return orderItemRepository.save(orderItem);
    }

    /**
     * MEMBER: Nhập và áp dụng Mã giảm giá
     */
    public G8_order applyPromotionToOrder(Integer orderId, String promotionCode) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        G8_promotion promo = promotionService.validateAndApplyPromotion(promotionCode);

        // Kiểm tra tối thiểu
        if (promo.getMinOrderAmount() != null && order.getTotalAmount().compareTo(promo.getMinOrderAmount()) < 0) {
            throw new RuntimeException("Tổng tiền chưa đủ để sử dụng mã này");
        }

        order.setPromotion(promo);

        // Tính toán tiền giảm
        BigDecimal discount = calculateDiscount(order.getTotalAmount(), promo);
        if (promo.getMaxDiscount() != null) {
            discount = discount.min(promo.getMaxDiscount());
        }

        order.setFinalAmount(order.getTotalAmount().subtract(discount));

        return orderRepository.save(order);
    }

    /**
     * MEMBER: Gỡ bỏ Mã giảm giá đã áp dụng
     */
    public G8_order removePromotionFromOrder(Integer orderId) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        order.setPromotion(null);
        order.setFinalAmount(order.getTotalAmount());

        return orderRepository.save(order);
    }

    /**
     * MEMBER: Xem lịch sử đơn hàng cá nhân
     */
    public List<G8_order> getUserOrders(Integer userId) {
        return orderRepository.findByUserId(userId);
    }

    /**
     * MEMBER: Lọc đơn hàng cá nhân (Theo trạng thái)
     */
    public List<G8_order> getUserOrdersByStatus(Integer userId, String status) {
        return orderRepository.findByUserIdAndStatus(userId, status);
    }

    /**
     * MEMBER: Xem chi tiết đơn hàng
     */
    public G8_order getOrderDetails(Integer orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));
    }

    /**
     * MEMBER: Hủy đơn hàng (Chỉ khi status = PENDING)
     */
    @Transactional
    public void cancelOrder(Integer orderId) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        if (!"PENDING".equals(order.getStatus())) {
            throw new RuntimeException("Chỉ có thể hủy đơn hàng ở trạng thái PENDING");
        }

        order.setStatus("CANCELLED");
        order.setCancelledAt(LocalDateTime.now());
        orderRepository.save(order);
    }

    /**
     * ADMIN: Xem danh sách toàn bộ đơn hàng
     */
    public List<G8_order> getAllOrders() {
        return orderRepository.findAll();
    }

    /**
     * ADMIN: Lọc đơn hàng (Theo trạng thái)
     */
    public List<G8_order> getOrdersByStatus(String status) {
        return orderRepository.findByStatus(status);
    }

    /**
     * ADMIN: Cập nhật trạng thái đơn hàng
     */
    public G8_order updateOrderStatus(Integer orderId, String status) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        order.setStatus(status);
        return orderRepository.save(order);
    }

    /**
     * INTERNAL: Tính toán tiền giảm
     */
    private BigDecimal calculateDiscount(BigDecimal totalAmount, G8_promotion promo) {
        if ("PERCENT".equals(promo.getDiscountType())) {
            return totalAmount.multiply(promo.getDiscountValue()).divide(new BigDecimal(100));
        } else {
            return promo.getDiscountValue();
        }
    }
}
