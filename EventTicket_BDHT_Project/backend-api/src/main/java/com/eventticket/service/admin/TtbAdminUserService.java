package com.eventticket.service.admin;

import com.eventticket.entity.G8_users;
import com.eventticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TtbAdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // ==========================================
    // # Xem DS toàn bộ users
    // ==========================================
    public List<G8_users> getAllUsers() {
        return userRepository.findAll();
    }

    // ==========================================
    // # Tìm kiếm người dùng (Theo Email, SĐT, Họ tên)
    // ==========================================
    public List<G8_users> searchUsers(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return userRepository.findAll();
        }
        String lowerKeyword = keyword.toLowerCase();

        return userRepository.findAll().stream()
                .filter(u -> (u.getEmail() != null && u.getEmail().toLowerCase().contains(lowerKeyword)) ||
                        (u.getPhoneNumber() != null && u.getPhoneNumber().contains(keyword)) ||
                        (u.getFullName() != null && u.getFullName().toLowerCase().contains(lowerKeyword)))
                .toList();
    }

    // ==========================================
    // # Lọc người dùng (Theo Role hoặc Trạng thái)
    // ==========================================
    public List<G8_users> filterUsers(String role, Boolean isActive) {
        return userRepository.findAll().stream()
                .filter(u -> (role == null || u.getRole().equalsIgnoreCase(role)) &&
                        (isActive == null || u.getIsActive().equals(isActive)))
                .toList();
    }

    // ==========================================
    // # Khóa tài khoản người dùng (Soft Delete)
    // ==========================================
    public G8_users blockUser(Integer userId) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));

        user.setIsActive(false);
        return userRepository.save(user);
    }

    // ==========================================
    // # Mở khóa tài khoản người dùng
    // ==========================================
    public G8_users unblockUser(Integer userId) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));

        user.setIsActive(true);
        return userRepository.save(user);
    }

    // ==========================================
    // CHỨC NĂNG BỔ SUNG: Thêm mới người dùng
    // ==========================================
    public G8_users createUser(G8_users user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email này đã được sử dụng trên hệ thống!");
        }
        // Mã hóa mật khẩu trước khi lưu
        if (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        }
        return userRepository.save(user);
    }

    // ==========================================
    // CHỨC NĂNG BỔ SUNG: Xóa hẳn khỏi Database (Hard Delete)
    // ==========================================
    public void deleteUser(Integer userId) {
        G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));
        userRepository.delete(user);
    }

    // ==========================================
    // CÁC HÀM PHỤ TRỢ KHÁC
    // ==========================================

    // Chi tiết hồ sơ 1 người dùng
    public G8_users getUserProfile(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));
    }

    // Danh sách người dùng đang hoạt động
    public List<G8_users> getActiveUsers() {
        return userRepository.findAllActiveUsers();
    }

    // Đếm tổng số lượng Admin
    public long countAdmins() {
        return userRepository.countAdmins();
    }
}