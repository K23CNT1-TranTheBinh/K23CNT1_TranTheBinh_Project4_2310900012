package com.eventticket.service.user;

import com.eventticket.entity.G8_order;
import com.eventticket.entity.G8_order_item;
import com.eventticket.entity.G8_event;
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
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

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

    @Autowired
    private VtdPromotionService promotionService;

    private static final String BANK_ID = "MB";
    private static final String ACCOUNT_NO = "0345578911111";
    private static final String ACCOUNT_NAME = "Vu Tien Duc";
    private static final String BANK_TRANSFER = "BANK_TRANSFER";
    private static final String PENDING = "PENDING";
    private static final String SUCCESS = "SUCCESS";

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
            throw new RuntimeException("Khong the tao QR");
        }
    }

    @Transactional
    public void confirmPaymentByOrderId(Integer orderId, String transactionId) {
        G8_payment pending = paymentRepository
                .findTopByOrder_OrderIdAndStatusAndPaymentMethodOrderByPaymentIdDesc(orderId, PENDING, BANK_TRANSFER)
                .orElse(null);

        if (pending == null) {
            System.out.println("Khong tim thay BANK_TRANSFER payment PENDING cho orderId: " + orderId);
            return;
        }

        updatePaymentStatus(pending.getPaymentId(), SUCCESS, transactionId);
    }

    public G8_payment createPayment(G8_order order, String paymentMethod) {
        if (paymentMethod == null || !paymentMethod.matches("MOMO|VNPAY|ZALOPAY|CASH|BANK_TRANSFER")) {
            throw new RuntimeException("Phuong thuc thanh toan khong hop le");
        }

        G8_payment payment = new G8_payment();
        payment.setOrder(order);
        payment.setPaymentMethod(paymentMethod);
        payment.setAmount(order.getFinalAmount());
        payment.setStatus(PENDING);

        return paymentRepository.save(payment);
    }

    public G8_payment getPaymentStatus(Integer paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dich khong ton tai"));
    }

    @Transactional
    public G8_payment updatePaymentStatus(Integer paymentId, String status, String transactionId) {
        G8_payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dich khong ton tai"));

        payment.setStatus(status);
        payment.setTransactionId(transactionId);

        if (SUCCESS.equals(status)) {
            payment.setPaidAt(LocalDateTime.now());
            completeOrderAndCreateTickets(payment.getOrder());
        }

        return paymentRepository.save(payment);
    }

    public G8_payment requestRefund(Integer paymentId) {
        G8_payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dich khong ton tai"));

        if (!SUCCESS.equals(payment.getStatus())) {
            throw new RuntimeException("Chi co the hoan tien cho giao dich thanh cong");
        }

        // Kiểm tra xem sự kiện đã bắt đầu hoặc kết thúc chưa
        if (payment.getOrder() != null) {
            List<G8_order_item> items = orderItemRepository.findByOrderId(payment.getOrder().getOrderId());
            for (G8_order_item item : items) {
                if (item.getTicketType() != null && item.getTicketType().getEvent() != null) {
                    G8_event event = item.getTicketType().getEvent();
                    if (event.getStartTime() != null && LocalDateTime.now().isAfter(event.getStartTime())) {
                        throw new RuntimeException("Không thể hoàn vì sự kiện này đã bắt đầu hoặc kết thúc");
                    }
                }
            }
        }

        payment.setStatus("REFUND_REQUESTED");
        
        if (payment.getOrder() != null) {
            G8_order order = payment.getOrder();
            order.setStatus("REFUND_REQUESTED");
            orderRepository.save(order);
        }

        return paymentRepository.save(payment);
    }

    private void completeOrderAndCreateTickets(G8_order order) {
        if (order == null) {
            throw new RuntimeException("Thanh toan khong gan voi don hang");
        }

        if (ticketRepository.countTicketsByOrderId(order.getOrderId()) > 0) {
            order.setStatus("COMPLETED");
            orderRepository.save(order);
            return;
        }

        List<G8_order_item> items = orderItemRepository.findByOrderId(order.getOrderId());
        items.sort(Comparator.comparing(item -> item.getTicketType().getTicketTypeId()));

        for (G8_order_item item : items) {
            ticketTypeService.incrementSoldQuantity(item.getTicketType().getTicketTypeId(), item.getQuantity());
        }

        for (G8_order_item item : items) {
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

        // Tăng lượt sử dụng mã giảm giá nếu có áp dụng
        if (order.getPromotion() != null) {
            try {
                promotionService.incrementUsageCount(order.getPromotion().getPromotionId());
            } catch (Exception e) {
                System.err.println("Lỗi tăng lượt sử dụng mã giảm giá: " + e.getMessage());
            }
        }
    }

    public List<G8_payment> getPaymentsByOrderId(Integer orderId) {
        return paymentRepository.findByOrderId(orderId);
    }

    private String generateQrCode() {
        return "TICKET-" + UUID.randomUUID();
    }
}
