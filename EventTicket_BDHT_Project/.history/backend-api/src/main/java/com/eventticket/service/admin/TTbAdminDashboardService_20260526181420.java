package com.eventticket.service.admin;

import com.eventticket.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class TtbAdminDashboardService {

    @Autowired
    private OrderRepository OrderRepository;

    @Autowired
    private UserRepository UserRepository;

    @Autowired
    private TicketRepository TicketRepository;

    /**
     * ADMIN: Xem Dashboard tổng quan (Tổng doanh thu, Tổng vé, Tổng User)
     */
    public DashboardStats getDashboardStats() {
        long totalOrders = OrderRepository.count();
        long completedOrders = OrderRepository.countCompletedOrders();
        long totalUsers = UserRepository.count();
        long totalTickets = TicketRepository.countActiveTickets();
        long usedTickets = TicketRepository.countCheckedInActiveTickets();
        long totalAdmins = UserRepository.countAdmins();

        return new DashboardStats(
                totalOrders,
                completedOrders,
                totalUsers,
                totalTickets,
                usedTickets,
                totalAdmins);
    }

    /**
     * ADMIN: Xem biểu đồ thống kê doanh thu theo thời gian
     */
    public RevenueStats getRevenueStats(LocalDateTime startDate, LocalDateTime endDate) {
        var orders = OrderRepository.findOrdersByDateRange(startDate, endDate);

        BigDecimal totalRevenue = orders.stream()
                .filter(o -> "COMPLETED".equals(o.getStatus()))
                .map(o -> o.getFinalAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long completedCount = orders.stream()
                .filter(o -> "COMPLETED".equals(o.getStatus()))
                .count();

        return new RevenueStats(
                totalRevenue,
                orders.size(),
                completedCount);
    }

    /**
     * ADMIN: Xem biểu đồ thống kê tỷ lệ bán vé (Theo từng sự kiện)
     */
    public TicketSalesStats getTicketSalesStats(Integer eventId) {
        long totalTickets = TicketRepository.count(); // Cần filter by event
        long usedTickets = TicketRepository.countCheckedInTickets(); // Cần filter by event

        double salesRate = totalTickets > 0 ? (usedTickets * 100.0) / totalTickets : 0;

        return new TicketSalesStats(
                totalTickets,
                usedTickets,
                salesRate);
    }

    // DTO classes
    public static class DashboardStats {
        public long totalOrders;
        public long completedOrders;
        public long totalUsers;
        public long totalTickets;
        public long usedTickets;
        public long totalAdmins;

        public DashboardStats(long totalOrders, long completedOrders, long totalUsers,
                long totalTickets, long usedTickets, long totalAdmins) {
            this.totalOrders = totalOrders;
            this.completedOrders = completedOrders;
            this.totalUsers = totalUsers;
            this.totalTickets = totalTickets;
            this.usedTickets = usedTickets;
            this.totalAdmins = totalAdmins;
        }
    }

    public static class RevenueStats {
        public BigDecimal totalRevenue;
        public int totalOrders;
        public long completedOrders;

        public RevenueStats(BigDecimal totalRevenue, int totalOrders, long completedOrders) {
            this.totalRevenue = totalRevenue;
            this.totalOrders = totalOrders;
            this.completedOrders = completedOrders;
        }
    }

    public static class TicketSalesStats {
        public long totalTickets;
        public long usedTickets;
        public double salesRate;

        public TicketSalesStats(long totalTickets, long usedTickets, double salesRate) {
            this.totalTickets = totalTickets;
            this.usedTickets = usedTickets;
            this.salesRate = salesRate;
        }
    }
}
