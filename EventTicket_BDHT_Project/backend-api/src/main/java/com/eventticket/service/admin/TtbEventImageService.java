package com.eventticket.service.admin;

import com.eventticket.entity.G8_event;
import com.eventticket.entity.G8_event_image;
import com.eventticket.repository.EventImageRepository;
import com.eventticket.repository.EventRepository; // Đảm bảo bạn có Repo này cho G8_event
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TtbEventImageService {

    private final EventImageRepository imageRepository;
    private final EventRepository eventRepository;

    // Thư mục lưu ảnh cục bộ
    private final String UPLOAD_DIR = "uploads/events/";

    // Lấy danh sách ảnh đã được sắp xếp theo sortOrder
    public List<G8_event_image> getImagesForAdmin(Integer eventId) {
        return imageRepository.findByEventIdOrderBySortOrder(eventId);
    }

    // Thêm ảnh mới
    @Transactional
    public G8_event_image uploadEventImage(Integer eventId, MultipartFile file) throws IOException {
        // Kiểm tra giới hạn: Tối đa 10 ảnh cho 1 sự kiện
        long currentImageCount = imageRepository.countByEventId(eventId);
        if (currentImageCount >= 10) {
            throw new RuntimeException("Sự kiện này đã đạt số lượng ảnh tối đa (10 ảnh).");
        }

        // Lấy thông tin sự kiện
        G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // Xử lý lưu file vật lý
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        // Map dữ liệu vào Entity
        G8_event_image newImage = new G8_event_image();
        newImage.setEvent(event);
        newImage.setImageUrl("/" + UPLOAD_DIR + fileName);
        newImage.setSortOrder((int) currentImageCount + 1); // Đẩy ảnh mới xuống cuối cùng

        return imageRepository.save(newImage);
    }

    // Xóa ảnh
    // Them anh moi bang URL, giong cach luu bannerImageUrl cua su kien
    @Transactional
    public G8_event_image addEventImageUrl(Integer eventId, String imageUrl) {
        long currentImageCount = imageRepository.countByEventId(eventId);
        if (currentImageCount >= 10) {
            throw new RuntimeException("Su kien nay da dat so luong anh toi da (10 anh).");
        }

        String cleanImageUrl = imageUrl == null ? "" : imageUrl.trim();
        if (cleanImageUrl.isEmpty()) {
            throw new RuntimeException("Vui long nhap duong dan anh.");
        }

        G8_event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay su kien voi ID: " + eventId));

        G8_event_image newImage = new G8_event_image();
        newImage.setEvent(event);
        newImage.setImageUrl(cleanImageUrl);
        newImage.setSortOrder((int) currentImageCount + 1);

        return imageRepository.save(newImage);
    }

    @Transactional
    public void deleteEventImage(Integer imageId) {
        G8_event_image image = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ảnh với ID: " + imageId));

        // Xóa file vật lý trong thư mục
        try {
            String imageUrl = image.getImageUrl();
            if (imageUrl != null && (imageUrl.startsWith("/" + UPLOAD_DIR) || imageUrl.startsWith(UPLOAD_DIR))) {
                String filePath = imageUrl.replaceFirst("^/", "");
                Files.deleteIfExists(Paths.get(filePath));
            }
        } catch (IOException e) {
            System.err.println("Cảnh báo: Không thể xóa file vật lý: " + e.getMessage());
        }

        // Xóa record trong database
        imageRepository.delete(image);
    }
}
