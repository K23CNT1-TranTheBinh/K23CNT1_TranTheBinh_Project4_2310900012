package com.eventticket.controller.user;

import com.eventticket.entity.G8_AiChatLog;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.UserRepository;
import com.eventticket.service.user.VtdAiChatService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.Data;

@RestController
public class AiChatController {

    private final VtdAiChatService aiChatService;
    private final UserRepository userRepository;

    public AiChatController(VtdAiChatService aiChatService, UserRepository userRepository) {
        this.aiChatService = aiChatService;
        this.userRepository = userRepository;
    }

    /**
     * Lấy ID người dùng hiện tại nếu đã đăng nhập
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
     * GUEST/MEMBER: Tạo session code mới
     */
    @GetMapping("/api/vtd/public/ai-chat/generate-session")
    public ResponseEntity<Map<String, String>> generateSession() {
        String sessionCode = aiChatService.generateSessionCode();
        Map<String, String> response = new HashMap<>();
        response.put("sessionCode", sessionCode);
        return ResponseEntity.ok(response);
    }

    /**
     * GUEST/MEMBER: Gửi tin nhắn đến AI
     * Session code có thể là guest session hoặc member session
     */
    @PostMapping("/api/vtd/public/ai-chat/message")
    public ResponseEntity<ChatMessageResponse> sendMessage(@RequestBody SendMessageRequest request) {
        Integer userId = getCurrentUserId();

        // Lưu tin nhắn của user
        G8_AiChatLog userMessage = aiChatService.saveUserMessage(
                userId != null ? userRepository.findById(userId).orElse(null) : null,
                request.getSessionCode(),
                request.getMessage());

        // Mô phỏng response từ AI (trong thực tế, gọi API AI thực tế ở đây)
        String aiResponse = generateAiResponse(request.getMessage());

        G8_AiChatLog aiMessage = aiChatService.saveAiResponse(
                userId != null ? userRepository.findById(userId).orElse(null) : null,
                request.getSessionCode(),
                aiResponse);

        ChatMessageResponse response = new ChatMessageResponse();
        response.setUserMessage(userMessage);
        response.setAiResponse(aiMessage);

        return ResponseEntity.ok(response);
    }

    /**
     * MEMBER: Lấy lịch sử chat theo session code
     */
    @GetMapping("/api/vtd/member/ai-chat/history/{sessionCode}")
    public ResponseEntity<List<G8_AiChatLog>> getChatHistory(@PathVariable String sessionCode) {
        List<G8_AiChatLog> history = aiChatService.getChatHistory(sessionCode);
        return ResponseEntity.ok(history);
    }

    /**
     * MEMBER: Lấy lịch sử chat của user hiện tại
     */
    @GetMapping("/api/vtd/member/ai-chat/my-history")
    public ResponseEntity<List<G8_AiChatLog>> getUserChatHistory() {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        List<G8_AiChatLog> history = aiChatService.getUserChatHistory(userId);
        return ResponseEntity.ok(history);
    }

    /**
     * MEMBER: Lấy danh sách các session của user
     */
    @GetMapping("/api/vtd/member/ai-chat/sessions")
    public ResponseEntity<List<String>> getUserSessions() {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        List<String> sessions = aiChatService.getUserSessions(userId);
        return ResponseEntity.ok(sessions);
    }

    /**
     * Mô phỏng response từ AI (cần replace bằng API AI thực tế)
     */
    private String generateAiResponse(String userMessage) {
        // TODO: Gọi API AI thực tế (OpenAI, Gemini, v.v.)
        return "Xin cảm ơn câu hỏi của bạn. Tôi đang xử lý yêu cầu của bạn: " + userMessage;
    }

    /**
     * DTO: Yêu cầu gửi tin nhắn
     */
    @Data
    public static class SendMessageRequest {
        private String sessionCode;
        private String message;

        public String getSessionCode() {
            return sessionCode;
        }

        public void setSessionCode(String sessionCode) {
            this.sessionCode = sessionCode;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }

    /**
     * DTO: Response tin nhắn
     */
    @Data
    public static class ChatMessageResponse {
        private G8_AiChatLog userMessage;
        private G8_AiChatLog aiResponse;

        public G8_AiChatLog getUserMessage() {
            return userMessage;
        }

        public void setUserMessage(G8_AiChatLog userMessage) {
            this.userMessage = userMessage;
        }

        public G8_AiChatLog getAiResponse() {
            return aiResponse;
        }

        public void setAiResponse(G8_AiChatLog aiResponse) {
            this.aiResponse = aiResponse;
        }
    }
}
