package com.eventticket.service.user;

import com.eventticket.entity.G8_AiChatLog;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.AiChatLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class VtdAiChatService {

    @Autowired
    private AiChatLogRepository aiChatLogRepository;

    /**
     * GUEST/MEMBER: Gửi tin nhắn đến AI và lưu lịch sử
     */
    public G8_AiChatLog saveUserMessage(G8_users userId, String sessionCode, String messageText) {
        G8_AiChatLog chatLog = new G8_AiChatLog();
        chatLog.setUser(userId);
        chatLog.setSessionCode(sessionCode);
        chatLog.setSender("USER");
        chatLog.setMessageText(messageText);

        return aiChatLogRepository.save(chatLog);
    }

    /**
     * INTERNAL: Lưu response từ AI
     */
    public G8_AiChatLog saveAiResponse(G8_users userId, String sessionCode, String responseText) {
        G8_AiChatLog chatLog = new G8_AiChatLog();
        chatLog.setUser(userId);
        chatLog.setSessionCode(sessionCode);
        chatLog.setSender("AI");
        chatLog.setMessageText(responseText);

        return aiChatLogRepository.save(chatLog);
    }

    /**
     * GUEST/MEMBER: Lấy lịch sử chat theo session
     */
    public List<G8_AiChatLog> getChatHistory(String sessionCode) {
        return aiChatLogRepository.findBySessionCode(sessionCode);
    }

    /**
     * MEMBER: Lấy lịch sử chat của user
     */
    public List<G8_AiChatLog> getUserChatHistory(Integer userId) {
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
