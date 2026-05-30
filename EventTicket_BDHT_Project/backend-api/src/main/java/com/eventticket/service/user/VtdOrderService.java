package com.eventticket.service.user;

import com.eventticket.entity.G8_order;
import com.eventticket.entity.G8_order_item;
import com.eventticket.entity.G8_promotion;
import com.eventticket.entity.G8_ticketType;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.OrderItemRepository;
import com.eventticket.repository.OrderRepository;
import com.eventticket.repository.TicketTypeRepository;
import com.eventticket.repository.UserRepository;
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

    @Transactional
    public G8_order createOrder(Integer userId) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Nguoi dung khong ton tai"));

        G8_order order = new G8_order();
        order.setUser(user);
        order.setStatus("PENDING");
        order.setTotalAmount(BigDecimal.ZERO);
        order.setFinalAmount(BigDecimal.ZERO);

        return orderRepository.save(order);
    }

    @Transactional
    public G8_order_item addTicketTypeToOrder(Integer orderId, Integer ticketTypeId, Integer quantity) {
        validateQuantity(quantity);

        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Don hang khong ton tai"));

        G8_ticketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new RuntimeException("Hang ve khong ton tai"));

        validateAvailableTickets(ticketType, quantity);

        G8_order_item orderItem = new G8_order_item();
        orderItem.setOrder(order);
        orderItem.setTicketType(ticketType);
        orderItem.setQuantity(quantity);
        orderItem.setPriceAtTime(ticketType.getPrice());

        BigDecimal itemTotal = ticketType.getPrice().multiply(new BigDecimal(quantity));
        order.setTotalAmount(order.getTotalAmount().add(itemTotal));
        order.setFinalAmount(order.getFinalAmount().add(itemTotal));

        orderRepository.save(order);
        return orderItemRepository.save(orderItem);
    }

    @Transactional
    public G8_order_item updateOrderItemQuantity(Integer orderId, Integer orderItemId, Integer newQuantity) {
        validateQuantity(newQuantity);

        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Don hang khong ton tai"));

        G8_order_item orderItem = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new RuntimeException("Chi tiet don hang khong ton tai"));

        if (!orderItem.getOrder().getOrderId().equals(orderId)) {
            throw new RuntimeException("Chi tiet don hang khong thuoc don hang nay");
        }

        validateAvailableTickets(orderItem.getTicketType(), newQuantity);

        Integer oldQuantity = orderItem.getQuantity();
        orderItem.setQuantity(newQuantity);

        BigDecimal priceDifference = orderItem.getPriceAtTime()
                .multiply(new BigDecimal(newQuantity - oldQuantity));

        order.setTotalAmount(order.getTotalAmount().add(priceDifference));
        order.setFinalAmount(order.getFinalAmount().add(priceDifference));

        orderRepository.save(order);
        return orderItemRepository.save(orderItem);
    }

    public G8_order applyPromotionToOrder(Integer orderId, String promotionCode) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Don hang khong ton tai"));

        G8_promotion promo = promotionService.validateAndApplyPromotion(promotionCode);

        if (promo.getMinOrderValue() != null && order.getTotalAmount().compareTo(promo.getMinOrderValue()) < 0) {
            throw new RuntimeException("Tong tien chua du de su dung ma nay");
        }

        order.setPromotion(promo);

        BigDecimal discount = calculateDiscount(order.getTotalAmount(), promo);
        order.setFinalAmount(order.getTotalAmount().subtract(discount));

        return orderRepository.save(order);
    }

    public G8_order removePromotionFromOrder(Integer orderId) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Don hang khong ton tai"));

        order.setPromotion(null);
        order.setFinalAmount(order.getTotalAmount());

        return orderRepository.save(order);
    }

    public List<G8_order> getUserOrders(Integer userId) {
        return orderRepository.findByUser_UserId(userId);
    }

    public List<G8_order> getUserOrdersByStatus(Integer userId, String status) {
        return orderRepository.findByUserIdAndStatus(userId, status);
    }

    public G8_order getOrderDetails(Integer orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Don hang khong ton tai"));
    }

    public List<G8_order_item> getOrderItems(Integer orderId) {
        orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Don hang khong ton tai"));
        return orderItemRepository.findByOrderId(orderId);
    }

    @Transactional
    public void removeOrderItem(Integer orderId, Integer orderItemId) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Don hang khong ton tai"));

        G8_order_item orderItem = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new RuntimeException("Chi tiet don hang khong ton tai"));

        if (!orderItem.getOrder().getOrderId().equals(orderId)) {
            throw new RuntimeException("Chi tiet don hang khong thuoc don hang nay");
        }

        BigDecimal itemTotal = orderItem.getPriceAtTime().multiply(new BigDecimal(orderItem.getQuantity()));
        order.setTotalAmount(order.getTotalAmount().subtract(itemTotal));
        order.setFinalAmount(order.getFinalAmount().subtract(itemTotal));

        orderRepository.save(order);
        orderItemRepository.deleteById(orderItemId);
    }

    @Transactional
    public G8_order confirmOrder(Integer orderId) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Don hang khong ton tai"));

        if (!"PENDING".equals(order.getStatus())) {
            throw new RuntimeException("Chi co the xac nhan don hang o trang thai PENDING");
        }

        List<G8_order_item> items = orderItemRepository.findByOrderId(orderId);
        if (items.isEmpty()) {
            throw new RuntimeException("Don hang khong co muc nao");
        }

        order.setStatus("PENDING");
        return orderRepository.save(order);
    }

    @Transactional
    public void cancelOrder(Integer orderId) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Don hang khong ton tai"));

        if (!"PENDING".equals(order.getStatus())) {
            throw new RuntimeException("Chi co the huy don hang o trang thai PENDING");
        }

        order.setStatus("CANCELLED");
        order.setCancelledAt(LocalDateTime.now());
        orderRepository.save(order);
    }

    private void validateQuantity(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new RuntimeException("So luong ve khong hop le");
        }
    }

    private void validateAvailableTickets(G8_ticketType ticketType, Integer quantity) {
        int soldQuantity = ticketType.getSoldQuantity() == null ? 0 : ticketType.getSoldQuantity();
        int remainingTickets = ticketType.getTotalQuantity() - soldQuantity;
        if (quantity > remainingTickets) {
            throw new RuntimeException("So luong ve khong du. Con lai: " + remainingTickets);
        }
    }

    private BigDecimal calculateDiscount(BigDecimal totalAmount, G8_promotion promo) {
        if ("PERCENT".equals(promo.getDiscountType())) {
            return totalAmount.multiply(promo.getDiscountValue()).divide(new BigDecimal(100));
        }
        return promo.getDiscountValue();
    }
}
