package com.eventticket.controller.user;

import com.eventticket.entity.G8_order;
import com.eventticket.entity.G8_order_item;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.UserRepository;
import com.eventticket.service.user.VtdOrderService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import lombok.Data;

@RestController
public class VtdOrderController {

    private final VtdOrderService orderService;
    private final UserRepository userRepository;

    public VtdOrderController(VtdOrderService orderService, UserRepository userRepository) {
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
     * SECURITY: Chỉ cho phép member thao tác trên đơn hàng của chính mình.
     */
    private boolean isCurrentUserOrder(Integer orderId, Integer userId) {
        if (userId == null) {
            return false;
        }
        G8_order order = orderService.getOrderDetails(orderId);
        return order.getUser() != null && userId.equals(order.getUser().getUserId());
    }

    /**
     * MEMBER: Tạo đơn hàng mới (tạo giỏ hàng)
     */
    @PostMapping("/api/vtd/member/orders")
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
    @PostMapping("/api/vtd/member/orders/{orderId}/items")
    public ResponseEntity<G8_order_item> addTicketTypeToOrder(
            @PathVariable Integer orderId,
            @RequestBody AddTicketRequest request) {
        Integer userId = getCurrentUserId();
        if (!isCurrentUserOrder(orderId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        G8_order_item orderItem = orderService.addTicketTypeToOrder(
                orderId,
                request.getTicketTypeId(),
                request.getQuantity());
        return ResponseEntity.ok(orderItem);
    }

    /**
     * MEMBER: Xem chi tiết đơn hàng
     */
    @GetMapping("/api/vtd/member/orders/{orderId}")
    public ResponseEntity<G8_order> getOrderDetails(@PathVariable Integer orderId) {
        Integer userId = getCurrentUserId();
        if (!isCurrentUserOrder(orderId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        G8_order order = orderService.getOrderDetails(orderId);
        return ResponseEntity.ok(order);
    }

    /**
     * MEMBER: Xem lịch sử đơn hàng của người dùng
     */
    @GetMapping("/api/vtd/member/orders")
    public ResponseEntity<List<G8_order>> getUserOrders() {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        List<G8_order> orders = orderService.getUserOrders(userId);
        return ResponseEntity.ok(orders);
    }

    /**
     * MEMBER: Tìm kiếm/lọc đơn hàng cá nhân theo trạng thái.
     * Ví dụ: /api/vtd/member/orders/status?status=PENDING
     */
    @GetMapping("/api/vtd/member/orders/status")
    public ResponseEntity<List<G8_order>> getUserOrdersByStatus(@RequestParam String status) {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        List<G8_order> orders = orderService.getUserOrdersByStatus(userId, status);
        return ResponseEntity.ok(orders);
    }

    /**
     * MEMBER: Lấy các mục trong giỏ hàng
     */
    @GetMapping("/api/vtd/member/orders/{orderId}/items")
    public ResponseEntity<List<G8_order_item>> getOrderItems(@PathVariable Integer orderId) {
        Integer userId = getCurrentUserId();
        if (!isCurrentUserOrder(orderId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<G8_order_item> items = orderService.getOrderItems(orderId);
        return ResponseEntity.ok(items);
    }

    /**
     * MEMBER: Xóa một mục khỏi giỏ hàng
     */
    @DeleteMapping("/api/vtd/member/orders/{orderId}/items/{orderItemId}")
    public ResponseEntity<Void> removeOrderItem(
            @PathVariable Integer orderId,
            @PathVariable Integer orderItemId) {
        Integer userId = getCurrentUserId();
        if (!isCurrentUserOrder(orderId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        orderService.removeOrderItem(orderId, orderItemId);
        return ResponseEntity.noContent().build();
    }

    /**
     * MEMBER: Cập nhật số lượng vé trong giỏ hàng
     */
    @PutMapping("/api/vtd/member/orders/{orderId}/items/{orderItemId}")
    public ResponseEntity<G8_order_item> updateOrderItem(
            @PathVariable Integer orderId,
            @PathVariable Integer orderItemId,
            @RequestBody UpdateQuantityRequest request) {
        Integer userId = getCurrentUserId();
        if (!isCurrentUserOrder(orderId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        G8_order_item item = orderService.updateOrderItemQuantity(orderId, orderItemId, request.getQuantity());
        return ResponseEntity.ok(item);
    }

    /**
     * MEMBER: Áp dụng mã giảm giá trực tiếp vào đơn hàng.
     */
    @PostMapping("/api/vtd/member/orders/{orderId}/promotion")
    public ResponseEntity<?> applyPromotion(
            @PathVariable Integer orderId,
            @RequestBody PromotionRequest request) {
        Integer userId = getCurrentUserId();
        if (!isCurrentUserOrder(orderId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            G8_order order = orderService.applyPromotionToOrder(orderId, request.getPromotionCode());
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * MEMBER: Gỡ bỏ mã giảm giá đã áp dụng khỏi đơn hàng.
     */
    @DeleteMapping("/api/vtd/member/orders/{orderId}/promotion")
    public ResponseEntity<G8_order> removePromotion(@PathVariable Integer orderId) {
        Integer userId = getCurrentUserId();
        if (!isCurrentUserOrder(orderId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        G8_order order = orderService.removePromotionFromOrder(orderId);
        return ResponseEntity.ok(order);
    }

    /**
     * MEMBER: Xác nhận đơn hàng (giữ trạng thái PENDING, chờ thanh toán để chuyển sang COMPLETED)
     */
    @PostMapping("/api/vtd/member/orders/{orderId}/confirm")
    public ResponseEntity<?> confirmOrder(@PathVariable Integer orderId) {
        Integer userId = getCurrentUserId();
        if (!isCurrentUserOrder(orderId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            G8_order order = orderService.confirmOrder(orderId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * MEMBER: Hủy đơn hàng khi đơn còn PENDING.
     */
    @DeleteMapping("/api/vtd/member/orders/{orderId}/cancel")
    public ResponseEntity<Void> cancelOrder(@PathVariable Integer orderId) {
        Integer userId = getCurrentUserId();
        if (!isCurrentUserOrder(orderId, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        orderService.cancelOrder(orderId);
        return ResponseEntity.noContent().build();
    }

    /**
     * DTO: Yêu cầu thêm loại vé
     */
    @Data
    public static class AddTicketRequest {
        private Integer ticketTypeId;
        private Integer quantity;
    }

    /**
     * DTO: Yêu cầu cập nhật số lượng
     */
    @Data
    public static class UpdateQuantityRequest {
        private Integer quantity;
    }

    /**
     * DTO: Yêu cầu áp dụng mã giảm giá cho đơn hàng.
     */
    @Data
    public static class PromotionRequest {
        private String promotionCode;
    }
}
