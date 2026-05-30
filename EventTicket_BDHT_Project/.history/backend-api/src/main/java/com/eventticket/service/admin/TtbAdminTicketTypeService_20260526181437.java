package com.eventticket.service.admin;

import com.eventticket.entity.G8_event;
import com.eventticket.entity.G8_ticketType;
import com.eventticket.repository.EventRepository;
import com.eventticket.repository.TicketTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TtbAdminTicketTypeService {

    private final TicketTypeRepository ticketTypeRepository;
    private final EventRepository eventRepository;

    public List<G8_ticketType> getTicketTypesByEvent(Integer eventId) {
        return ticketTypeRepository.findByEventId(eventId);
    }

    public G8_ticketType createTicketType(G8_ticketType ticketType, Integer eventId) {
        G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện ID: " + eventId));

        ticketType.setEvent(event);
        return ticketTypeRepository.save(ticketType);
    }

    public G8_ticketType updateTicketType(Integer id, G8_ticketType details) {
        G8_ticketType type = ticketTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy loại vé ID: " + id));

        type.setTypeName(details.getTypeName());
        type.setPrice(details.getPrice());
        type.setTotalQuantity(details.getTotalQuantity());

        return ticketTypeRepository.save(type);
    }

    public void deleteTicketType(Integer id) {
        ticketTypeRepository.deleteById(id);
    }
}