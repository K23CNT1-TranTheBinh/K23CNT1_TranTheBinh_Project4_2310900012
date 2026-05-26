package com.eventticket.service;

import com.eventticket.entity.user.G8_ticketType;
import com.eventticket.repository.TicketTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TicketTypeService {
    
    @Autowired
    private TicketTypeRepository ticketTypeRepository;
    
    /**
     * GUEST: Xem danh sách các hạng vé đang mở bán của sự kiện
     */
    public List<G8_ticketType> getActiveTicketTypesByEvent(Integer eventId) {
        return ticketTypeRepository.findActiveTicketTypesByEventId(eventId);
    }
    
    /**
     * MEMBER: Xem các hạng vé còn hàng
     */
    public List<G8_ticketType> getAvailableTicketsByEvent(Integer eventId) {
        return ticketTypeRepository.findAvailableTicketsByEventId(eventId);
    }
    
    /**
     * ADMIN: Xem danh sách hạng vé của một sự kiện
     */
    public List<G8_ticketType> getTicketTypesByEvent(Integer eventId) {
        return ticketTypeRepository.findByEventId(eventId);
    }
    
    /**
     * ADMIN: Thêm hạng vé mới
     */
    public G8_ticketType createTicketType(G8_ticketType ticketType) {
        if (ticketType.getQuantitySold() == null) {
            ticketType.setQuantitySold(0);
        }
        if (ticketType.getIsActive() == null) {
            ticketType.setIsActive(true);
        }
        
        return ticketTypeRepository.save(ticketType);
    }
    
    /**
     * ADMIN: Cập nhật giá vé hoặc số lượng vé
     */
    public G8_ticketType updateTicketType(Integer ticketTypeId, G8_ticketType ticketTypeDetails) {
        G8_ticketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new RuntimeException("Hạng vé không tồn tại"));
        
        if (ticketTypeDetails.getPrice() != null) ticketType.setPrice(ticketTypeDetails.getPrice());
        if (ticketTypeDetails.getQuantityAvailable() != null) ticketType.setQuantityAvailable(ticketTypeDetails.getQuantityAvailable());
        if (ticketTypeDetails.getTypeName() != null) ticketType.setTypeName(ticketTypeDetails.getTypeName());
        
        return ticketTypeRepository.save(ticketType);
    }
    
    /**
     * ADMIN: Xóa hạng vé (Chỉ khi số vé bán ra = 0)
     */
    public void deleteTicketType(Integer ticketTypeId) {
        Vtd_G8_ticketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new RuntimeException("Hạng vé không tồn tại"));
        
        if (ticketType.getQuantitySold() > 0) {
            throw new RuntimeException("Không thể xóa hạng vé vì đã có vé được bán");
        }
        
        ticketTypeRepository.deleteById(ticketTypeId);
    }
    
    /**
     * INTERNAL: Tăng số lượng vé bán
     */
    public void incrementSoldQuantity(Integer ticketTypeId, Integer quantity) {
        Vtd_G8_ticketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new RuntimeException("Hạng vé không tồn tại"));
        
        ticketType.setQuantitySold(ticketType.getQuantitySold() + quantity);
        ticketTypeRepository.save(ticketType);
    }
}
