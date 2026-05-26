package com.eventticket.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    // Đọc các biến tam giác vàng từ file application.properties
    @Value("${spring.web.cors.allowed-origins}")
    private String[] allowedOrigins;

    @Value("${spring.web.cors.allowed-methods}")
    private String[] allowedMethods;

    @Value("${spring.web.cors.allowed-headers}")
    private String allowedHeaders;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**") // Áp dụng cho mọi API bắt đầu bằng /api/
                .allowedOrigins(allowedOrigins) // Cho phép Frontend gọi vào
                .allowedMethods(allowedMethods) // Cho phép các method GET, POST, PUT, DELETE
                .allowedHeaders(allowedHeaders)
                .allowCredentials(true); // Cho phép gửi kèm Token trong Header/Cookie
    }
}