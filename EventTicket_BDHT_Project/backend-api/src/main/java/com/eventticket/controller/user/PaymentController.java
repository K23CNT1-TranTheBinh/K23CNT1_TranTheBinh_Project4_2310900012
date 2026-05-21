package com.eventticket.controller.user;

import com.eventticket.entity.G8_order;
import com.eventticket.entity.G8_payment;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.OrderRepository;
import com.eventticket.repository.UserRepository;
import com.eventticket.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

import lombok.Data;

@RestController
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    public PaymentController(
            PaymentService paymentService,
            UserRepository userRepository,
            OrderRepository orderRepository) {

        this.paymentService = paymentService;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
    }

    /**
     * Lấy ID người dùng hiện tại
     */
    private Integer getCurrentUserId() {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        if (auth == null
                || auth.getName() == null
                || auth.getName().isBlank()) {

            return null;
        }

        String email = auth.getName();

        return userRepository.findByEmail(email)
                .map(G8_users::getUserId)
                .orElse(null);
    }

    /**
     * MEMBER: Tạo giao dịch thanh toán
     */
    @PostMapping("/api/ttb/member/payments")
    public ResponseEntity<G8_payment> createPayment(
            @RequestBody CreatePaymentRequest request) {

        Integer userId = getCurrentUserId();

        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }

        G8_order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() ->
                        new RuntimeException("Đơn hàng không tồn tại"));

        G8_payment payment = paymentService.createPayment(
                order,
                request.getPaymentMethod());

        return ResponseEntity.ok(payment);
    }

    /**
     * MEMBER: Kiểm tra trạng thái thanh toán
     */
    @GetMapping("/api/ttb/member/payments/{paymentId}")
    public ResponseEntity<G8_payment> getPaymentStatus(
            @PathVariable Integer paymentId) {

        G8_payment payment =
                paymentService.getPaymentStatus(paymentId);

        return ResponseEntity.ok(payment);
    }

    /**
     * INTERNAL: Webhook cập nhật trạng thái thanh toán
     */
    @PostMapping("/api/ttb/public/payments/{paymentId}/webhook")
    public ResponseEntity<Map<String, String>> updatePaymentStatus(
            @PathVariable Integer paymentId,
            @RequestBody PaymentWebhookRequest request) {

        G8_payment payment = paymentService.updatePaymentStatus(
                paymentId,
                request.getStatus(),
                request.getTransactionId());

        Map<String, String> response = new HashMap<>();

        response.put("status", "updated");
        response.put("paymentStatus", payment.getStatus());

        return ResponseEntity.ok(response);
    }

    /**
     * MEMBER: Yêu cầu hoàn tiền
     */
    @PostMapping("/api/ttb/member/payments/{paymentId}/refund")
    public ResponseEntity<G8_payment> requestRefund(
            @PathVariable Integer paymentId) {

        G8_payment payment =
                paymentService.requestRefund(paymentId);

        return ResponseEntity.ok(payment);
    }

    /**
     * DTO: Yêu cầu tạo thanh toán
     */
    @Data
    public static class CreatePaymentRequest {

        private Integer orderId;

        // MOMO, VNPAY, ZALOPAY, CASH
        private String paymentMethod;

        public Integer getOrderId() {
            return orderId;
        }

        public void setOrderId(Integer orderId) {
            this.orderId = orderId;
        }

        public String getPaymentMethod() {
            return paymentMethod;
        }

        public void setPaymentMethod(String paymentMethod) {
            this.paymentMethod = paymentMethod;
        }
    }

    /**
     * DTO: Webhook từ cổng thanh toán
     */
    @Data
    public static class PaymentWebhookRequest {

        private String status;
        private String transactionId;

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getTransactionId() {
            return transactionId;
        }

        public void setTransactionId(String transactionId) {
            this.transactionId = transactionId;
        }
    }
}