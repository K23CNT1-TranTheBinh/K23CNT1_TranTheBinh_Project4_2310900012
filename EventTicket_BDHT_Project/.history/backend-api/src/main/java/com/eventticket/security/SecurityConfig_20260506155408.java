package com.eventticket.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    // Bộ băm mật khẩu BCrypt (Dùng lúc đăng ký và đăng nhập)
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // Tắt CSRF vì chúng ta dùng JWT bảo mật rồi
                .cors(cors -> cors.configure(http)) // Kích hoạt CORS (Nối với file CorsConfig bạn đã làm)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // Không
                                                                                                              // lưu
                                                                                                              // phiên
                                                                                                              // (Session)
                .authorizeHttpRequests(auth -> auth
                        // MỞ CỬA TỰ DO: Các API bắt đầu bằng /api/v1/auth/ hoặc /api/v1/public/
                        .requestMatchers("/api/v1/auth/**", "/api/v1/public/**").permitAll()
                        // CHẶN CỬA: Mọi request khác đều phải có JWT Token
                        .anyRequest().authenticated());

        // Nhét ông bảo vệ JWT lên tuyến đầu tiên
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}