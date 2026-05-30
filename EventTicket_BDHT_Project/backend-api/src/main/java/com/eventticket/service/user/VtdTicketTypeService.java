package com.eventticket.service.user;

import com.eventticket.entity.G8_ticketType;
import com.eventticket.repository.TicketTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class VtdTicketTypeService {

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    /**
     * GUEST: Xem danh sach cac hang ve dang mo ban cua su kien.
     */
    public List<G8_ticketType> getActiveTicketTypesByEvent(Integer eventId) {
        return ticketTypeRepository.findAvailableTicketsByEventId(eventId);
    }

    /**
     * MEMBER: Xem cac hang ve con hang.
     */
    public List<G8_ticketType> getAvailableTicketsByEvent(Integer eventId) {
        return ticketTypeRepository.findAvailableTicketsByEventId(eventId);
    }

    /**
     * INTERNAL: Tang so luong ve ban, co khoa dong de tranh oversell khi thanh toan dong thoi.
     */
    @Transactional
    public void incrementSoldQuantity(Integer ticketTypeId, Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new RuntimeException("So luong ve khong hop le");
        }

        G8_ticketType ticketType = ticketTypeRepository.findByIdForUpdate(ticketTypeId)
                .orElseThrow(() -> new RuntimeException("Hang ve khong ton tai"));

        int soldQuantity = ticketType.getSoldQuantity() == null ? 0 : ticketType.getSoldQuantity();
        int remainingQuantity = ticketType.getTotalQuantity() - soldQuantity;
        if (quantity > remainingQuantity) {
            throw new RuntimeException("So luong ve khong du. Con lai: " + remainingQuantity);
        }

        ticketType.setSoldQuantity(soldQuantity + quantity);
        ticketTypeRepository.save(ticketType);
    }

    /**
     * INTERNAL: Giam so luong ve da ban khi don hang duoc hoan tien.
     */
    @Transactional
    public void decrementSoldQuantity(Integer ticketTypeId, Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new RuntimeException("So luong ve hoan khong hop le");
        }

        G8_ticketType ticketType = ticketTypeRepository.findByIdForUpdate(ticketTypeId)
                .orElseThrow(() -> new RuntimeException("Hang ve khong ton tai"));

        int soldQuantity = ticketType.getSoldQuantity() == null ? 0 : ticketType.getSoldQuantity();
        ticketType.setSoldQuantity(Math.max(0, soldQuantity - quantity));
        ticketTypeRepository.save(ticketType);
    }
}
