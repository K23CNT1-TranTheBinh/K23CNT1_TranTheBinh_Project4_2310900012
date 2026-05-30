package com.eventticket.controller.admin;

import com.eventticket.service.admin.TtbAdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/ttb/admin/dashboard")
@RequiredArgsConstructor
public class TtbAdminDashboardController {

    private final TtbAdminDashboardService adminDashboardService;

    // ==========================================
    // 1. Lấy thống kê tổng quan cho trang chủ (Tổng đơn, Tổng vé, Tổng User...)
    // API: GET /api/ttb/admin/dashboard/stats
    // ==========================================
    @GetMapping("/stats")
    public ResponseEntity<TtbAdminDashboardService.DashboardStats> getDashboardStats() {
        return ResponseEntity.ok(adminDashboardService.getDashboardStats());
    }

    // ==========================================
    // 2. Thống kê doanh thu theo khoảng thời gian (Vẽ biểu đồ đường/cột)
    // API: GET /api/ttb/admin/dashboard/revenue?startDate=...&endDate=...
    // ==========================================
    @GetMapping("/revenue")
    public ResponseEntity<TtbAdminDashboardService.RevenueStats> getRevenueStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        return ResponseEntity.ok(adminDashboardService.getRevenueStats(startDate, endDate));
    }

    // ==========================================
    // 3. Thống kê tỷ lệ bán vé của một sự kiện cụ thể (Vẽ biểu đồ tròn)
    // API: GET /api/ttb/admin/dashboard/ticket-sales/{eventId}
    // ==========================================
    @GetMapping("/ticket-sales/{eventId}")
    public ResponseEntity<TtbAdminDashboardService.TicketSalesStats> getTicketSalesStats(
            @PathVariable Integer eventId) {

        return ResponseEntity.ok(adminDashboardService.getTicketSalesStats(eventId));
    }
}