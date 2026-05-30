package com.eventticket.service.admin;

import com.eventticket.entity.G8_order;
import com.eventticket.entity.G8_order_item;
import com.eventticket.entity.G8_payment;
import com.eventticket.repository.OrderItemRepository;
import com.eventticket.repository.OrderRepository;
import com.eventticket.repository.PaymentRepository;
import com.eventticket.service.user.VtdTicketTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminOrderService {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final VtdTicketTypeService ticketTypeService;

    public List<G8_order> getOrders(Integer userId, String status, LocalDateTime startDate, LocalDateTime endDate) {
        if (startDate != null && endDate != null) {
            return orderRepository.findOrdersByDateRange(startDate, endDate);
        }
        if (userId != null && status != null && !status.trim().isEmpty()) {
            return orderRepository.findByUserIdAndStatus(userId, status);
        }
        if (userId != null) {
            return orderRepository.findByUser_UserId(userId);
        }
        if (status != null && !status.trim().isEmpty()) {
            return orderRepository.findByStatus(status);
        }
        return orderRepository.findAll();
    }

    public G8_order getOrderById(Integer id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay don hang voi ID: " + id));
    }

    public List<G8_order_item> getOrderItems(Integer orderId) {
        return orderItemRepository.findByOrderId(orderId);
    }

    public G8_order updateOrderStatus(Integer id, String status) {
        if ("REFUNDED".equals(status)) {
            return approveRefund(id);
        }

        G8_order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay don hang voi ID: " + id));

        order.setStatus(status);
        return orderRepository.save(order);
    }

    public void deleteOrder(Integer id) {
        G8_order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay don hang voi ID: " + id));

        orderRepository.delete(order);
    }

    public G8_order createOrder(G8_order order) {
        if (order.getStatus() == null || order.getStatus().trim().isEmpty()) {
            order.setStatus("COMPLETED");
        }

        return orderRepository.save(order);
    }

    @Transactional
    public G8_order approveRefund(Integer orderId) {
        G8_order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay don hang voi ID: " + orderId));

        if ("REFUNDED".equals(order.getStatus())) {
            return order;
        }

        if (!"REFUND_REQUESTED".equals(order.getStatus())) {
            throw new RuntimeException("Chi co the duyet hoan tien cho don dang yeu cau hoan tien");
        }

        List<G8_order_item> items = orderItemRepository.findByOrderId(orderId);
        for (G8_order_item item : items) {
            if (item.getTicketType() != null) {
                ticketTypeService.decrementSoldQuantity(
                        item.getTicketType().getTicketTypeId(),
                        item.getQuantity());
            }
        }

        order.setStatus("REFUNDED");
        orderRepository.save(order);

        List<G8_payment> payments = paymentRepository.findByOrderId(orderId);
        for (G8_payment payment : payments) {
            if ("REFUND_REQUESTED".equals(payment.getStatus()) || "SUCCESS".equals(payment.getStatus())) {
                payment.setStatus("REFUNDED");
                paymentRepository.save(payment);
            }
        }

        return order;
    }
}
