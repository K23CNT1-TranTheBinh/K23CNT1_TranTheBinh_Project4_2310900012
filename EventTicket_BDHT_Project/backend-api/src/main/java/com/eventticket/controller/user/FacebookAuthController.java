package com.eventticket.controller.user;

import com.eventticket.entity.G8_users;
import com.eventticket.security.JwtUtil;
import com.eventticket.service.SocialAuthService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class FacebookAuthController {

    @Autowired
    private SocialAuthService socialAuthService;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * POST /api/auth/facebook
     * Nhận payload chứa { "accessToken": "..." } để xác thực Facebook Login
     */
    @PostMapping("/facebook")
    public ResponseEntity<Map<String, Object>> facebookLogin(@RequestBody FacebookTokenRequest request) {
        try {
            if (request.getAccessToken() == null || request.getAccessToken().isBlank()) {
                throw new RuntimeException("AccessToken không được để trống");
            }
            
            // Xác thực token qua Graph API & Lấy / Tạo User
            G8_users user = socialAuthService.loginWithProvider("facebook", request.getAccessToken());
            
            // Tạo JWT token
            String roleStr = user.getRole() != null ? user.getRole() : "USER";
            String token = jwtUtil.generateToken(user.getEmail(), roleStr);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đăng nhập bằng Facebook thành công");
            response.put("user", user);
            response.put("token", token);
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Lỗi hệ thống: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FacebookTokenRequest {
        private String accessToken;

        public String getAccessToken() {
            return accessToken;
        }

        public void setAccessToken(String accessToken) {
            this.accessToken = accessToken;
        }
    }
}
