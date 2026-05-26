package com.eventticket.service;

import com.eventticket.entity.user.G8_users;
import com.eventticket.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

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
     * ADMIN: Xem danh sách tài khoản người dùng hệ thống
     */
    public List<G8_users> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * ADMIN: Tìm kiếm người dùng (Theo Email, SĐT, Họ tên)
     */
    public Optional<G8_users> searchUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * ADMIN: Lọc người dùng (Theo Role)
     */
    public List<G8_users> getUsersByRole(String role) {
        return userRepository.findByRole(role);
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
}
