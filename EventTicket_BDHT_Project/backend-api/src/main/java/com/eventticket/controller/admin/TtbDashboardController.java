package com.eventticket.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.eventticket.service.admin.TtbDashboardService;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/ttb/dashboard")
@RequiredArgsConstructor
public class TtbDashboardController {

    private final TtbDashboardService ttbDashboardService;

    // ==========================================
    // 1. Lấy thống kê tổng quan cho trang chủ (Tổng đơn, Tổng vé, Tổng User...)
    // API: GET /api/ttb/dashboard/stats
    // ==========================================
    @GetMapping("/stats")
    public ResponseEntity<TtbDashboardService.DashboardStats> getDashboardStats() {
        return ResponseEntity.ok(ttbDashboardService.getDashboardStats());
    }

    // ==========================================
    // 2. Thống kê doanh thu theo khoảng thời gian (Vẽ biểu đồ đường/cột)
    // API: GET /api/ttb/dashboard/revenue?startDate=...&endDate=...
    // ==========================================
    @GetMapping("/revenue")
    public ResponseEntity<TtbDashboardService.RevenueStats> getRevenueStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        return ResponseEntity.ok(ttbDashboardService.getRevenueStats(startDate, endDate));
    }

    // ==========================================
    // 3. Thống kê tỷ lệ bán vé của một sự kiện cụ thể (Vẽ biểu đồ tròn)
    // API: GET /api/ttb/dashboard/ticket-sales/{eventId}
    // ==========================================
    @GetMapping("/ticket-sales/{eventId}")
    public ResponseEntity<TtbDashboardService.TicketSalesStats> getTicketSalesStats(
            @PathVariable Integer eventId) {
        
        return ResponseEntity.ok(ttbDashboardService.getTicketSalesStats(eventId));
    }
}