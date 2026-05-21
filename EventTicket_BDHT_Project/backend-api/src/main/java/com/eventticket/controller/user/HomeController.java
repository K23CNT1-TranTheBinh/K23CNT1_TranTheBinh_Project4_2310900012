package com.eventticket.controller.user;

import com.eventticket.entity.G8_event;
import com.eventticket.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;

@Controller
public class HomeController {

    private final EventService eventService;

    public HomeController(EventService eventService) {
        this.eventService = eventService;
    }

    /**
     * GUEST: Trang chu - tra ve file index.html tu frontend.
     */
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
    @GetMapping("/api/nat/public/home")
    @ResponseBody
    public ResponseEntity<HomePageResponse> getHomePageData() {
        List<G8_event> publishedEvents = eventService.getAllPublishedEvents();
        List<G8_event> featuredEvents = eventService.getFeaturedEvents()
                .stream()
                .limit(6)
                .toList();
        List<G8_event> latestEvents = publishedEvents
                .stream()
                .sorted(Comparator.comparing(G8_event::getStartTime))
                .limit(8)
                .toList();
        List<String> categories = publishedEvents
                .stream()
                .map(G8_event::getCategoryName)
                .filter(category -> category != null && !category.isBlank())
                .distinct()
                .sorted()
                .toList();

        HomePageResponse response = new HomePageResponse(
                featuredEvents,
                latestEvents,
                categories,
                publishedEvents.size());

        return ResponseEntity.ok(response);
    }

    /**
     * GUEST: API danh muc su kien hien thi tren trang chu.
     */
    @GetMapping("/api/ttb/public/home/categories")
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

    public static class HomePageResponse {
        private List<G8_event> featuredEvents;
        private List<G8_event> latestEvents;
        private List<String> categories;
        private Integer totalPublishedEvents;

        public HomePageResponse(List<G8_event> featuredEvents, List<G8_event> latestEvents,
                List<String> categories, Integer totalPublishedEvents) {
            this.featuredEvents = featuredEvents;
            this.latestEvents = latestEvents;
            this.categories = categories;
            this.totalPublishedEvents = totalPublishedEvents;
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
