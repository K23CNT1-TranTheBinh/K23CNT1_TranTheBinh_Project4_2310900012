package com.eventticket.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.io.File;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Lấy đường dẫn tuyệt đối một cách an toàn
        String uploadDir = new File("uploads").getAbsolutePath();

        // Sử dụng định dạng URL chuẩn (file:/C:/...) thay vì cố tình replace chuỗi
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir + File.separator);
    }
}