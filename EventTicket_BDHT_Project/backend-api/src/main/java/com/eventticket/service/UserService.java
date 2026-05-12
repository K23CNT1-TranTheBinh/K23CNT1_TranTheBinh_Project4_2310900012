package com.eventticket.service;

import com.eventticket.entity.G8_users;
import com.eventticket.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * MEMBER: Xem thông tin hồ sơ cá nhân
     */
    public G8_users getUserProfile(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
    }

    /**
     * MEMBER: Cập nhật thông tin cá nhân (Họ tên, SĐT)
     */
    public G8_users updateUserProfile(Integer userId, String fullName, String phoneNumber) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        if (fullName != null && !fullName.trim().isEmpty()) {
            user.setFullName(fullName);
        }
        if (phoneNumber != null && !phoneNumber.trim().isEmpty()) {
            user.setPhoneNumber(phoneNumber);
        }

        return userRepository.save(user);
    }

    /**
     * MEMBER: Đổi mật khẩu tài khoản (Khi đang đăng nhập)
     */
    public void changePassword(Integer userId, String oldPassword, String newPassword) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu cũ không chính xác");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    /**
     * ADMIN: Xem danh sách tài khoản người dùng hệ thống
     */
    public List<G8_users> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * ADMIN: Tìm kiếm người dùng (Theo Email, SĐT, Họ tên)
     */
    public List<G8_users> searchUsers(String keyword) {
        return userRepository.findAll().stream()
                .filter(u -> u.getEmail().contains(keyword) ||
                        u.getPhoneNumber() != null && u.getPhoneNumber().contains(keyword) ||
                        u.getFullName().contains(keyword))
                .toList();
    }

    /**
     * ADMIN: Lọc người dùng (Theo Role hoặc Trạng thái)
     */
    public List<G8_users> filterUsers(String role, Boolean isActive) {
        return userRepository.findAll().stream()
                .filter(u -> (role == null || u.getRole().equals(role)) &&
                        (isActive == null || u.getIsActive().equals(isActive)))
                .toList();
    }

    /**
     * ADMIN: Lọc người dùng - Hoạt động
     */
    public List<G8_users> getActiveUsers() {
        return userRepository.findAllActiveUsers();
    }

    /**
     * ADMIN: Khóa tài khoản người dùng (Block/Ban)
     */
    public G8_users blockUser(Integer userId) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        user.setIsActive(false);
        return userRepository.save(user);
    }

    /**
     * ADMIN: Mở khóa tài khoản người dùng
     */
    public G8_users unblockUser(Integer userId) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        user.setIsActive(true);
        return userRepository.save(user);
    }

    /**
     * ADMIN: Đếm số lượng admin
     */
    public long countAdmins() {
        return userRepository.countAdmins();
    }
}
