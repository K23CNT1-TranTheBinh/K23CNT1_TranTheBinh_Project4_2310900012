package com.eventticket.controller.admin;

import com.eventticket.entity.G8_event_image;
import com.eventticket.service.admin.TtbEventImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/ttb/events/{eventId}/images")
@RequiredArgsConstructor
public class TtbEventImageController {

    private final TtbEventImageService ttbeventImageService;

    // 1. Lấy danh sách ảnh của sự kiện
    @GetMapping
    public ResponseEntity<List<G8_event_image>> getImages(@PathVariable Integer eventId) {
        List<G8_event_image> images = ttbeventImageService.getImagesForAdmin(eventId);
        return ResponseEntity.ok(images);
    }

    // 2. Upload ảnh mới (Nhận File vật lý)
    @PostMapping(consumes = { "multipart/form-data" })
    public ResponseEntity<?> uploadImage(
            @PathVariable Integer eventId,
            @RequestParam("file") MultipartFile file) {
        try {
            // Gọi Service để lưu file và lưu database
            G8_event_image savedImage = ttbeventImageService.uploadEventImage(eventId, file);
            return ResponseEntity.ok(savedImage);
        } catch (Exception e) {
            // Bắt lỗi (ví dụ: quá 10 ảnh) và trả về HTTP 400
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // 3. Xóa ảnh
    @DeleteMapping("/{imageId}")
    public ResponseEntity<?> deleteImage(
            @PathVariable Integer eventId,
            @PathVariable Integer imageId) {
        try {
            ttbeventImageService.deleteEventImage(imageId);
            return ResponseEntity.ok("Xóa ảnh và file vật lý thành công!");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}