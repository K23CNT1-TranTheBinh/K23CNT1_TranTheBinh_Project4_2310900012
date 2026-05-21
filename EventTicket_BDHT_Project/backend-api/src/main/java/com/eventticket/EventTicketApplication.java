package com.eventticket;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class EventTicketApplication {

	public static void main(String[] args) {
		SpringApplication.run(EventTicketApplication.class, args);
		System.out.println("Backend API is running...");
	}

}
