package com.eventticket.service.user;

import com.eventticket.entity.G8_order;
import com.eventticket.entity.G8_order_item;
import com.eventticket.entity.G8_payment;
import com.eventticket.entity.G8_ticket;
import com.eventticket.repository.OrderItemRepository;
import com.eventticket.repository.OrderRepository;
import com.eventticket.repository.PaymentRepository;
import com.eventticket.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import java.util.HexFormat;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
public class VtdPaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private VtdTicketTypeService ticketTypeService;

    // Thêm vào đầu class VtdPaymentService
    // ⚠️ Đổi 3 giá trị này thành thông tin ngân hàng của bạn
    private static final String BANK_ID = "MB"; // Mã ngân hàng (xem bảng bên dưới)
    private static final String ACCOUNT_NO = "0345578911111"; // Số tài khoản của bạn
    private static final String ACCOUNT_NAME = "Vu Tien Duc"; // Tên tài khoản

    /**
     * Tạo URL ảnh QR từ VietQR
     */
    public String generateVietQrUrl(G8_payment payment) {
        String description = "DH" + payment.getOrder().getOrderId();
        try {
            return String.format(
                    "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                    BANK_ID,
                    ACCOUNT_NO,
                    payment.getAmount().toPlainString(),
                    URLEncoder.encode(description, StandardCharsets.UTF_8),
                    URLEncoder.encode(ACCOUNT_NAME, StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("Không thể tạo QR");
        }
    }

    @Value("${sepay.webhook.secret}")
    private String sePaySecret;

    /**
     * Xác thực chữ ký HMAC-SHA256 từ SePay
     */
    public boolean verifySePaySignature(String signature, Map<String, Object> body) {
        if (signature == null || signature.isBlank())
            return false;
        try {
            String payload = new com.fasterxml.jackson.databind.ObjectMapper()
                    .writeValueAsString(body);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(sePaySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String computed = HexFormat.of().formatHex(hash);
            return computed.equalsIgnoreCase(signature);
        } catch (Exception e) {
            System.out.println("⚠️ Lỗi xác thực HMAC: " + e.getMessage());
            return false;
        }
    }

    /**
     * Tìm payment PENDING theo orderId → cập nhật SUCCESS
     */
    @Transactional
    public void confirmPaymentByOrderId(Integer orderId, String transactionId) {
        List<G8_payment> payments = paymentRepository.findByOrderId(orderId);
        G8_payment pending = payments.stream()
                .filter(p -> "PENDING".equals(p.getStatus()))
                .findFirst()
                .orElse(null);

        if (pending == null) {
            System.out.println("⚠️ Không tìm thấy payment PENDING cho order: " + orderId);
            return;
        }

        updatePaymentStatus(pending.getPaymentId(), "SUCCESS", transactionId);
    }

    /**
     * MEMBER
     * : Chọn ph
     * ương thức thanh toán và tạo giao dịch thanh toán.
     */
    public G8_payment createPayment(G8_order order, String paymentMethod) {
        if (!paymentMethod.matches("MOMO|VNPAY|ZALOPAY|CASH|BANK_TRANSFER")) {
            throw new RuntimeException("Phương thức thanh toán không hợp lệ");
        }

        G8_payment payment = new G8_payment();
        payment.setOrder(order);
        payment.setPaymentMethod(paymentMethod);
        payment.setAmount(order.getFinalAmount());
        payment.setStatus("PENDING");

        return paymentRepository.save(payment);
    }

    /**
     * MEMBER: Nhận và hiển thị kết quả giao dịch.
     */
    public G8_payment getPaymentStatus(Integer paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));
    }

    /**
     * INTERNAL: Webhook cập nhật trạng thái thanh toán.
     * Nếu SUCCESS thì hoàn tất đơn hàng và tạo vé điện tử kèm QR code.
     */
    @Transactional
    public G8_payment updatePaymentStatus(Integer paymentId, String status, String transactionId) {
        G8_payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        payment.setStatus(status);
        payment.setTransactionId(transactionId);

        if ("SUCCESS".equals(status)) {
            payment.setPaidAt(LocalDateTime.now());
            completeOrderAndCreateTickets(payment.getOrder());
        }

        return paymentRepository.save(payment);
    }

    /**
     * MEMBER: Yêu cầu hoàn tiền.
     */
    public G8_payment requestRefund(Integer paymentId) {
        G8_payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        if (!"SUCCESS".equals(payment.getStatus())) {
            throw new RuntimeException("Chỉ có thể hoàn tiền cho những giao dịch thành công");
        }

        payment.setStatus("REFUND_REQUESTED");
        return paymentRepository.save(payment);
    }

    /**
     * INTERNAL: Tạo vé sau thanh toán thành công.
     * Có kiểm tra order đã có vé chưa để webhook gọi lại không sinh trùng vé.
     */
    private void completeOrderAndCreateTickets(G8_order order) {
        if (order == null) {
            throw new RuntimeException("Thanh toán không gắn với đơn hàng");
        }

        if (ticketRepository.countTicketsByOrderId(order.getOrderId()) > 0) {
            order.setStatus("COMPLETED");
            orderRepository.save(order);
            return;
        }

        for (G8_order_item item : orderItemRepository.findByOrderId(order.getOrderId())) {
            ticketTypeService.incrementSoldQuantity(item.getTicketType().getTicketTypeId(), item.getQuantity());

            for (int i = 0; i < item.getQuantity(); i++) {
                G8_ticket ticket = new G8_ticket();
                ticket.setOrder(order);
                ticket.setTicketType(item.getTicketType());
                ticket.setQrCode(generateQrCode());
                ticket.setCheckInStatus(false);
                ticketRepository.save(ticket);
            }
        }

        order.setStatus("COMPLETED");
        orderRepository.save(order);
    }

    private String generateQrCode() {
        return "TICKET-" + UUID.randomUUID();
    }
}
