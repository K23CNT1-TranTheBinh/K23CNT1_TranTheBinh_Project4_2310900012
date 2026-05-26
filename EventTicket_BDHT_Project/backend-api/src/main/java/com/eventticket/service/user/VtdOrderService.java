package com.eventticket.service.user;

import com.eventticket.entity.G8_order;
import com.eventticket.entity.G8_order_item;
import com.eventticket.entity.G8_promotion;
import com.eventticket.entity.G8_ticketType;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class VtdOrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VtdPromotionService promotionService;

    /**
     * MEMBER: Tạo đơn hàng mới (Tạo giỏ hàng)
     */
    @Transactional
    public G8_order createOrder(Integer userId) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        G8_order order = new G8_order();
        order.setUser(user);
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
        int remainingTickets = ticketType.getTotalQuantity() - ticketType.getSoldQuantity();
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
    public G8_order_item updateOrderItemQuantity(Integer orderId, Integer orderItemId, Integer newQuantity) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        G8_order_item orderItem = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new RuntimeException("Chi tiết đơn hàng không tồn tại"));

        // Kiểm tra orderItem thuộc về order này
        if (!orderItem.getOrder().getOrderId().equals(orderId)) {
            throw new RuntimeException("Chi tiết đơn hàng không thuộc đơn hàng này");
        }

        Integer oldQuantity = orderItem.getQuantity();
        orderItem.setQuantity(newQuantity);

        // Cập nhật tổng tiền
        BigDecimal priceDifference = orderItem.getPriceAtTime()
                .multiply(new BigDecimal(newQuantity - oldQuantity));

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
        if (promo.getMinOrderValue() != null && order.getTotalAmount().compareTo(promo.getMinOrderValue()) < 0) {
            throw new RuntimeException("Tổng tiền chưa đủ để sử dụng mã này");
        }

        order.setPromotion(promo);

        // Tính toán tiền giảm
        BigDecimal discount = calculateDiscount(order.getTotalAmount(), promo);
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
        return orderRepository.findByUser_UserId(userId);
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
     * MEMBER: Lấy danh sách các mục trong đơn hàng
     */
    public List<G8_order_item> getOrderItems(Integer orderId) {
        // Validate that order exists
        orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));
        return orderItemRepository.findByOrderId(orderId);
    }

    /**
     * MEMBER: Xóa một mục khỏi đơn hàng (giỏ hàng)
     */
    @Transactional
    public void removeOrderItem(Integer orderId, Integer orderItemId) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        G8_order_item orderItem = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new RuntimeException("Chi tiết đơn hàng không tồn tại"));

        // Kiểm tra orderItem thuộc về order này
        if (!orderItem.getOrder().getOrderId().equals(orderId)) {
            throw new RuntimeException("Chi tiết đơn hàng không thuộc đơn hàng này");
        }

        // Trừ tiền từ tổng đơn hàng
        BigDecimal itemTotal = orderItem.getPriceAtTime().multiply(new BigDecimal(orderItem.getQuantity()));
        order.setTotalAmount(order.getTotalAmount().subtract(itemTotal));
        order.setFinalAmount(order.getFinalAmount().subtract(itemTotal));

        orderRepository.save(order);
        orderItemRepository.deleteById(orderItemId);
    }

    /**
     * MEMBER: Xác nhận đơn hàng (Chuyển từ PENDING sang CONFIRMED)
     */
    @Transactional
    public G8_order confirmOrder(Integer orderId) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        if (!"PENDING".equals(order.getStatus())) {
            throw new RuntimeException("Chỉ có thể xác nhận đơn hàng ở trạng thái PENDING");
        }

        List<G8_order_item> items = orderItemRepository.findByOrderId(orderId);
        if (items.isEmpty()) {
            throw new RuntimeException("Đơn hàng không có mục nào");
        }

        order.setStatus("CONFIRMED");
        return orderRepository.save(order);
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
