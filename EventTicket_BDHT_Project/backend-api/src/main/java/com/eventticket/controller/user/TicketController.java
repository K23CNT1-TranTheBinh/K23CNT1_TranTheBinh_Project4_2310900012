package com.eventticket.controller.user;

import com.eventticket.entity.G8_ticket;
import com.eventticket.entity.G8_ticketType;
import com.eventticket.service.TicketService;
import com.eventticket.service.TicketTypeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.eventticket.entity.G8_users;
import com.eventticket.repository.UserRepository;

import java.util.List;

@RestController
public class TicketController {

    private final TicketService ticketService;
    private final TicketTypeService ticketTypeService;
    private final UserRepository userRepository;

    public TicketController(TicketService ticketService, TicketTypeService ticketTypeService,
            UserRepository userRepository) {
        this.ticketService = ticketService;
        this.ticketTypeService = ticketTypeService;
        this.userRepository = userRepository;
    }

    /**
     * Lấy ID người dùng hiện tại
     */
    private Integer getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return null;
        }
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .map(G8_users::getUserId)
                .orElse(null);
    }

    /**
     * GUEST: Xem danh sách loại vé của sự kiện
     */
    @GetMapping("/api/ttb/public/ticket-types/{eventId}")
    public ResponseEntity<List<G8_ticketType>> getActiveTicketTypes(@PathVariable Integer eventId) {
        List<G8_ticketType> ticketTypes = ticketTypeService.getActiveTicketTypesByEvent(eventId);
        return ResponseEntity.ok(ticketTypes);
    }

    /**
     * MEMBER: Xem các loại vé còn hàng
     */
    @GetMapping("/api/ttb/member/ticket-types/{eventId}/available")
    public ResponseEntity<List<G8_ticketType>> getAvailableTicketTypes(@PathVariable Integer eventId) {
        List<G8_ticketType> ticketTypes = ticketTypeService.getAvailableTicketsByEvent(eventId);
        return ResponseEntity.ok(ticketTypes);
    }

    /**
     * MEMBER: Xem kho vé điện tử (danh sách vé đã mua)
     */
    @GetMapping("/api/ttb/member/my-tickets")
    public ResponseEntity<List<G8_ticket>> getUserTickets() {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        List<G8_ticket> tickets = ticketService.getUserTickets(userId);
        return ResponseEntity.ok(tickets);
    }

    /**
     * MEMBER: Xem QR code của vé
     */
    @GetMapping("/api/ttb/member/tickets/{ticketId}")
    public ResponseEntity<G8_ticket> getTicketQrCode(@PathVariable Integer ticketId) {
        G8_ticket ticket = ticketService.getTicketQrCode(ticketId);
        return ResponseEntity.ok(ticket);
    }

    /**
     * DTO: Thông tin chi tiết hạng vé
     */
    public static class TicketTypeDTO {
        private Integer ticketTypeId;
        private String typeName;
        private java.math.BigDecimal price;
        private Integer totalQuantity;
        private Integer soldQuantity;
        private Integer remainingQuantity;

        public TicketTypeDTO(G8_ticketType ticketType) {
            this.ticketTypeId = ticketType.getTicketTypeId();
            this.typeName = ticketType.getTypeName();
            this.price = ticketType.getPrice();
            this.totalQuantity = ticketType.getTotalQuantity();
            this.soldQuantity = ticketType.getSoldQuantity();
            this.remainingQuantity = (ticketType.getTotalQuantity() - ticketType.getSoldQuantity());
        }

        public Integer getTicketTypeId() {
            return ticketTypeId;
        }

        public String getTypeName() {
            return typeName;
        }

        public java.math.BigDecimal getPrice() {
            return price;
        }

        public Integer getTotalQuantity() {
            return totalQuantity;
        }

        public Integer getSoldQuantity() {
            return soldQuantity;
        }

        public Integer getRemainingQuantity() {
            return remainingQuantity;
        }
    }
}
