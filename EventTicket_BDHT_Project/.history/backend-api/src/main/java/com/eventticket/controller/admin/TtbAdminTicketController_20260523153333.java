package com.eventticket.controller.admin;

import com.eventticket.entity.G8_ticket;
import com.eventticket.service.admin.AdminTicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lpth/admin/tickets")
@RequiredArgsConstructor
public class AdminTicketController {

    private final AdminTicketService adminTicketService;

    // Xem danh sách toàn bộ vé điện tử
    @GetMapping("/all")
    public ResponseEntity<List<G8_ticket>> getAllTickets() {
        return ResponseEntity.ok(adminTicketService.getAllTicketsForAdmin());
    }

    // Tính năng #74: Tìm kiếm vé theo mã QR Code (Dùng để hiển thị thông tin vé trước khi check-in)
    @GetMapping("/qr/{qrCode}")
    public ResponseEntity<G8_ticket> getByQrCode(@PathVariable String qrCode) {
        return ResponseEntity.ok(adminTicketService.findTicketByQrCode(qrCode));
    }

    // Lọc danh sách vé theo trạng thái Check-in
    @GetMapping("/status/{checkInStatus}")
    public ResponseEntity<List<G8_ticket>> getByCheckInStatus(@PathVariable Boolean checkInStatus) {
        return ResponseEntity.ok(adminTicketService.filterTicketsByCheckInStatus(checkInStatus));
    }

    // -------------------------------------------------------------
    // TÍNH NĂNG #75: API DÀNH RIÊNG CHO NGHIỆP VỤ CHECK-IN TẠI CỔNG
    // -------------------------------------------------------------
    
    /**
     * API: Xác nhận Check-in vé và ghi nhận thời gian
     * URL: POST /api/lpth/admin/tickets/process-checkin/{qrCode}
     */
    @PostMapping("/process-checkin/{qrCode}")
    public ResponseEntity<?> processTicketCheckIn(@PathVariable String qrCode) {
        try {
            // Gọi Service để xử lý logic check-in (Đổi status, lưu thời gian, check trùng)
            G8_ticket checkedInTicket = adminTicketService.processCheckInLogic(qrCode);
            
            // Trả về JSON thông báo thành công kèm thông tin vé
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Check-in thành công!");
            response.put("ticket", checkedInTicket);
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            // Bắt lỗi từ Service (VD: Vé đã được sử dụng trước đó)
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }
}