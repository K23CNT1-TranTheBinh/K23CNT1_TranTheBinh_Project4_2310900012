package com.eventticket.service;

import com.eventticket.entity.G8_AppTranslation;
import com.eventticket.repository.AppTranslationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AppTranslationService {

    @Autowired
    private AppTranslationRepository appTranslationRepository;

    /**
     * Get translations for a specific language and convert them into a flat key-value Map.
     */
    public Map<String, String> getTranslationsMap(String langCode) {
        List<G8_AppTranslation> list = appTranslationRepository.findByLangCode(langCode.toLowerCase());
        Map<String, String> map = new HashMap<>();
        for (G8_AppTranslation t : list) {
            map.put(t.getTextKey(), t.getTextValue());
        }
        return map;
    }

    /**
     * Admin method to update or create a translation.
     */
    public G8_AppTranslation saveOrUpdateTranslation(String langCode, String textKey, String textValue) {
        Optional<G8_AppTranslation> existing = appTranslationRepository
                .findByLangCodeAndTextKey(langCode.toLowerCase(), textKey);

        G8_AppTranslation translation;
        if (existing.isPresent()) {
            translation = existing.get();
            translation.setTextValue(textValue);
        } else {
            translation = new G8_AppTranslation(null, langCode.toLowerCase(), textKey, textValue);
        }

        return appTranslationRepository.save(translation);
    }

    /**
     * Seed translations on startup if empty.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void seedTranslationsIfEmpty() {
        if (appTranslationRepository.count() == 0) {
            System.out.println(">>> SEEDING DEFAULT TRANSLATIONS INTO DATABASE...");
            
            // --- VIETNAMESE ---
            saveOrUpdateTranslation("vi", "header.subtitle", "Bán vé cao cấp");
            saveOrUpdateTranslation("vi", "header.search_placeholder", "Tìm kiếm sự kiện, nghệ sĩ...");
            saveOrUpdateTranslation("vi", "header.login", "Đăng nhập");
            saveOrUpdateTranslation("vi", "header.register", "Đăng ký");
            saveOrUpdateTranslation("vi", "header.profile", "Hồ sơ cá nhân");
            saveOrUpdateTranslation("vi", "header.my_events", "Sự kiện của bạn");
            saveOrUpdateTranslation("vi", "header.logout", "Đăng xuất");
            saveOrUpdateTranslation("vi", "header.all_locations", "Mọi địa điểm");
            saveOrUpdateTranslation("vi", "header.hanoi", "Hà Nội");
            saveOrUpdateTranslation("vi", "header.hcm", "TP. Hồ Chí Minh");
            saveOrUpdateTranslation("vi", "nav.music", "Vé ca nhạc");
            saveOrUpdateTranslation("vi", "nav.culture", "Văn hóa nghệ thuật");
            saveOrUpdateTranslation("vi", "nav.tourism", "Tham quan - Du lịch");
            saveOrUpdateTranslation("vi", "nav.workshop", "Workshop");
            saveOrUpdateTranslation("vi", "nav.movies", "Vé xem phim");
            saveOrUpdateTranslation("vi", "nav.sports", "Thể thao");
            saveOrUpdateTranslation("vi", "nav.news", "Tin tức");

            // Body Section
            saveOrUpdateTranslation("vi", "body.search_title", "Khám Phá Sự Kiện");
            saveOrUpdateTranslation("vi", "body.search_subtitle", "Hàng ngàn trải nghiệm đang chờ đón bạn");
            saveOrUpdateTranslation("vi", "body.search_placeholder", "Nhập tên sự kiện, nghệ sĩ, địa điểm...");
            saveOrUpdateTranslation("vi", "body.search_button", "Tìm kiếm");
            saveOrUpdateTranslation("vi", "body.filter_start_date", "Từ ngày");
            saveOrUpdateTranslation("vi", "body.filter_end_date", "Đến ngày");
            saveOrUpdateTranslation("vi", "body.filter_button", "Lọc Sự Kiện");
            saveOrUpdateTranslation("vi", "body.newest_events", "SỰ KIỆN MỚI NHẤT");
            saveOrUpdateTranslation("vi", "body.featured_events", "SỰ KIỆN NỔI BẬT");
            saveOrUpdateTranslation("vi", "body.view_calendar", "Xem lịch");
            saveOrUpdateTranslation("vi", "body.create_event", "Tạo sự kiện");
            saveOrUpdateTranslation("vi", "body.music_section", "CA NHẠC");
            saveOrUpdateTranslation("vi", "body.view_all", "Xem tất cả");
            saveOrUpdateTranslation("vi", "body.culture_section", "VĂN HÓA NGHỆ THUẬT");
            saveOrUpdateTranslation("vi", "body.tourism_section", "THAM QUAN - DU LỊCH");
            saveOrUpdateTranslation("vi", "body.cta_badge", "Hợp tác cùng BDHT");
            saveOrUpdateTranslation("vi", "body.cta_title", "Bắt đầu bán vé sự kiện của bạn");

            // Footer Section
            saveOrUpdateTranslation("vi", "footer.col_contact_title", "Liên Hệ Hợp Tác");
            saveOrUpdateTranslation("vi", "footer.phone", "Điện thoại: 0243.788.00.99 (8:30 - 17:00)");
            saveOrUpdateTranslation("vi", "footer.hotline", "Hotline: 08.999.80.818");
            saveOrUpdateTranslation("vi", "footer.email", "Email: chamsockhachhang@bdht.vn");
            saveOrUpdateTranslation("vi", "footer.address", "Địa chỉ: Số 1, Phạm Văn Bạch, phường Yên Hòa, quận Cầu Giấy, Hà Nội.");
            saveOrUpdateTranslation("vi", "footer.col_info_title", "Thông tin");
            saveOrUpdateTranslation("vi", "footer.info_about", "Về chúng tôi");
            saveOrUpdateTranslation("vi", "footer.info_promo", "Khuyến mãi");
            saveOrUpdateTranslation("vi", "footer.info_privacy", "Chính sách bảo mật");
            saveOrUpdateTranslation("vi", "footer.info_guide", "Hướng dẫn đặt vé");
            saveOrUpdateTranslation("vi", "footer.info_terms", "Điều khoản sử dụng");
            saveOrUpdateTranslation("vi", "footer.col_customer_title", "Khách hàng");
            saveOrUpdateTranslation("vi", "footer.cust_profile", "Tài khoản cá nhân");
            saveOrUpdateTranslation("vi", "footer.cust_manage", "Quản lý & Tạo sự kiện");
            saveOrUpdateTranslation("vi", "footer.cust_events", "Danh sách sự kiện");
            saveOrUpdateTranslation("vi", "footer.cust_past", "Sự kiện đã diễn ra");
            saveOrUpdateTranslation("vi", "footer.col_newsletter_title", "Nhận Bản Tin");
            saveOrUpdateTranslation("vi", "footer.newsletter_desc", "Đăng ký nhận thông tin ưu đãi hấp dẫn và sự kiện văn hóa nghệ thuật mới nhất từ BDHT.");
            saveOrUpdateTranslation("vi", "footer.email_placeholder", "Email của bạn...");
            saveOrUpdateTranslation("vi", "footer.license", "Giấy phép Kinh doanh số 0107641285 do Sở Kế Hoạch & Đầu Tư Thành Phố Hà Nội cấp ngày 21/11/2016");

            // Chat AI
            saveOrUpdateTranslation("vi", "chat.welcome", "Xin chào! 👋");
            saveOrUpdateTranslation("vi", "chat.welcome_desc", "Chào mừng bạn đến với BDHT Assistant. Trợ lý AI của chúng tôi sẵn sàng giải đáp mọi thắc mắc ngay lập tức!");
            saveOrUpdateTranslation("vi", "chat.start_btn", "Bắt đầu trò chuyện");
            saveOrUpdateTranslation("vi", "chat.start_btn_desc", "Phản hồi ngay trong vài giây");
            saveOrUpdateTranslation("vi", "chat.helper_title", "Bạn đang tìm sự kiện nào?");
            saveOrUpdateTranslation("vi", "chat.helper_desc", "Hãy hỏi tôi về các liveshow nổi bật, giá vé, hoặc các ưu đãi mới nhất!");
            saveOrUpdateTranslation("vi", "chat.history_title", "Lịch sử trò chuyện");
            saveOrUpdateTranslation("vi", "chat.history_loading", "Đang tải lịch sử...");
            saveOrUpdateTranslation("vi", "chat.agent_name", "BDHT Assistant");
            saveOrUpdateTranslation("vi", "chat.agent_welcome_msg", "Xin chào! Tôi là BDHT Assistant. Bạn cần hỗ trợ đặt vé hay tìm kiếm sự kiện nào hôm nay?");
            saveOrUpdateTranslation("vi", "chat.input_placeholder", "Gửi tin nhắn...");
            saveOrUpdateTranslation("vi", "chat.powered_by", "Powered by BDHT AI");

            // --- ENGLISH ---
            saveOrUpdateTranslation("en", "header.subtitle", "Premium Ticketing");
            saveOrUpdateTranslation("en", "header.search_placeholder", "Search events, artists...");
            saveOrUpdateTranslation("en", "header.login", "Login");
            saveOrUpdateTranslation("en", "header.register", "Register");
            saveOrUpdateTranslation("en", "header.profile", "Personal Profile");
            saveOrUpdateTranslation("en", "header.my_events", "Your Events");
            saveOrUpdateTranslation("en", "header.logout", "Logout");
            saveOrUpdateTranslation("en", "header.all_locations", "All Locations");
            saveOrUpdateTranslation("en", "header.hanoi", "Ha Noi");
            saveOrUpdateTranslation("en", "header.hcm", "Ho Chi Minh City");
            saveOrUpdateTranslation("en", "nav.music", "Concerts");
            saveOrUpdateTranslation("en", "nav.culture", "Arts & Culture");
            saveOrUpdateTranslation("en", "nav.tourism", "Sightseeing");
            saveOrUpdateTranslation("en", "nav.workshop", "Workshop");
            saveOrUpdateTranslation("en", "nav.movies", "Movies");
            saveOrUpdateTranslation("en", "nav.sports", "Sports");
            saveOrUpdateTranslation("en", "nav.news", "News");

            // Body Section
            saveOrUpdateTranslation("en", "body.search_title", "Discover Events");
            saveOrUpdateTranslation("en", "body.search_subtitle", "Thousands of experiences are waiting for you");
            saveOrUpdateTranslation("en", "body.search_placeholder", "Enter event title, artist name, venue...");
            saveOrUpdateTranslation("en", "body.search_button", "Search");
            saveOrUpdateTranslation("en", "body.filter_start_date", "From date");
            saveOrUpdateTranslation("en", "body.filter_end_date", "To date");
            saveOrUpdateTranslation("en", "body.filter_button", "Filter Events");
            saveOrUpdateTranslation("en", "body.newest_events", "NEWEST EVENTS");
            saveOrUpdateTranslation("en", "body.featured_events", "FEATURED EVENTS");
            saveOrUpdateTranslation("en", "body.view_calendar", "Calendar");
            saveOrUpdateTranslation("en", "body.create_event", "Create Event");
            saveOrUpdateTranslation("en", "body.music_section", "CONCERTS");
            saveOrUpdateTranslation("en", "body.view_all", "View all");
            saveOrUpdateTranslation("en", "body.culture_section", "ARTS & CULTURE");
            saveOrUpdateTranslation("en", "body.tourism_section", "SIGHTSEEING & TOURISM");
            saveOrUpdateTranslation("en", "body.cta_badge", "Partner with BDHT");
            saveOrUpdateTranslation("en", "body.cta_title", "Start selling your event tickets");

            // Footer Section
            saveOrUpdateTranslation("en", "footer.col_contact_title", "Contact Collaboration");
            saveOrUpdateTranslation("en", "footer.phone", "Phone: 0243.788.00.99 (8:30 AM - 5:00 PM)");
            saveOrUpdateTranslation("en", "footer.hotline", "Hotline: 08.999.80.818");
            saveOrUpdateTranslation("en", "footer.email", "Email: support@bdht.vn");
            saveOrUpdateTranslation("en", "footer.address", "Address: No. 1, Pham Van Bach, Yen Hoa ward, Cau Giay district, Ha Noi.");
            saveOrUpdateTranslation("en", "footer.col_info_title", "Information");
            saveOrUpdateTranslation("en", "footer.info_about", "About Us");
            saveOrUpdateTranslation("en", "footer.info_promo", "Promotions");
            saveOrUpdateTranslation("en", "footer.info_privacy", "Privacy Policy");
            saveOrUpdateTranslation("en", "footer.info_guide", "Booking Guide");
            saveOrUpdateTranslation("en", "footer.info_terms", "Terms of Use");
            saveOrUpdateTranslation("en", "footer.col_customer_title", "Customers");
            saveOrUpdateTranslation("en", "footer.cust_profile", "Personal Profile");
            saveOrUpdateTranslation("en", "footer.cust_manage", "Manage & Create Event");
            saveOrUpdateTranslation("en", "footer.cust_events", "Event Directory");
            saveOrUpdateTranslation("en", "footer.cust_past", "Past Events");
            saveOrUpdateTranslation("en", "footer.col_newsletter_title", "Get Newsletter");
            saveOrUpdateTranslation("en", "footer.newsletter_desc", "Subscribe to receive attractive promotions and the latest arts & cultural events from BDHT.");
            saveOrUpdateTranslation("en", "footer.email_placeholder", "Your email address...");
            saveOrUpdateTranslation("en", "footer.license", "Business License No. 0107641285 issued by Ha Noi Department of Planning & Investment on 21/11/2016");

            // Chat AI
            saveOrUpdateTranslation("en", "chat.welcome", "Hello! 👋");
            saveOrUpdateTranslation("en", "chat.welcome_desc", "Welcome to BDHT Assistant. Our AI assistant is ready to help you instantly!");
            saveOrUpdateTranslation("en", "chat.start_btn", "Start conversation");
            saveOrUpdateTranslation("en", "chat.start_btn_desc", "Response in seconds");
            saveOrUpdateTranslation("en", "chat.helper_title", "Which event are you looking for?");
            saveOrUpdateTranslation("en", "chat.helper_desc", "Ask me about featured concerts, ticket pricing, or the latest promotions!");
            saveOrUpdateTranslation("en", "chat.history_title", "Chat History");
            saveOrUpdateTranslation("en", "chat.history_loading", "Loading chat history...");
            saveOrUpdateTranslation("en", "chat.agent_name", "BDHT Assistant");
            saveOrUpdateTranslation("en", "chat.agent_welcome_msg", "Hello! I am BDHT Assistant. Do you need help booking tickets or finding an event today?");
            saveOrUpdateTranslation("en", "chat.input_placeholder", "Send a message...");
            saveOrUpdateTranslation("en", "chat.powered_by", "Powered by BDHT AI");
            
            System.out.println(">>> SEEDING DEFAULT TRANSLATIONS COMPLETED.");
        }
    }
}
