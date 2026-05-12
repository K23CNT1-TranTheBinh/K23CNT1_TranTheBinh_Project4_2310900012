package com.eventticket.service;

import com.eventticket.entity.user.Vtd_G8_users;
import com.eventticket.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    /**
     * GUEST: Đăng ký tài khoản người dùng mới
     */
    public Vtd_G8_users registerUser(String email, String password, String fullName, String phoneNumber) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email đã tồn tại trong hệ thống");
        }
        
        Vtd_G8_users user = new Vtd_G8_users();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setPhoneNumber(phoneNumber);
        user.setRole("USER");
        user.setIsVerified(false);
        user.setIsActive(true);
        
        return userRepository.save(user);
    }
    
    /**
     * GUEST: Đăng nhập hệ thống
     */
    public Vtd_G8_users loginUser(String email, String password) {
        Optional<Vtd_G8_users> userOpt = userRepository.findByEmail(email);
        
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Email không tồn tại");
        }
        
        Vtd_G8_users user = userOpt.get();
        
        if (!user.getIsActive()) {
            throw new RuntimeException("Tài khoản đã bị khóa");
        }
        
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu không chính xác");
        }
        
        return user;
    }
    
    /**
     * GUEST: Quên mật khẩu (Gửi email yêu cầu khôi phục)
     */
    public void requestPasswordReset(String email) {
        Optional<Vtd_G8_users> userOpt = userRepository.findByEmail(email);
        
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Email không tồn tại trong hệ thống");
        }
        
        Vtd_G8_users user = userOpt.get();
        String resetToken = UUID.randomUUID().toString();
        LocalDateTime expiryTime = LocalDateTime.now().plusHours(1);
        
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(expiryTime);
        userRepository.save(user);
        
        // TODO: Gửi email với link reset password
        // emailService.sendPasswordResetEmail(email, resetToken);
    }
    
    /**
     * MEMBER: Đặt lại mật khẩu mới (Reset Password)
     */
    public void resetPassword(String resetToken, String newPassword) {
        Optional<Vtd_G8_users> userOpt = userRepository.findByResetToken(resetToken);
        
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Token không hợp lệ");
        }
        
        Vtd_G8_users user = userOpt.get();
        
        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Token đã hết hạn");
        }
        
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }
    
    /**
     * MEMBER: Đổi mật khẩu tài khoản (Khi đang đăng nhập)
     */
    public void changePassword(Integer userId, String oldPassword, String newPassword) {
        Vtd_G8_users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
        
        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu cũ không chính xác");
        }
        
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
