package com.eventticket.controller.admin;

import com.eventticket.entity.G8_event_image;
import com.eventticket.service.admin.AdminEventImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ttb/event/image")
@RequiredArgsConstructor
public class AdminEventImageController {

    private final AdminEventImageService adminImageService;

    // [READ] Lấy danh sách ảnh của 1 sự kiện
    // API: GET /api/ttb/event/image/list/{eventId}
    @GetMapping("/list/{eventId}")
    public ResponseEntity<List<G8_event_image>> getEventImages(@PathVariable Integer eventId) {
        return ResponseEntity.ok(adminImageService.getImagesForAdmin(eventId));
    }

    // [CREATE] Upload ảnh cho sự kiện
    // API: POST /api/ttb/event/image/upload/{eventId}
    @PostMapping("/upload/{eventId}")
    public ResponseEntity<?> uploadImage(
            @PathVariable Integer eventId,
            @RequestParam("file") MultipartFile file) {
        try {
            G8_event_image savedImage = adminImageService.uploadEventImage(eventId, file);
            return ResponseEntity.ok(savedImage);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // [DELETE] Xóa một ảnh
    // API: DELETE /api/ttb/event/image/delete/{imageId}
    @DeleteMapping("/delete/{imageId}")
    public ResponseEntity<?> deleteImage(@PathVariable Integer imageId) {
        try {
            adminImageService.deleteEventImage(imageId);
            return ResponseEntity.ok(Map.of("message", "Xóa ảnh thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}