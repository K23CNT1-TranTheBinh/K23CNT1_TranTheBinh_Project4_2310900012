package com.eventticket.service.user;

import com.eventticket.config.AiChatProperties;
import com.eventticket.entity.G8_AiChatLog;
import com.eventticket.entity.G8_users;
import com.eventticket.repository.AiChatLogRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);
    private static final String FALLBACK_MESSAGE = "AI chưa được cấu hình. Vui lòng thêm biến môi trường AI_CHAT_API_KEY và cấu hình provider phù hợp.\n\nNếu bạn chưa biết bắt đầu, hãy làm theo 3 bước: 1) Xem sự kiện, 2) Đăng ký/đăng nhập, 3) Chọn vé và thanh toán.";
    private static final String ERROR_MESSAGE = "AI tạm thời đang bận hoặc không phản hồi. Bạn vẫn có thể bắt đầu ngay:\n\nBước 1: Xem sự kiện nổi bật hoặc tìm theo địa điểm/ngày.\nBước 2: Đăng ký/đăng nhập để lưu lịch sử và theo dõi đơn hàng.\nBước 3: Chọn vé, kiểm tra tổng tiền và xác nhận thanh toán.\n\nNếu bạn muốn, hãy thử lại sau vài phút hoặc nói rõ bạn muốn xem sự kiện, đăng ký, hay đặt vé.";

    private final AiChatLogRepository aiChatLogRepository;
    private final AiChatProperties aiChatProperties;
    private final RestClient.Builder restClientBuilder;

    public AiChatService(AiChatLogRepository aiChatLogRepository,
            AiChatProperties aiChatProperties,
            RestClient.Builder restClientBuilder) {
        this.aiChatLogRepository = aiChatLogRepository;
        this.aiChatProperties = aiChatProperties;
        this.restClientBuilder = restClientBuilder;
    }

    public boolean isConfigured() {
        String provider = getProviderName();
        if (aiChatProperties.getApiKey() == null || aiChatProperties.getApiKey().isBlank()) {
            return false;
        }

        return switch (provider) {
            case "azure-openai" -> !isBlank(aiChatProperties.getAzureEndpoint())
                    && !isBlank(aiChatProperties.getAzureDeployment());
            case "gemini" -> true;
            default -> true;
        };
    }

    public String getProviderName() {
        String provider = aiChatProperties.getProvider();
        return provider == null ? "openai" : provider.trim().toLowerCase(Locale.ROOT);
    }

    public String getResolvedModel() {
        return switch (getProviderName()) {
            case "gemini" -> aiChatProperties.getGeminiModel();
            case "azure-openai" -> aiChatProperties.getAzureDeployment();
            default -> aiChatProperties.getModel();
        };
    }

    public String getStatusText() {
        return isConfigured() ? "AI thật đang hoạt động" : "AI chưa được cấu hình";
    }

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

    /**
     * INTERNAL: Gọi provider AI thật.
     */
    public String generateAiResponse(String userMessage) {
        if (!isConfigured()) {
            log.warn("AI chat is not configured. Returning smart fallback response.");
            return generateSmartFallback(userMessage);
        }

        try {
            return switch (getProviderName()) {
                case "azure-openai" -> extractOpenAiResponse(callAzureOpenAI(userMessage));
                case "gemini" -> extractGeminiResponse(callGemini(userMessage));
                default -> extractOpenAiResponse(callOpenAI(userMessage));
            };
        } catch (Exception ex) {
            log.error("Failed to call AI provider, using smart fallback", ex);
            return generateSmartFallback(userMessage);
        }
    }

    private String generateSmartFallback(String userMessage) {
        if (userMessage == null) return "Xin chào! Tôi là trợ lý BDHT Assistant. Tôi có thể hỗ trợ bạn tìm kiếm sự kiện, hướng dẫn đăng ký/đăng nhập, hoặc giải đáp thắc mắc về mua vé. Hãy cho tôi biết bạn cần hỗ trợ gì nhé!";
        
        String msg = userMessage.toLowerCase();
        
        if (msg.contains("đăng nhập") || msg.contains("login") || msg.contains("đăng nhâp")) {
            return "Để đăng nhập vào tài khoản BDHT, bạn vui lòng sử dụng liên kết đăng nhập tôi đã gửi. Đăng nhập sẽ giúp bạn lưu lịch sử mua vé và theo dõi đơn hàng dễ dàng hơn!";
        }
        if (msg.contains("đăng ký") || msg.contains("register")) {
            return "Để đăng ký tài khoản mới trên BDHT, vui lòng nhấp vào liên kết đăng ký tôi đã gửi. Chỉ mất chưa đầy 1 phút để tạo tài khoản!";
        }
        if (msg.contains("sự kiện") || msg.contains("liveshow") || msg.contains("concert") || msg.contains("show") || msg.contains("event") || msg.contains("vé")) {
            return "BDHT có rất nhiều sự kiện âm nhạc, workshop, thể thao hấp dẫn đang mở bán vé. Bạn có thể gõ tên chủ đề bạn muốn tìm kiếm (ví dụ: 'âm nhạc', 'workshop') để tôi lọc sự kiện nhanh chóng cho bạn!";
        }
        if (msg.contains("thanh toán") || msg.contains("mua vé") || msg.contains("đặt vé")) {
            return "Quy trình mua vé trên BDHT cực kỳ đơn giản:\n1. Chọn sự kiện bạn yêu thích.\n2. Chọn hạng vé và số lượng.\n3. Nhấn 'Mua Vé Ngay' và điền thông tin khách hàng.\n4. Chọn phương thức thanh toán (VietQR, Momo, Zalopay...) và hoàn tất giao dịch.";
        }
        if (msg.contains("giá") || msg.contains("tiền")) {
            return "Giá vé của mỗi sự kiện phụ thuộc vào hạng vé (Standard, VIP...) mà bạn lựa chọn. Bạn có thể click 'Xem chi tiết' tại bất kỳ sự kiện nào để xem bảng giá vé chi tiết nhất.";
        }
        
        return "Xin chào! Tôi là trợ lý BDHT Assistant. Tôi có thể giúp bạn tìm kiếm sự kiện theo chủ đề, cung cấp liên kết đăng nhập/đăng ký nhanh, và hướng dẫn quy trình đặt vé. Bạn cần tôi hỗ trợ thông tin gì ạ?";
    }

    private Map<String, Object> callOpenAI(String userMessage) {
        return buildClient(aiChatProperties.getBaseUrl())
                .post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + aiChatProperties.getApiKey())
                .body(buildOpenAiPayload(userMessage))
                .retrieve()
                .body(Map.class);
    }

    private Map<String, Object> callAzureOpenAI(String userMessage) {
        String endpoint = aiChatProperties.getAzureEndpoint().replaceAll("/+$", "");
        String deployment = aiChatProperties.getAzureDeployment();
        String apiVersion = aiChatProperties.getAzureApiVersion();
        return buildClient(endpoint)
                .post()
                .uri("/openai/deployments/" + deployment + "/chat/completions?api-version=" + apiVersion)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + aiChatProperties.getApiKey())
                .body(buildOpenAiPayload(userMessage))
                .retrieve()
                .body(Map.class);
    }

    private String callGemini(String userMessage) {
        byte[] responseBytes = buildClient("https://generativelanguage.googleapis.com")
                .post()
                .uri("/v1beta/models/" + aiChatProperties.getGeminiModel() + ":generateContent?key="
                        + aiChatProperties.getApiKey())
                .body(buildGeminiPayload(userMessage))
                .retrieve()
                .body(byte[].class);

        return new String(responseBytes, StandardCharsets.UTF_8);
    }

    private RestClient buildClient(String baseUrl) {
        return restClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    private Map<String, Object> buildOpenAiPayload(String userMessage) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("model", getProviderName().equals("azure-openai") ? aiChatProperties.getAzureDeployment()
                : aiChatProperties.getModel());
        payload.put("temperature", aiChatProperties.getTemperature());
        payload.put("max_tokens", aiChatProperties.getMaxTokens());
        payload.put("messages", List.of(
                Map.of("role", "system", "content", aiChatProperties.getSystemPrompt()),
                Map.of("role", "user", "content", userMessage)));
        return payload;
    }

    private Map<String, Object> buildGeminiPayload(String userMessage) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("systemInstruction", Map.of(
                "role", "system",
                "parts", List.of(Map.of("text", aiChatProperties.getSystemPrompt()))));
        payload.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage)))));
        return payload;
    }

    private String extractOpenAiResponse(Map<String, Object> response) {
        if (response == null) {
            throw new IllegalStateException("AI provider returned an empty response.");
        }

        Object choices = response.get("choices");
        if (!(choices instanceof List<?> choicesList) || choicesList.isEmpty()) {
            throw new IllegalStateException("AI provider did not return any choices.");
        }

        Object firstChoice = choicesList.get(0);
        if (!(firstChoice instanceof Map<?, ?> firstChoiceMap)) {
            throw new IllegalStateException("AI provider returned an invalid first choice payload.");
        }

        Object message = firstChoiceMap.get("message");
        if (!(message instanceof Map<?, ?> messageMap)) {
            throw new IllegalStateException("AI provider returned an invalid message payload.");
        }

        String aiText = Objects.toString(messageMap.get("content"), "").trim();
        if (aiText.isBlank()) {
            throw new IllegalStateException("AI provider returned an empty message content.");
        }

        return aiText;
    }

    String extractGeminiResponse(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            throw new IllegalStateException("AI provider returned an empty response.");
        }

        try {
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new IllegalStateException("AI provider did not return any candidates.");
            }

            JsonNode firstCandidate = candidates.get(0);
            JsonNode textNode = firstCandidate
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text");

            String aiText = textNode.asText().trim();
            if (aiText.isBlank()) {
                throw new IllegalStateException("AI provider returned an empty text payload.");
            }

            return aiText;
        } catch (Exception ex) {
            throw new IllegalStateException("AI provider returned an invalid JSON payload.", ex);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}