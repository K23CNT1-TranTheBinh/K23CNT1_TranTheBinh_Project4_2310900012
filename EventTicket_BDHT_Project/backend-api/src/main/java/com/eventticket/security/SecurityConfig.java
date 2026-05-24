package com.eventticket.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    // Đọc các biến cấu hình từ application.properties giống như CorsConfig cũ
    @Value("${spring.web.cors.allowed-origins}")
    private String[] allowedOrigins;

    @Value("${spring.web.cors.allowed-methods}")
    private String[] allowedMethods;

    @Value("${spring.web.cors.allowed-headers}")
    private String[] allowedHeaders;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // 1. TẠO BEAN CẤU HÌNH CORS CHO SPRING SECURITY
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Cấp quyền theo cấu hình trong application.properties
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins)); 
        // QUAN TRỌNG: Phải cho phép method OPTIONS đi qua
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")); 
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring().requestMatchers("/uploads/**");
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) 
                
                // 2. SỬA LẠI CÚ PHÁP CORS (Tự động tìm bean CorsConfigurationSource ở trên)
                .cors(Customizer.withDefaults()) 
                
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) 
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**", "/api/v1/public/**", "/api/ttb/public/**").permitAll()
                        
                        // Để tạm permitAll() để bạn test Frontend, sau này khi xong hãy đổi thành: 
                        // .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").permitAll() 
                        .requestMatchers("/uploads/**").permitAll()
                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}