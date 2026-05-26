package com.eventticket.service.user;

import com.eventticket.entity.G8_users;
import com.eventticket.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class VtdAuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private VtdEmailService emailService;

    @Autowired
    private VtdOtpService otpService;

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
     * GUEST: Quên mật khẩu (Gửi OTP qua email)
     */
    public long requestPasswordReset(String email) {
        Optional<G8_users> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Email không tồn tại trong hệ thống");
        }

        // Generate OTP
        String otp = otpService.generateOtp();
        otpService.storeOtp(email, otp);

        // Gửi email với OTP
        emailService.sendOtpEmail(email, otp);

        // Return remaining time in seconds
        return otpService.getRemainingTime(email);
    }

    /**
     * GUEST: Xác thực OTP
     */
    public void verifyOtp(String email, String otp) {
        if (!otpService.verifyOtp(email, otp)) {
            throw new RuntimeException("OTP không chính xác hoặc đã hết hạn");
        }
    }

    /**
     * MEMBER: Đặt lại mật khẩu mới (Sau khi verify OTP)
     */
    public void resetPassword(String email, String newPassword) {
        Optional<G8_users> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("Email không tồn tại trong hệ thống");
        }

        G8_users user = userOpt.get();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Gửi email xác nhận đổi mật khẩu
        emailService.sendPasswordChangeConfirmation(user.getEmail());
    }

    /**
     * MEMBER: Đổi mật khẩu tài khoản (Khi đang đăng nhập)
     */
    // public void changePassword(Integer userId, String oldPassword, String
    // newPassword) {
    // G8_users user = userRepository.findById(userId)
    // .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

    // if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
    // throw new RuntimeException("Mật khẩu cũ không chính xác");
    // }

    // // Gửi email xác nhận đổi mật khẩu
    // emailService.sendPasswordChangeConfirmation(user.getEmail());

    // user.setPasswordHash(passwordEncoder.encode(newPassword));
    // userRepository.save(user);
    // }
}
