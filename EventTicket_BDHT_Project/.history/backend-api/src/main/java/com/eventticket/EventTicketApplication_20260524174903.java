package com.eventticket;

import com.eventticket.config.AiChatProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AiChatProperties.class)
public class EventTicketApplication {

	public static void main(String[] args) {
		SpringApplication.run(EventTicketApplication.class, args);
		System.out.println("Backend API is running...");
	}

}