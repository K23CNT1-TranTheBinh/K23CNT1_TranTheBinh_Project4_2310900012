package com.eventticket.service;

import com.eventticket.entity.G8_users;
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
    public G8_users registerUser(String email, String password, String fullName, String phoneNumber) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email đã tồn tại trong hệ thống");
        }

        G8_users user = new G8_users();
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
    public G8_users loginUser(String email, String password) {
        Optional<G8_users> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Email không tồn tại");
        }

        G8_users user = userOpt.get();

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
    public long requestPasswordReset(String email) {
        Optional<G8_users> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Email không tồn tại trong hệ thống");
        }

        G8_users user = userOpt.get();
        // Tạo mã OTP gồm 6 chữ số ngẫu nhiên
        String otp = String.format("%06d", (int) (Math.random() * 1000000));
        LocalDateTime expiryTime = LocalDateTime.now().plusMinutes(3); // Hết hạn trong 3 phút

        user.setResetToken(otp);
        user.setResetTokenExpiry(expiryTime);
        userRepository.save(user);

        // TODO: Gửi email với mã OTP thực tế
        // emailService.sendPasswordResetEmail(email, otp);

        return 180; // Trả về 180 giây (3 phút)
    }

    /**
     * MEMBER: Xác thực mã OTP
     */
    public void verifyOtp(String email, String otp) {
        Optional<G8_users> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Email không tồn tại");
        }

        G8_users user = userOpt.get();

        if (user.getResetToken() == null || !user.getResetToken().equals(otp)) {
            throw new RuntimeException("Mã OTP không chính xác");
        }

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã OTP đã hết hạn");
        }
    }

    /**
     * MEMBER: Đặt lại mật khẩu mới (Reset Password)
     */
    public void resetPassword(String email, String newPassword) {
        Optional<G8_users> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Email không tồn tại");
        }

        G8_users user = userOpt.get();

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
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
}
