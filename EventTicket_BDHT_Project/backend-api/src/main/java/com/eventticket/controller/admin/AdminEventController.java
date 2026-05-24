package com.eventticket.controller.admin;

import com.eventticket.entity.G8_event;
import com.eventticket.service.admin.AdminEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/events")
@RequiredArgsConstructor

public class AdminEventController {

    private final AdminEventService adminEventService;

    // Khai báo thư mục lưu ảnh
    private final String UPLOAD_DIR = "uploads/events/";

    @GetMapping
    public ResponseEntity<List<G8_event>> getAll() {
        return ResponseEntity.ok(adminEventService.getAllEvents());
    }

    // ========================================================
    // API MỚI THÊM: XỬ LÝ UPLOAD ẢNH ĐỂ LẤY URL
    // Endpoint: POST /api/admin/events/upload
    // ========================================================
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Tạo tên file ngẫu nhiên tránh trùng lặp
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath);

            // Trả về JSON chứa URL của bức ảnh cho Frontend
            return ResponseEntity.ok(Map.of("url", "/" + UPLOAD_DIR + fileName));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lỗi lưu file: " + e.getMessage()));
        }
    }

    // ========================================================
    // CÁC API CŨ CỦA BẠN (GIỮ NGUYÊN HOÀN TOÀN)
    // ========================================================

    // Khi tạo event, mình truyền thêm venueId qua Parameter để dễ xử lý
    @PostMapping("/add")
    public ResponseEntity<G8_event> create(@RequestBody G8_event event, @RequestParam Integer venueId) {
        return ResponseEntity.ok(adminEventService.createEvent(event, venueId));
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<G8_event> update(
            @PathVariable Integer id, 
            @RequestBody G8_event event, 
            @RequestParam(required = false) Integer venueId) {
        return ResponseEntity.ok(adminEventService.updateEvent(id, event, venueId));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        adminEventService.deleteEvent(id);
        
        // 💡 LƯU Ý NHỎ: Mình đổi từ String sang Map (JSON) ở đây để khi 
        // Frontend JS chạy lệnh await response.json() sẽ không bị lỗi "Unexpected end of JSON input".
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu xóa sự kiện!"));
    }
}