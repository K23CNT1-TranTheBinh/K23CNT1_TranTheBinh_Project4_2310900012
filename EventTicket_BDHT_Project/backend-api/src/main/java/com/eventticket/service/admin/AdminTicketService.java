package com.eventticket.service.admin;

import com.eventticket.entity.G8_ticket;
import com.eventticket.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor // Dùng luôn Lombok cho đồng bộ style
public class AdminTicketService {

    private final TicketRepository ticketRepository;

    // Xem toàn bộ danh sách vé
    public List<G8_ticket> getAllTicketsForAdmin() {
        return ticketRepository.findAll();
    }

    // Tìm vé theo QR Code
    public G8_ticket findTicketByQrCode(String qrCode) {
        return ticketRepository.findByQrCode(qrCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vé điện tử với mã QR: " + qrCode));
    }

    // Lọc vé theo trạng thái
    public List<G8_ticket> filterTicketsByCheckInStatus(Boolean checkInStatus) {
        return ticketRepository.findByCheckInStatus(checkInStatus);
    }

    // ====================================================================
    // TÍNH NĂNG #75: HÀM DÀNH CHO NHÂN VIÊN SOÁT VÉ QUÉT QR TẠI CỔNG
    // ====================================================================
    public G8_ticket processCheckInLogic(String qrCode) {
        // 1. Tìm vé theo mã QR
        G8_ticket ticket = ticketRepository.findByQrCode(qrCode)
                .orElseThrow(() -> new RuntimeException("Lỗi: Mã QR không hợp lệ. Không tìm thấy vé trong hệ thống!"));

        // 2. Kiểm tra xem vé ĐÃ BỊ SỬ DỤNG chưa (Rất quan trọng để chống gian lận)
        if (Boolean.TRUE.equals(ticket.getCheckInStatus())) {
            throw new RuntimeException("TỪ CHỐI CẤP PHÉP: Vé này đã được sử dụng để vào cổng lúc: " 
                                        + ticket.getCheckedInAt());
        }

        // 3. Nếu vé hợp lệ -> Thực hiện Check-in
        ticket.setCheckInStatus(true); // Đổi trạng thái
        ticket.setCheckedInAt(LocalDateTime.now()); // Ghi nhận thời gian vào cổng

        // 4. Lưu vào Database
        return ticketRepository.save(ticket);
    }

    // ====================================================================
    // HÀM DÀNH CHO ADMIN CAN THIỆP THỦ CÔNG (Force Update)
    // ====================================================================
    public G8_ticket updateTicketStatus(Integer id, Boolean status) {
        G8_ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vé với ID: " + id));
        
        ticket.setCheckInStatus(status);
        
        // Nếu admin set là "Đã check-in" (true) thì lưu giờ hiện tại
        // Nếu admin set lại là "Chưa check-in" (false) thì xóa giờ (set null)
        if (Boolean.TRUE.equals(status)) {
            ticket.setCheckedInAt(LocalDateTime.now());
        } else {
            ticket.setCheckedInAt(null);
        }
        
        return ticketRepository.save(ticket);
    }
}