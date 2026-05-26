package com.eventticket.service.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class VtdEmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    /**
     * Gửi email OTP để reset password
     */
    public void sendOtpEmail(String email, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String subject = "Mã OTP đặt lại mật khẩu - Event Ticket";
            String htmlContent = buildOtpEmailContent(otp);

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = HTML format

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Lỗi khi gửi email OTP: " + e.getMessage());
        }
    }

    /**
     * Gửi email yêu cầu đặt lại mật khẩu
     */
    public void sendPasswordResetEmail(String email, String resetToken) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String resetLink = frontendUrl + "/reset-password?token=" + resetToken;
            String subject = "Yêu cầu đặt lại mật khẩu - Event Ticket";
            String htmlContent = buildPasswordResetEmailContent(resetLink);

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = HTML format

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Lỗi khi gửi email: " + e.getMessage());
        }
    }

    /**
     * Gửi email xác minh địa chỉ email
     */
    public void sendVerificationEmail(String email, String verificationToken) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String verificationLink = frontendUrl + "/verify-email?token=" + verificationToken;
            String subject = "Xác minh địa chỉ email - Event Ticket";
            String htmlContent = buildVerificationEmailContent(verificationLink);

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Lỗi khi gửi email xác minh: " + e.getMessage());
        }
    }

    /**
     * Gửi email thông báo đổi mật khẩu thành công
     */
    public void sendPasswordChangeConfirmation(String email) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(email);
            message.setSubject("Xác nhận đổi mật khẩu - Event Ticket");
            message.setText("Mật khẩu của bạn đã được đổi thành công. " +
                    "Nếu đây không phải là yêu cầu của bạn, vui lòng liên hệ với chúng tôi ngay lập tức.");

            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi gửi email xác nhận: " + e.getMessage());
        }
    }

    /**
     * Build HTML content cho email đặt lại mật khẩu
     */
    private String buildPasswordResetEmailContent(String resetLink) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<meta charset='UTF-8'>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; }" +
                ".container { max-width: 600px; margin: 0 auto; padding: 20px; }" +
                ".header { background-color: #007bff; color: white; padding: 20px; text-align: center; }" +
                ".content { padding: 20px; background-color: #f9f9f9; }" +
                ".button { display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }"
                +
                ".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h1>Đặt lại mật khẩu</h1>" +
                "</div>" +
                "<div class='content'>" +
                "<p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Event Ticket của mình.</p>" +
                "<p>Vui lòng nhấn nút bên dưới để đặt lại mật khẩu:</p>" +
                "<a href='" + resetLink + "' class='button'>Đặt lại mật khẩu</a>" +
                "<p>Link này sẽ hết hạn trong 1 giờ.</p>" +
                "<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>© 2026 Event Ticket. All rights reserved.</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }

    /**
     * Build HTML content cho email xác minh
     */
    private String buildVerificationEmailContent(String verificationLink) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<meta charset='UTF-8'>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; }" +
                ".container { max-width: 600px; margin: 0 auto; padding: 20px; }" +
                ".header { background-color: #28a745; color: white; padding: 20px; text-align: center; }" +
                ".content { padding: 20px; background-color: #f9f9f9; }" +
                ".button { display: inline-block; background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }"
                +
                ".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h1>Xác minh Email</h1>" +
                "</div>" +
                "<div class='content'>" +
                "<p>Cảm ơn bạn đã đăng ký tài khoản Event Ticket!</p>" +
                "<p>Vui lòng xác minh địa chỉ email của bạn bằng cách nhấn nút bên dưới:</p>" +
                "<a href='" + verificationLink + "' class='button'>Xác minh Email</a>" +
                "<p>Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>© 2026 Event Ticket. All rights reserved.</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }

    /**
     * Build HTML content cho email OTP
     */
    private String buildOtpEmailContent(String otp) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<meta charset='UTF-8'>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; }" +
                ".container { max-width: 600px; margin: 0 auto; padding: 20px; }" +
                ".header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }" +
                ".content { padding: 20px; background-color: #f9f9f9; }" +
                ".otp-code { display: inline-block; background-color: #fff3cd; color: #856404; padding: 15px 30px; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0; font-family: monospace; }"
                +
                ".footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h1>Mã OTP Đặt Lại Mật Khẩu</h1>" +
                "</div>" +
                "<div class='content'>" +
                "<p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Event Ticket của mình.</p>" +
                "<p>Mã OTP của bạn là:</p>" +
                "<div class='otp-code'>" + otp + "</div>" +
                "<p>Mã OTP này sẽ hết hạn trong <strong>10 phút</strong>.</p>" +
                "<p><strong>Lưu ý:</strong> Đừng chia sẻ mã OTP này với bất kỳ ai!</p>" +
                "<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>© 2026 Event Ticket. All rights reserved.</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }
}
