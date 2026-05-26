package com.eventticket.controller.user;

import com.eventticket.entity.G8_event;
import com.eventticket.service.user.VtdEventService;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import java.util.List;

@Controller
public class VtdHomeController {

    private final VtdEventService eventService;

    public VtdHomeController(VtdEventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping({ "/", "/home", "/index" })
    @ResponseBody
    public String index() throws IOException {
        String projectRoot = System.getProperty("user.dir");
        Path indexPath = Path.of(projectRoot, "..", "frontend-web", "pages", "index.html").normalize();
        return Files.readString(indexPath, StandardCharsets.UTF_8);
    }

    /**
     * GUEST: API du lieu tong hop cho trang chu.
     */
    @GetMapping("/api/vtd/public/home")
    @ResponseBody
    public ResponseEntity<HomePageResponse> getHomePageData() {
        // Gọi thẳng Service, Controller không chứa logic xử lý số liệu nữa
        List<String> randomBanners = eventService.getRandomBanners();
        List<G8_event> latestEvents = eventService.getLatestEvents();
        List<G8_event> featuredEvents = eventService.getFeaturedEvents();

        // Lấy Category (có thể tách riêng ra service sau nếu muốn)
        List<G8_event> allPublished = eventService.getAllPublishedEvents();
        List<String> categories = allPublished.stream()
                .map(G8_event::getCategoryName)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted()
                .toList();

        HomePageResponse response = new HomePageResponse(
                randomBanners,
                featuredEvents,
                latestEvents,
                categories,
                allPublished.size());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/vtd/public/home/categories")
    @ResponseBody
    public ResponseEntity<List<String>> getHomeCategories() {
        List<String> categories = eventService.getAllPublishedEvents()
                .stream()
                .map(G8_event::getCategoryName)
                .filter(category -> category != null && !category.isBlank())
                .distinct()
                .sorted()
                .toList();

        return ResponseEntity.ok(categories);
    }

    // --- CẬP NHẬT DTO RESPONSE ---
    public static class HomePageResponse {
        private List<String> banners; // Thêm list chứa url ảnh banner
        private List<G8_event> featuredEvents;
        private List<G8_event> latestEvents;
        private List<String> categories;
        private Integer totalPublishedEvents;

        public HomePageResponse(List<String> banners, List<G8_event> featuredEvents, List<G8_event> latestEvents,
                List<String> categories, Integer totalPublishedEvents) {
            this.banners = banners;
            this.featuredEvents = featuredEvents;
            this.latestEvents = latestEvents;
            this.categories = categories;
            this.totalPublishedEvents = totalPublishedEvents;
        }

        // --- Bổ sung Getter & Setter ---
        public List<String> getBanners() {
            return banners;
        }

        public void setBanners(List<String> banners) {
            this.banners = banners;
        }

        public List<G8_event> getFeaturedEvents() {
            return featuredEvents;
        }

        public void setFeaturedEvents(List<G8_event> featuredEvents) {
            this.featuredEvents = featuredEvents;
        }

        public List<G8_event> getLatestEvents() {
            return latestEvents;
        }

        public void setLatestEvents(List<G8_event> latestEvents) {
            this.latestEvents = latestEvents;
        }

        public List<String> getCategories() {
            return categories;
        }

        public void setCategories(List<String> categories) {
            this.categories = categories;
        }

        public Integer getTotalPublishedEvents() {
            return totalPublishedEvents;
        }

        public void setTotalPublishedEvents(Integer totalPublishedEvents) {
            this.totalPublishedEvents = totalPublishedEvents;
        }
    }
}