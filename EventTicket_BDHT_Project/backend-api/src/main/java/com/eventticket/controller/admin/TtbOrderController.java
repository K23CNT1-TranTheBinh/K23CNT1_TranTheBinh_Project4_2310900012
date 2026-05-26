package com.eventticket.controller.admin;

import com.eventticket.entity.G8_order;
import com.eventticket.service.admin.TtbOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/ttb/orders")
@RequiredArgsConstructor 
public class TtbOrderController {

    private final TtbOrderService ttbOrderService;

    // ==========================================
    // 1. Xem danh sách và Lọc đơn hàng (ĐÃ THÊM KEYWORD)
    // API: GET /api/ttb/orders?keyword=...
    // ==========================================
    @GetMapping
    public ResponseEntity<List<G8_order>> getOrders(
            @RequestParam(required = false) String keyword, // THÊM DÒNG NÀY ĐỂ HỨNG TỪ KHÓA TÌM KIẾM
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        // TRUYỀN THÊM KEYWORD VÀO SERVICE
        return ResponseEntity.ok(ttbOrderService.getOrders(keyword, userId, status, startDate, endDate));
    }

    // ==========================================
    // 2. Lấy chi tiết 1 đơn hàng theo ID
    // API: GET /api/ttb/orders/{id}
    // ==========================================
    @GetMapping("/{id}")
    public ResponseEntity<G8_order> getOrderById(@PathVariable Integer id) {
        return ResponseEntity.ok(ttbOrderService.getOrderById(id));
    }

    // ==========================================
    // 3. Cập nhật trạng thái đơn hàng (Duyệt/Hủy)
    // API: PUT /api/ttb/orders/update-status/{id}?status=COMPLETED
    // ==========================================
    @PutMapping("/update-status/{id}")
    public ResponseEntity<G8_order> updateOrderStatus(
            @PathVariable Integer id,
            @RequestParam String status) {
        return ResponseEntity.ok(ttbOrderService.updateOrderStatus(id, status));
    }

    // ==========================================
    // 4. Xóa hoàn toàn đơn hàng khỏi hệ thống
    // API: DELETE /api/ttb/orders/delete/{id}
    // ==========================================
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteOrder(@PathVariable Integer id) {
        ttbOrderService.deleteOrder(id);
        return ResponseEntity.ok("Xóa đơn hàng thành công!");
    }

    // ==========================================
    // 5. Tạo mới đơn hàng (ttb tự tạo đơn offline)
    // API: POST /api/ttb/orders/add
    // ==========================================
    @PostMapping("/add")
    public ResponseEntity<G8_order> createOrder(@RequestBody G8_order order) {
        return ResponseEntity.ok(ttbOrderService.createOrder(order));
    }
}