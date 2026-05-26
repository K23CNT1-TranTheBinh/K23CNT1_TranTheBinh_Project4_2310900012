package com.eventticket.service;

import com.eventticket.entity.user.VtdG8AiChatLog;
import com.eventticket.repository.AiChatLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AiChatService {
    
    @Autowired
    private AiChatLogRepository aiChatLogRepository;
    
    /**
     * GUEST/MEMBER: Gửi tin nhắn đến AI và lưu lịch sử
     */
    public VtdG8AiChatLog saveUserMessage(Integer userId, String sessionCode, String messageText) {
        VtdG8AiChatLog chatLog = new VtdG8AiChatLog();
        chatLog.setUserId(userId);
        chatLog.setSessionCode(sessionCode);
        chatLog.setSender("USER");
        chatLog.setMessageText(messageText);
        
        return aiChatLogRepository.save(chatLog);
    }
    
    /**
     * INTERNAL: Lưu response từ AI
     */
    public VtdG8AiChatLog saveAiResponse(Integer userId, String sessionCode, String responseText) {
        VtdG8AiChatLog chatLog = new VtdG8AiChatLog();
        chatLog.setUserId(userId);
        chatLog.setSessionCode(sessionCode);
        chatLog.setSender("AI");
        chatLog.setMessageText(responseText);
        
        return aiChatLogRepository.save(chatLog);
    }
    
    /**
     * GUEST/MEMBER: Lấy lịch sử chat theo session
     */
    public List<VtdG8AiChatLog> getChatHistory(String sessionCode) {
        return aiChatLogRepository.findBySessionCode(sessionCode);
    }
    
    /**
     * MEMBER: Lấy lịch sử chat của user
     */
    public List<VtdG8AiChatLog> getUserChatHistory(Integer userId) {
        return aiChatLogRepository.findByUserId(userId);
    }
    
    /**
     * MEMBER: Lấy danh sách session của user
     */
    public List<String> getUserSessions(Integer userId) {
        return aiChatLogRepository.findSessionCodesByUserId(userId);
    }
    
    /**
     * INTERNAL: Tạo session code mới
     */
    public String generateSessionCode() {
        return UUID.randomUUID().toString();
    }
}
