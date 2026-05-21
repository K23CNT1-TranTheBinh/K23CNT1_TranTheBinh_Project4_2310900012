package com.eventticket.controller.user;

import com.eventticket.entity.G8_order;
import com.eventticket.entity.G8_order_item;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.UserRepository;
import com.eventticket.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import lombok.Data;

@RestController
public class OrderController {

    private final OrderService orderService;
    private final UserRepository userRepository;

    public OrderController(OrderService orderService, UserRepository userRepository) {
        this.orderService = orderService;
        this.userRepository = userRepository;
    }

    /**
     * Lấy ID người dùng hiện tại
     */
    private Integer getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return null;
        }
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .map(G8_users::getUserId)
                .orElse(null);
    }

    /**
     * MEMBER: Tạo đơn hàng mới (tạo giỏ hàng)
     */
    @PostMapping("/api/ttb/member/orders")
    public ResponseEntity<G8_order> createOrder() {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        G8_order order = orderService.createOrder(userId);
        return ResponseEntity.ok(order);
    }

    /**
     * MEMBER: Thêm loại vé vào giỏ hàng
     */
    @PostMapping("/api/ttb/member/orders/{orderId}/items")
    public ResponseEntity<G8_order_item> addTicketTypeToOrder(
            @PathVariable Integer orderId,
            @RequestBody AddTicketRequest request) {
        G8_order_item orderItem = orderService.addTicketTypeToOrder(
                orderId,
                request.getTicketTypeId(),
                request.getQuantity());
        return ResponseEntity.ok(orderItem);
    }

    /**
     * MEMBER: Xem chi tiết đơn hàng
     */
    @GetMapping("/api/ttb/member/orders/{orderId}")
    public ResponseEntity<G8_order> getOrderDetails(@PathVariable Integer orderId) {
        G8_order order = orderService.getOrderDetails(orderId);
        return ResponseEntity.ok(order);
    }

    /**
     * MEMBER: Xem lịch sử đơn hàng của người dùng
     */
    @GetMapping("/api/ttb/member/orders")
    public ResponseEntity<List<G8_order>> getUserOrders() {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        List<G8_order> orders = orderService.getUserOrders(userId);
        return ResponseEntity.ok(orders);
    }

    /**
     * MEMBER: Lấy các mục trong giỏ hàng
     */
    @GetMapping("/api/ttb/member/orders/{orderId}/items")
    public ResponseEntity<List<G8_order_item>> getOrderItems(@PathVariable Integer orderId) {
        List<G8_order_item> items = orderService.getOrderItems(orderId);
        return ResponseEntity.ok(items);
    }

    /**
     * MEMBER: Xóa một mục khỏi giỏ hàng
     */
    @DeleteMapping("/api/ttb/member/orders/{orderId}/items/{orderItemId}")
    public ResponseEntity<Void> removeOrderItem(
            @PathVariable Integer orderId,
            @PathVariable Integer orderItemId) {
        orderService.removeOrderItem(orderId, orderItemId);
        return ResponseEntity.noContent().build();
    }

    /**
     * MEMBER: Cập nhật số lượng vé trong giỏ hàng
     */
    @PutMapping("/api/ttb/member/orders/{orderId}/items/{orderItemId}")
    public ResponseEntity<G8_order_item> updateOrderItem(
            @PathVariable Integer orderId,
            @PathVariable Integer orderItemId,
            @RequestBody UpdateQuantityRequest request) {
        G8_order_item item = orderService.updateOrderItemQuantity(orderId, orderItemId, request.getQuantity());
        return ResponseEntity.ok(item);
    }

    /**
     * MEMBER: Xác nhận đơn hàng (chuyển từ PENDING sang CONFIRMED)
     */
    @PostMapping("/api/ttb/member/orders/{orderId}/confirm")
    public ResponseEntity<G8_order> confirmOrder(@PathVariable Integer orderId) {
        G8_order order = orderService.confirmOrder(orderId);
        return ResponseEntity.ok(order);
    }

    /**
     * DTO: Yêu cầu thêm loại vé
     */
    @Data
    public static class AddTicketRequest {
        private Integer ticketTypeId;
        private Integer quantity;

        public Integer getTicketTypeId() {
            return ticketTypeId;
        }

        public void setTicketTypeId(Integer ticketTypeId) {
            this.ticketTypeId = ticketTypeId;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }
    }

    /**
     * DTO: Yêu cầu cập nhật số lượng
     */
    @Data
    public static class UpdateQuantityRequest {
        private Integer quantity;

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }
    }
}
