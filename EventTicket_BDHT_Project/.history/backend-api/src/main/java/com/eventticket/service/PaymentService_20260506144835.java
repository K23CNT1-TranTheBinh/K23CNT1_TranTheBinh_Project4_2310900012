package com.eventticket.service;

import com.eventticket.entity.user.VtdG8Payment;
import com.eventticket.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PaymentService {
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    /**
     * MEMBER: Chọn phương thức thanh toán
     */
    public VtdG8Payment createPayment(Integer orderId, String paymentMethod) {
        // Validate phương thức thanh toán
        if (!paymentMethod.matches("MOMO|VNPAY|ZALOPAY|CASH")) {
            throw new RuntimeException("Phương thức thanh toán không hợp lệ");
        }
        
        VtdG8Payment payment = new VtdG8Payment();
        payment.setOrderId(orderId);
        payment.setPaymentMethod(paymentMethod);
        payment.setStatus("PENDING");
        
        return paymentRepository.save(payment);
    }
    
    /**
     * MEMBER: Nhận và hiển thị kết quả giao dịch
     */
    public VtdG8Payment getPaymentStatus(Integer paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));
    }
    
    /**
     * INTERNAL: Cập nhật trạng thái thanh toán (Webhook từ cổng thanh toán)
     */
    public VtdG8Payment updatePaymentStatus(Integer paymentId, String status, String transactionId) {
        VtdG8Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));
        
        payment.setStatus(status);
        payment.setTransactionId(transactionId);
        
        if ("SUCCESS".equals(status)) {
            payment.setPaidAt(LocalDateTime.now());
        }
        
        return paymentRepository.save(payment);
    }
    
    /**
     * ADMIN: Xem danh sách thanh toán
     */
    public List<VtdG8Payment> getAllPayments() {
        return paymentRepository.findAll();
    }
    
    /**
     * ADMIN: Lọc thanh toán (Theo phương thức)
     */
    public List<VtdG8Payment> getPaymentsByMethod(String method) {
        return paymentRepository.findByPaymentMethod(method);
    }
    
    /**
     * ADMIN: Lọc thanh toán (Theo trạng thái)
     */
    public List<VtdG8Payment> getPaymentsByStatus(String status) {
        return paymentRepository.findByStatus(status);
    }
    
    /**
     * ADMIN: Tìm giao dịch theo Transaction ID
     */
    public VtdG8Payment findPaymentByTransactionId(String transactionId) {
        return paymentRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));
    }
}
