package com.eventticket.controller.user;

import com.eventticket.entity.G8_users;
import com.eventticket.security.JwtUtil;
import com.eventticket.service.user.VtdAuthService;
import com.eventticket.service.user.VtdSocialAuthService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/vtd/public/auth")
public class VtdAuthController {

    @Autowired
    private VtdAuthService authService;

    @Autowired
    private VtdSocialAuthService socialAuthService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest request) {
        try {
            G8_users user = authService.registerUser(request.getEmail(), request.getPassword(), request.getFullName(),
                    request.getPhoneNumber());
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đăng ký tài khoản thành công");
            response.put("user", user);
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

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        try {
            G8_users user = authService.loginUser(request.getEmail(), request.getPassword());
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đăng nhập thành công");
            response.put("user", user);
            response.put("token", jwtUtil.generateToken(user.getEmail(), user.getRole()));
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

    @PostMapping("/social-login")
    public ResponseEntity<Map<String, Object>> socialLogin(@RequestBody SocialLoginRequest request) {
        try {
            G8_users user = socialAuthService.loginWithProvider(request.getProvider(), request.getAccessToken());
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đăng nhập " + request.getProvider() + " thành công");
            response.put("user", user);
            response.put("token", jwtUtil.generateToken(user.getEmail(), user.getRole()));

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

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đăng xuất thành công. Vui lòng xóa token ở phía client.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            long remainingSeconds = authService.requestPasswordReset(request.getEmail());
            Map<String, Object> response = new HashMap<>();
            response.put("message", "OTP đã được gửi đến email của bạn");
            response.put("otpExpiry", remainingSeconds); // Seconds remaining
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

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest request) {
        try {
            authService.verifyOtp(request.getEmail(), request.getOtp());
            Map<String, Object> response = new HashMap<>();
            response.put("verified", true);
            response.put("message", "OTP xác thực thành công! Bạn có thể đặt lại mật khẩu.");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("verified", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("verified", false);
            errorResponse.put("error", "Lỗi hệ thống: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getEmail(), request.getNewPassword());
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Mật khẩu đã được đặt lại thành công!");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Lỗi hệ thống: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        private String email;
        private String password;
        private String fullName;
        private String phoneNumber;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SocialLoginRequest {
        private String provider;
        private String accessToken;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForgotPasswordRequest {
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyOtpRequest {
        private String email;
        private String otp;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        private String email;
        private String newPassword;
    }
}
