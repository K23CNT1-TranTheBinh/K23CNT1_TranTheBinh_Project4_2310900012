package com.eventticket.service.user;

import com.eventticket.entity.G8_ticket;
import com.eventticket.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class VtdTicketService {

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
