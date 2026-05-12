package com.eventticket.service;

import com.eventticket.entity.G8_ticket;
import com.eventticket.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TicketService {

    @Autowired
    private TicketRepository ticketRepository;

    /**
     * MEMBER: Xem Kho vé điện tử (Danh sách các vé đã mua)
     */
    public List<G8_ticket> getUserTickets(Integer userId) {
        return ticketRepository.findByUserId(userId);
    }

    /**
     * MEMBER: Hiển thị mã QR Code của từng vé
     */
    public G8_ticket getTicketQrCode(Integer ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Vé không tồn tại"));
    }

    /**
     * ADMIN: Xem danh sách toàn bộ vé điện tử đã phát hành
     */
    public List<G8_ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    /**
     * ADMIN: Tìm kiếm vé điện tử (Theo QR code)
     */
    public G8_ticket findTicketByQrCode(String qrCode) {
        return ticketRepository.findByQrCode(qrCode)
                .orElseThrow(() -> new RuntimeException("Vé không tồn tại"));
    }

    /**
     * ADMIN: Lọc vé (Theo trạng thái Check-in)
     */
    public List<G8_ticket> getTicketsByCheckInStatus(Boolean checkInStatus) {
        return ticketRepository.findByCheckInStatus(checkInStatus);
    }

    /**
     * ADMIN: Quét mã QR soát vé tại cổng (Check-in)
     */
    public G8_ticket checkInTicket(String qrCode) {
        G8_ticket ticket = ticketRepository.findByQrCode(qrCode)
                .orElseThrow(() -> new RuntimeException("Vé không tồn tại"));

        if (ticket.getCheckInStatus() != null && ticket.getCheckInStatus()) {
            throw new RuntimeException("Vé này đã được sử dụng rồi");
        }

        ticket.setCheckInStatus(true);
        ticket.setCheckedInAt(LocalDateTime.now());

        return ticketRepository.save(ticket);
    }

    /**
     * ADMIN: Xác nhận check-in vé (Ghi nhận thời gian khách vào cổng)
     */
    public G8_ticket confirmCheckIn(Integer ticketId) {
        G8_ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Vé không tồn tại"));

        if (ticket.getCheckInStatus() != null && ticket.getCheckInStatus()) {
            throw new RuntimeException("Vé này đã được check-in rồi");
        }

        ticket.setCheckInStatus(true);
        ticket.setCheckedInAt(LocalDateTime.now());

        return ticketRepository.save(ticket);
    }

    /**
     * INTERNAL: Tạo vé mới (Được gọi khi thanh toán thành công)
     */
    public G8_ticket createTicket(G8_ticket ticket) {
        if (ticket.getCheckInStatus() == null) {
            ticket.setCheckInStatus(false);
        }

        // TODO: Generate QR code từ ticket id

        return ticketRepository.save(ticket);
    }
}
