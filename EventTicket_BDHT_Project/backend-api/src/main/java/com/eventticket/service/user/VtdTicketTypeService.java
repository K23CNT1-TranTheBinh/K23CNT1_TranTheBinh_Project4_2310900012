package com.eventticket.service.user;

import com.eventticket.entity.G8_ticketType;
import com.eventticket.repository.TicketTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VtdTicketTypeService {

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    /**
     * GUEST: Xem danh sách các hạng vé đang mở bán của sự kiện
     */
    public List<G8_ticketType> getActiveTicketTypesByEvent(Integer eventId) {
        return ticketTypeRepository.findAvailableTicketsByEventId(eventId);
    }

    /**
     * MEMBER: Xem các hạng vé còn hàng
     */
    public List<G8_ticketType> getAvailableTicketsByEvent(Integer eventId) {
        return ticketTypeRepository.findAvailableTicketsByEventId(eventId);
    }

    /**
     * INTERNAL: Tăng số lượng vé bán
     */
    public void incrementSoldQuantity(Integer ticketTypeId, Integer quantity) {
        G8_ticketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new RuntimeException("Hạng vé không tồn tại"));

        ticketType.setSoldQuantity(ticketType.getSoldQuantity() + quantity);
        ticketTypeRepository.save(ticketType);
    }
}
