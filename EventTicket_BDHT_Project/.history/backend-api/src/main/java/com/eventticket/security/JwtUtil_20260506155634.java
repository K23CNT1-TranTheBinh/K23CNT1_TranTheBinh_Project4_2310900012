package com.eventticket.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    // Kéo biến app.jwtSecret từ application.properties vào
    @Value("${app.jwtSecret}")
    private String jwtSecret;

    // Kéo biến thời gian sống của token vào
    @Value("${app.jwtExpirationMs}")
    private int jwtExpirationMs;

    // 1. Tạo Token khi User đăng nhập thành công
    public String generateToken(String email, String role) {
        return Jwts.builder()
                .subject(email) // Lưu email làm định danh chính
                .claim("role", role) // Lưu thêm quyền (ADMIN/USER) vào token
                .issuedAt(new Date()) // Thời điểm phát hành
                .expiration(new Date((new Date()).getTime() + jwtExpirationMs)) // Thời điểm hết hạn
                .signWith(key()) // Ký bằng mã bí mật
                .compact();
    }

    // 2. Lấy Email từ Token (Dùng lúc filter check vé)
    public String getEmailFromToken(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    // 3. Kiểm tra Token có hợp lệ không (Có bị fake hay hết hạn không)
    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser().verifyWith(key()).build().parseSignedClaims(authToken);
            return true;
        } catch (MalformedJwtException e) {
            System.err.println("Invalid JWT token: " + e.getMessage());
        } catch (ExpiredJwtException e) {
            System.err.println("JWT token is expired: " + e.getMessage());
        } catch (UnsupportedJwtException e) {
            System.err.println("JWT token is unsupported: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            System.err.println("JWT claims string is empty: " + e.getMessage());
        }
        return false;
    }

    // Hàm hỗ trợ: Biến chuỗi String cấu hình thành SecretKey mã hóa
    private SecretKey key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }
}