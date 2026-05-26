package com.eventticket.controller.admin;

import com.eventticket.entity.G8_order;
import com.eventticket.service.admin.AdminOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor 
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    // ==========================================
    // 1. Xem danh sách và Lọc đơn hàng
    // API: GET /api/admin/orders
    // ==========================================
    @GetMapping
    public ResponseEntity<List<G8_order>> getOrders(
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        return ResponseEntity.ok(adminOrderService.getOrders(userId, status, startDate, endDate));
    }

    // ==========================================
    // 2. Lấy chi tiết 1 đơn hàng theo ID
    // API: GET /api/admin/orders/{id}
    // ==========================================
    @GetMapping("/{id}")
    public ResponseEntity<G8_order> getOrderById(@PathVariable Integer id) {
        return ResponseEntity.ok(adminOrderService.getOrderById(id));
    }

    // ==========================================
    // 3. Cập nhật trạng thái đơn hàng (Duyệt/Hủy)
    // API: PUT /api/admin/orders/update-status/{id}?status=COMPLETED
    // ==========================================
    @PutMapping("/update-status/{id}")
    public ResponseEntity<G8_order> updateOrderStatus(
            @PathVariable Integer id,
            @RequestParam String status) {
        return ResponseEntity.ok(adminOrderService.updateOrderStatus(id, status));
    }

    // ==========================================
    // 4. Xóa hoàn toàn đơn hàng khỏi hệ thống
    // API: DELETE /api/admin/orders/delete/{id}
    // ==========================================
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteOrder(@PathVariable Integer id) {
        adminOrderService.deleteOrder(id);
        return ResponseEntity.ok("Xóa đơn hàng thành công!");
    }

    // ==========================================
    // 5. Tạo mới đơn hàng (Admin tự tạo đơn offline)
    // API: POST /api/admin/orders/add
    // ==========================================
    @PostMapping("/add")
    public ResponseEntity<G8_order> createOrder(@RequestBody G8_order order) {
        return ResponseEntity.ok(adminOrderService.createOrder(order));
    }
}