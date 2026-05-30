package com.eventticket.controller.admin;

import com.eventticket.service.admin.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/lpth/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    // ==========================================
    // 1. Lấy thống kê tổng quan cho trang chủ (Tổng đơn, Tổng vé, Tổng User...)
    // API: GET /api/lpth/admin/dashboard/stats
    // ==========================================
    @GetMapping("/stats")
    public ResponseEntity<AdminDashboardService.DashboardStats> getDashboardStats() {
        return ResponseEntity.ok(adminDashboardService.getDashboardStats());
    }

    // ==========================================
    // 2. Thống kê doanh thu theo khoảng thời gian (Vẽ biểu đồ đường/cột)
    // API: GET /api/lpth/admin/dashboard/revenue?startDate=...&endDate=...
    // ==========================================
    @GetMapping("/revenue")
    public ResponseEntity<AdminDashboardService.RevenueStats> getRevenueStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        return ResponseEntity.ok(adminDashboardService.getRevenueStats(startDate, endDate));
    }

    // ==========================================
    // 3. Thống kê tỷ lệ bán vé của một sự kiện cụ thể (Vẽ biểu đồ tròn)
    // API: GET /api/lpth/admin/dashboard/ticket-sales/{eventId}
    // ==========================================
    @GetMapping("/ticket-sales/{eventId}")
    public ResponseEntity<AdminDashboardService.TicketSalesStats> getTicketSalesStats(
            @PathVariable Integer eventId) {

        return ResponseEntity.ok(adminDashboardService.getTicketSalesStats(eventId));
    }
}