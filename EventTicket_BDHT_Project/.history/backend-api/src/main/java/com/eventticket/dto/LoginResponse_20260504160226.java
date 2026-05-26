package com.eventticket.dto;

import lombok.Data;

@Data
public class LoginResponse {
    private String token;
    private long expiresIn;
    private UserDto user;

    public LoginResponse(String token, Long id, String email, String fullName, String role) {
        this.token = token;
        this.expiresIn = 86400; // 24 hours
        this.user = new UserDto();
        this.user.setId(id);
        this.user.setEmail(email);
        this.user.setFullName(fullName);
        this.user.setRole(role);
    }
}
