package com.eventticket.service;

import com.eventticket.entity.G8_users;
import com.eventticket.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class SocialAuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.oauth.google.client-id:}")
    private String googleClientId;

    public SocialAuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    public G8_users loginWithProvider(String provider, String accessToken) {
        if (provider == null || provider.isBlank()) {
            throw new RuntimeException("Nha cung cap dang nhap khong hop le");
        }
        if (accessToken == null || accessToken.isBlank()) {
            throw new RuntimeException("Token dang nhap mang xa hoi khong hop le");
        }

        SocialProfile profile = switch (provider.toLowerCase(Locale.ROOT)) {
            case "google" -> fetchGoogleProfile(accessToken);
            case "facebook" -> fetchFacebookProfile(accessToken);
            default -> throw new RuntimeException("Chua ho tro dang nhap bang " + provider);
        };

        return upsertSocialUser(profile);
    }

    private SocialProfile fetchGoogleProfile(String accessToken) {
        String tokenInfoUrl = UriComponentsBuilder
                .fromUriString("https://oauth2.googleapis.com/tokeninfo")
                .queryParam("access_token", accessToken)
                .toUriString();
        JsonNode tokenInfo = getJson(tokenInfoUrl);
        String email = text(tokenInfo, "email");
        String audience = text(tokenInfo, "audience");

        if (email == null || email.isBlank()) {
            throw new RuntimeException("Google khong tra ve email cho tai khoan nay");
        }
        // Audience check can fail if the frontend uses a different OAuth client-id
        // or Google issues a token where tokeninfo does not contain `audience`.
        // Only enforce when audience is present.
        if (googleClientId != null && !googleClientId.isBlank() && audience != null
                && !googleClientId.equals(audience)) {
            throw new RuntimeException("Google token khong thuoc ung dung hien tai. audience=" + audience
                    + ", expected=" + googleClientId);
        }

        JsonNode profile = getJsonWithBearer("https://www.googleapis.com/oauth2/v3/userinfo", accessToken);
        String name = text(profile, "name");

        return new SocialProfile(email, name);
    }

    private SocialProfile fetchFacebookProfile(String accessToken) {
        String url = UriComponentsBuilder
                .fromUriString("https://graph.facebook.com/v25.0/me")
                .queryParam("fields", "id,name,email")
                .queryParam("access_token", accessToken)
                .toUriString();

        JsonNode profile = getJson(url);
        String email = text(profile, "email");
        String name = text(profile, "name");

        if (email == null || email.isBlank()) {
            throw new RuntimeException("Facebook khong tra ve email. Hay cap quyen email cho ung dung Facebook.");
        }

        return new SocialProfile(email, name);
    }

    private G8_users upsertSocialUser(SocialProfile profile) {
        Optional<G8_users> existingUser = userRepository.findByEmail(profile.email());
        if (existingUser.isPresent()) {
            G8_users user = existingUser.get();
            if (Boolean.FALSE.equals(user.getIsActive())) {
                throw new RuntimeException("Tai khoan da bi khoa");
            }
            if (Boolean.FALSE.equals(user.getIsVerified())) {
                user.setIsVerified(true);
                userRepository.save(user);
            }
            return user;
        }

        G8_users user = new G8_users();
        user.setEmail(profile.email());
        user.setFullName(profile.name() == null || profile.name().isBlank() ? profile.email() : profile.name());
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setRole("USER");
        user.setIsVerified(true);
        user.setIsActive(true);
        return userRepository.save(user);
    }

    private JsonNode getJsonWithBearer(String url, String bearerToken) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .header("Authorization", "Bearer " + bearerToken)
                .GET()
                .build();
        return send(request);
    }

    private JsonNode getJson(String url) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).GET().build();
        return send(request);
    }

    private JsonNode send(HttpRequest request) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode body = objectMapper.readTree(response.body());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = body.path("error").path("message").asText("Khong the xac thuc tai khoan mang xa hoi");
                throw new RuntimeException(message);
            }
            return body;
        } catch (IOException e) {
            throw new RuntimeException("Khong the doc phan hoi xac thuc mang xa hoi", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Yeu cau xac thuc mang xa hoi bi gian doan", e);
        }
    }

    private String text(JsonNode node, String fieldName) {
        JsonNode value = node.get(fieldName);
        return value == null || value.isNull() ? null : value.asText();
    }

    private record SocialProfile(String email, String name) {
    }
}
