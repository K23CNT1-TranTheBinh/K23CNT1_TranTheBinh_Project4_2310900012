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
        // Áp dụng CORS cho mọi API, bao gồm OPTIONS (preflight)
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders(allowedHeaders)
                .allowCredentials(true);

    }
}