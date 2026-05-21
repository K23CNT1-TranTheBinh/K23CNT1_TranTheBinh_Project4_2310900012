// i18n - Dynamic Internationalization module (Vietnamese / English)
// Fetches dynamic translations from Spring Boot API and caches locally

class I18nManager {
    constructor() {
        this.currentLang = localStorage.getItem('app_lang') || 'vi';
        this.dictionary = {};
        this.isLoading = false;
        this.isRendering = false; // Flag to prevent infinite loop recursion in MutationObserver
        this.observer = null;
    }

    /**
     * Initialize i18n. Resolves translations first (from cache or API)
     * then renders page labels and binds dropdown toggle events.
     */
    async init() {
        this.isLoading = true;
        
        // Fetch and load dictionary
        await this.fetchTranslations(this.currentLang);
        
        this.isLoading = false;
        
        // Render translations on elements
        this.renderLanguage();
        
        // Setup dropdown click listeners
        this.setupDropdown();

        // Setup MutationObserver radar to watch dynamic JavaScript elements
        this.setupMutationObserver();
    }

    /**
     * Retrieve translation dictionary for a language code from Backend API with local caching.
     */
    async fetchTranslations(lang) {
        const cacheKey = `app_translations_${lang}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                this.dictionary = JSON.parse(cached);
                return;
            } catch (e) {
                console.error("Lỗi parse cache bản dịch:", e);
            }
        }

        console.log(`[i18n] Đang tải bản dịch [${lang}] từ Database...`);
        
        // Sử dụng URL Backend từ file api-client.js nếu có, ngược lại fallback về localhost:8080
        const baseUrl = window.API_BASE_URL || 'http://localhost:8080';
        const url = `${baseUrl}/api/translations/${lang}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.dictionary = data;
            
            // Lưu vào localStorage làm cache để tăng tốc tải trang
            localStorage.setItem(cacheKey, JSON.stringify(data));
            console.log(`[i18n] Đã lưu cache bản dịch [${lang}] thành công.`);
        } catch (error) {
            console.warn(`[i18n] Lỗi gọi API (${url}). Đang chuyển sang sử dụng bộ nhớ tạm (Fallback)...`, error);
            this.dictionary = this.getFallbackDictionary(lang);
        }
    }

    /**
     * Fallback dictionary in case API is temporarily unavailable
     */
    getFallbackDictionary(lang) {
        const fallback = {
            vi: {
                "header.subtitle": "Bán vé cao cấp",
                "header.search_placeholder": "Tìm kiếm sự kiện, nghệ sĩ...",
                "header.login": "Đăng nhập",
                "header.register": "Đăng ký",
                "header.profile": "Hồ sơ cá nhân",
                "header.my_events": "Sự kiện của bạn",
                "header.logout": "Đăng xuất",
                "header.all_locations": "Mọi địa điểm",
                "header.hanoi": "Hà Nội",
                "header.hcm": "TP. Hồ Chí Minh",
                "nav.music": "Vé ca nhạc",
                "nav.culture": "Văn hóa nghệ thuật",
                "nav.tourism": "Tham quan - Du lịch",
                "nav.workshop": "Workshop",
                "nav.movies": "Vé xem phim",
                "nav.sports": "Thể thao",
                "nav.news": "Tin tức",
                "nav.tech": "Công nghệ",
                "nav.education": "Giáo dục",

                // Body Section
                "body.search_title": "Khám Phá Sự Kiện",
                "body.search_subtitle": "Hàng ngàn trải nghiệm đang chờ đón bạn",
                "body.search_placeholder": "Nhập tên sự kiện, nghệ sĩ, địa điểm...",
                "body.search_button": "Tìm kiếm",
                "body.filter_start_date": "Từ ngày",
                "body.filter_end_date": "Đến ngày",
                "body.filter_button": "Lọc Sự Kiện",
                "body.newest_events": "SỰ KIỆN MỚI NHẤT",
                "body.featured_events": "SỰ KIỆN NỔI BẬT",
                "body.view_calendar": "Xem lịch",
                "body.create_event": "Tạo sự kiện",
                "body.music_section": "CA NHẠC",
                "body.view_all": "Xem tất cả",
                "body.culture_section": "VĂN HÓA NGHỆ THUẬT",
                "body.tourism_section": "THAM QUAN - DU LỊCH",
                "body.cta_badge": "Hợp tác cùng BDHT",
                "body.cta_title": "Bắt đầu bán vé sự kiện của bạn",
                "body.filter_all": "Tất cả",

                // Event dynamic items
                "event.price_from": "Giá từ",
                "event.buy_ticket": "Mua vé",
                "event.contact_price": "Liên hệ",

                // Footer Section
                "footer.col_contact_title": "Liên Hệ Hợp Tác",
                "footer.phone": "Điện thoại: 0243.788.00.99 (8:30 - 17:00)",
                "footer.hotline": "Hotline: 08.999.80.818",
                "footer.email": "Email: chamsockhachhang@bdht.vn",
                "footer.address": "Địa chỉ: Số 1, Phạm Văn Bạch, phường Yên Hòa, quận Cầu Giấy, Hà Nội.",
                "footer.col_info_title": "Thông tin",
                "footer.info_about": "Về chúng tôi",
                "footer.info_promo": "Khuyến mãi",
                "footer.info_privacy": "Chính sách bảo mật",
                "footer.info_guide": "Hướng dẫn đặt vé",
                "footer.info_terms": "Điều khoản sử dụng",
                "footer.col_customer_title": "Khách hàng",
                "footer.cust_profile": "Tài khoản cá nhân",
                "footer.cust_manage": "Quản lý & Tạo sự kiện",
                "footer.cust_events": "Danh sách sự kiện",
                "footer.cust_past": "Sự kiện đã diễn ra",
                "footer.col_newsletter_title": "Nhận Bản Tin",
                "footer.newsletter_desc": "Đăng ký nhận thông tin ưu đãi hấp dẫn và sự kiện văn hóa nghệ thuật mới nhất từ BDHT.",
                "footer.email_placeholder": "Email của bạn...",
                "footer.license": "Giấy phép Kinh doanh số 0107641285 do Sở Kế Hoạch & Đầu Tư Thành Phố Hà Nội cấp ngày 21/11/2016",

                // Chat AI
                "chat.welcome": "Xin chào! 👋",
                "chat.welcome_desc": "Chào mừng bạn đến với BDHT Assistant. Trợ lý AI của chúng tôi sẵn sàng giải đáp mọi thắc mắc ngay lập tức!",
                "chat.start_btn": "Bắt đầu trò chuyện",
                "chat.start_btn_desc": "Phản hồi ngay trong vài giây",
                "chat.helper_title": "Bạn đang tìm sự kiện nào?",
                "chat.helper_desc": "Hãy hỏi tôi về các liveshow nổi bật, giá vé, hoặc các ưu đãi mới nhất!",
                "chat.history_title": "Lịch sử trò chuyện",
                "chat.history_loading": "Đang tải lịch sử...",
                "chat.agent_name": "BDHT Assistant",
                "chat.agent_welcome_msg": "Xin chào! Tôi là BDHT Assistant. Bạn cần hỗ trợ đặt vé hay tìm kiếm sự kiện nào hôm nay?",
                "chat.input_placeholder": "Gửi tin nhắn...",
                "chat.powered_by": "Powered by BDHT AI"
            },
            en: {
                "header.subtitle": "Premium Ticketing",
                "header.search_placeholder": "Search events, artists...",
                "header.login": "Login",
                "header.register": "Register",
                "header.profile": "Personal Profile",
                "header.my_events": "Your Events",
                "header.logout": "Logout",
                "header.all_locations": "All Locations",
                "header.hanoi": "Ha Noi",
                "header.hcm": "Ho Chi Minh City",
                "nav.music": "Concerts",
                "nav.culture": "Arts & Culture",
                "nav.tourism": "Sightseeing",
                "nav.workshop": "Workshop",
                "nav.movies": "Movies",
                "nav.sports": "Sports",
                "nav.news": "News",
                "nav.tech": "Technology",
                "nav.education": "Education",

                // Body Section
                "body.search_title": "Discover Events",
                "body.search_subtitle": "Thousands of experiences are waiting for you",
                "body.search_placeholder": "Enter event title, artist name, venue...",
                "body.search_button": "Search",
                "body.filter_start_date": "From date",
                "body.filter_end_date": "To date",
                "body.filter_button": "Filter Events",
                "body.newest_events": "NEWEST EVENTS",
                "body.featured_events": "FEATURED EVENTS",
                "body.view_calendar": "Calendar",
                "body.create_event": "Create Event",
                "body.music_section": "CONCERTS",
                "body.view_all": "View all",
                "body.culture_section": "ARTS & CULTURE",
                "body.tourism_section": "SIGHTSEEING & TOURISM",
                "body.cta_badge": "Partner with BDHT",
                "body.cta_title": "Start selling your event tickets",
                "body.filter_all": "All",

                // Event dynamic items
                "event.price_from": "Price from",
                "event.buy_ticket": "Buy tickets",
                "event.contact_price": "Contact",

                // Footer Section
                "footer.col_contact_title": "Contact Collaboration",
                "footer.phone": "Phone: 0243.788.00.99 (8:30 AM - 5:00 PM)",
                "footer.hotline": "Hotline: 08.999.80.818",
                "footer.email": "Email: support@bdht.vn",
                "footer.address": "Address: No. 1, Pham Van Bach, Yen Hoa ward, Cau Giay district, Ha Noi.",
                "footer.col_info_title": "Information",
                "footer.info_about": "About Us",
                "footer.info_promo": "Promotions",
                "footer.info_privacy": "Privacy Policy",
                "footer.info_guide": "Booking Guide",
                "footer.info_terms": "Terms of Use",
                "footer.col_customer_title": "Customers",
                "footer.cust_profile": "Personal Profile",
                "footer.cust_manage": "Manage & Create Event",
                "footer.cust_events": "Event Directory",
                "footer.cust_past": "Past Events",
                "footer.col_newsletter_title": "Get Newsletter",
                "footer.newsletter_desc": "Subscribe to receive attractive promotions and the latest arts & cultural events from BDHT.",
                "footer.email_placeholder": "Your email address...",
                "footer.license": "Business License No. 0107641285 issued by Ha Noi Department of Planning & Investment on 21/11/2016",

                // Chat AI
                "chat.welcome": "Hello! 👋",
                "chat.welcome_desc": "Welcome to BDHT Assistant. Our AI assistant is ready to help you instantly!",
                "chat.start_btn": "Start conversation",
                "chat.start_btn_desc": "Response in seconds",
                "chat.helper_title": "Which event are you looking for?",
                "chat.helper_desc": "Ask me about featured concerts, ticket pricing, or the latest promotions!",
                "chat.history_title": "Chat History",
                "chat.history_loading": "Loading chat history...",
                "chat.agent_name": "BDHT Assistant",
                "chat.agent_welcome_msg": "Hello! I am BDHT Assistant. Do you need help booking tickets or finding an event today?",
                "chat.input_placeholder": "Send a message...",
                "chat.powered_by": "Powered by BDHT AI"
            }
        };
        return fallback[lang] || fallback['vi'];
    }

    /**
     * Switches language. Clears the selected cache key, triggers API call, and rerenders DOM.
     */
    async setLanguage(lang) {
        if (lang !== 'vi' && lang !== 'en') return;
        this.currentLang = lang;
        localStorage.setItem('app_lang', lang);
        
        // Xóa cache cũ của ngôn ngữ này để bắt buộc kéo bản dịch mới nhất từ DB
        localStorage.removeItem(`app_translations_${lang}`);
        
        // Gọi lại API
        await this.fetchTranslations(lang);
        
        // Rerender lại toàn bộ text trên giao diện
        this.renderLanguage();
        
        // Cập nhật lại trạng thái hiển thị cờ/text trên nút bấm dropdown
        this.updateDropdownButton();
        
        // Phát sự kiện toàn cục để các component khác nếu cần có thể lắng nghe
        const event = new CustomEvent('languageChanged', { detail: { lang } });
        window.dispatchEvent(event);
    }

    getLanguage() {
        return this.currentLang;
    }

    translate(key) {
        return this.dictionary[key] || key;
    }

    renderLanguage() {
        if (this.isRendering) return;
        this.isRendering = true;

        try {
            // 1. Dịch các phần tử có data-i18n
            const elements = document.querySelectorAll('[data-i18n]');
            elements.forEach(el => {
                const key = el.getAttribute('data-i18n');
                const translation = this.translate(key);
                
                if (translation && translation !== key) {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        if (el.placeholder !== translation) {
                            el.placeholder = translation;
                        }
                    } else {
                        if (el.textContent !== translation) {
                            el.textContent = translation;
                        }
                    }
                }
            });

            // 2. Dịch các phần tử có data-i18n-placeholder
            const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
            placeholderElements.forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                const translation = this.translate(key);
                if (translation && translation !== key) {
                    if (el.placeholder !== translation) {
                        el.placeholder = translation;
                    }
                }
            });

            // Cập nhật thuộc tính lang của HTML
            document.documentElement.lang = this.currentLang;
        } finally {
            this.isRendering = false;
        }
    }

    setupMutationObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        let debounceTimeout = null;

        this.observer = new MutationObserver((mutations) => {
            let shouldTranslate = false;

            for (let mutation of mutations) {
                // Kiểm tra xem có node mới nào được thêm vào chứa data-i18n hoặc data-i18n-placeholder không
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.hasAttribute('data-i18n') || 
                                node.hasAttribute('data-i18n-placeholder') ||
                                node.querySelector('[data-i18n], [data-i18n-placeholder]')) {
                                shouldTranslate = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldTranslate) break;
            }

            if (shouldTranslate) {
                if (debounceTimeout) clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    if (!this.isRendering) {
                        this.renderLanguage();
                    }
                }, 50);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    updateDropdownButton() {
        const flagEl = document.getElementById('lang-selected-flag');
        const textEl = document.getElementById('lang-selected-text');
        
        if (flagEl) {
            flagEl.textContent = this.currentLang === 'vi' ? '🇻🇳' : '🇬🇧';
        }
        if (textEl) {
            textEl.textContent = this.currentLang === 'vi' ? 'VN' : 'EN';
        }
    }

    setupDropdown() {
        const btn = document.getElementById('lang-dropdown-btn');
        const menu = document.getElementById('lang-dropdown-menu');
        const chevron = document.getElementById('lang-chevron');

        if (!btn || !menu) return;

        // Đồng bộ hiển thị cờ trên nút lúc tải trang
        this.updateDropdownButton();

        // Tránh gán đè sự kiện trùng lặp
        if (btn._hasLangListener) return;
        btn._hasLangListener = true;

        // Toggle ẩn/hiển thị dropdown menu khi click vào nút
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
            if (chevron) {
                chevron.classList.toggle('rotate-180');
            }
        });

        // Gán sự kiện khi click chọn ngôn ngữ
        const options = menu.querySelectorAll('[data-lang]');
        options.forEach(opt => {
            opt.addEventListener('click', async (e) => {
                e.stopPropagation();
                const selectedLang = opt.getAttribute('data-lang');
                
                // Hiển thị opacity mờ nhẹ trong lúc fetch dữ liệu
                btn.style.opacity = '0.5';
                await this.setLanguage(selectedLang);
                btn.style.opacity = '1';
                
                menu.classList.add('hidden');
                if (chevron) {
                    chevron.classList.remove('rotate-180');
                }
            });
        });

        // Click ra bên ngoài màn hình thì đóng dropdown
        window.addEventListener('click', () => {
            if (!menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
                if (chevron) {
                    chevron.classList.remove('rotate-180');
                }
            }
        });
    }
}

// Khởi tạo đối tượng toàn cục
window.i18n = new I18nManager();

// Tự động chạy khi cây DOM sẵn sàng (dành cho các phần không tải qua AJAX)
document.addEventListener('DOMContentLoaded', () => {
    window.i18n.init();
});
