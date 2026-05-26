package com.eventticket.service.admin;

import com.eventticket.entity.G8_order;
import com.eventticket.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminOrderService {

    private final OrderRepository orderRepository;

    // ==========================================
    // 1. Lọc và lấy danh sách đơn hàng
    // ==========================================
    public List<G8_order> getOrders(Integer userId, String status, LocalDateTime startDate, LocalDateTime endDate) {
        // Ưu tiên 1: Lọc theo khoảng thời gian
        if (startDate != null && endDate != null) {
            return orderRepository.findOrdersByDateRange(startDate, endDate);
        }
        // Ưu tiên 2: Lọc kết hợp khách hàng và trạng thái
        if (userId != null && status != null && !status.trim().isEmpty()) {
            return orderRepository.findByUserIdAndStatus(userId, status);
        }
        // Ưu tiên 3: Lọc riêng theo khách hàng
        if (userId != null) {
            return orderRepository.findByUser_UserId(userId);
        }
        // Ưu tiên 4: Lọc riêng theo trạng thái đơn
        if (status != null && !status.trim().isEmpty()) {
            return orderRepository.findByStatus(status);
        }
        // Mặc định: Trả về tất cả
        return orderRepository.findAll();
    }

    // ==========================================
    // 2. Lấy chi tiết đơn hàng theo ID
    // ==========================================
    public G8_order getOrderById(Integer id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + id));
    }

    // ==========================================
    // 3. Cập nhật trạng thái đơn hàng
    // ==========================================
    public G8_order updateOrderStatus(Integer id, String status) {
        G8_order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + id));

        order.setStatus(status); 
        return orderRepository.save(order);
    }

    // ==========================================
    // 4. Xóa đơn hàng
    // ==========================================
    public void deleteOrder(Integer id) {
        G8_order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + id));
        
        orderRepository.delete(order);
    }

    // 5. Thêm mới đơn hàng thủ công từ Admin (Bán vé tại quầy / Vé VIP)
    // ==========================================
    public G8_order createOrder(G8_order order) {
        // Nếu Admin không truyền trạng thái, mặc định đơn tự tạo sẽ là COMPLETED (Đã thanh toán)
        if (order.getStatus() == null || order.getStatus().trim().isEmpty()) {
            order.setStatus("COMPLETED");
        }
        
        // Lưu vào cơ sở dữ liệu
        return orderRepository.save(order);
    }
}