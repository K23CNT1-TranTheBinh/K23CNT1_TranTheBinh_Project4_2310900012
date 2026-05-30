package com.eventticket.controller.user;

import com.eventticket.entity.G8_users;
import com.eventticket.repository.UserRepository;
import com.eventticket.service.user.VtdUserService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import lombok.Data;

@RestController
public class VtdUserProfileController {

    private final VtdUserService userService;
    private final UserRepository userRepository;

    public VtdUserProfileController(VtdUserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    /**
     * Lấy ID người dùng hiện tại
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
     * MEMBER: Xem thông tin hồ sơ cá nhân
     */
    @GetMapping("/api/vtd/member/profile")
    public ResponseEntity<G8_users> getUserProfile() {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        G8_users user = userService.getUserProfile(userId);
        return ResponseEntity.ok(user);
    }

    /**
     * MEMBER: Cập nhật thông tin hồ sơ cá nhân
     */
    @PutMapping("/api/vtd/member/profile")
    public ResponseEntity<G8_users> updateUserProfile(@RequestBody UpdateProfileRequest request) {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        G8_users user = userService.updateUserProfile(
                userId,
                request.getFullName(),
                request.getPhoneNumber());
        return ResponseEntity.ok(user);
    }

    /**
     * MEMBER: Đổi mật khẩu tài khoản
     */
    @PostMapping("/api/vtd/member/change-password")
    public ResponseEntity<String> changePassword(@RequestBody ChangePasswordRequest request) {
        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().build();
        }
        userService.changePassword(
                userId,
                request.getOldPassword(),
                request.getNewPassword());
        return ResponseEntity.ok("Mật khẩu đã được thay đổi thành công");
    }

    /**
     * DTO: Yêu cầu cập nhật hồ sơ
     */
    @Data
    public static class UpdateProfileRequest {
        private String fullName;
        private String phoneNumber;
    }

    /**
     * DTO: Yêu cầu đổi mật khẩu
     */
    @Data
    public static class ChangePasswordRequest {
        private String oldPassword;
        private String newPassword;
    }
}
