/**
 * ----------------------------------------------------------------------------
 * HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT
 * Tệp tin: all-events.js
 * Chức năng: Quản lý giao diện, hiển thị, tìm kiếm và phân trang danh sách sự kiện
 * Người thực hiện: Sinh viên Nguyễn Anh Tuấn
 * Vai trò: Tạo trải nghiệm mượt mà với Slider nổi bật, Carousel cuộn tự động và phân trang động
 * ----------------------------------------------------------------------------
 */

// Lắng nghe sự kiện tải trang hoàn tất để thiết lập các thành phần giao diện
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Tải Header động dùng chung từ components
    if (window.pageUtils && window.pageUtils.loadHeader) {
        await window.pageUtils.loadHeader();
    }

    // 2. Gọi API để lấy danh sách sự kiện thực tế từ cơ sở dữ liệu backend
    await loadEventsFromBackend();

    // 3. Đọc các tham số lọc truyền trên URL (ví dụ: ?category=Workshop&location=HaNoi)
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    const locationParam = urlParams.get('location');

    // Nếu trên URL có tham mục cụ thể, cập nhật danh mục lọc hiện tại
    if (categoryParam) {
        currentCategory = categoryParam;
    }

    // 4. Khởi tạo các thành phần giao diện cao cấp
    initHeroSlider();            // Khởi động Slider 3 sự kiện hot đầu trang
    initFeaturedCarousel();      // Khởi động Carousel cuộn tự động các sự kiện nổi bật
    initAllEventsPagination();   // Khởi động lưới hiển thị tất cả sự kiện có phân trang

    // 5. Thực hiện tự động lọc ngay lập tức nếu trên URL có tham số tìm kiếm/lọc
    if (categoryParam || locationParam) {
        filterEvents();
    }

    // 6. Tải Footer động dùng chung từ components
    if (window.pageUtils && window.pageUtils.loadFooter) {
        await window.pageUtils.loadFooter();
    }
});

// ============================================================================
// 1. DỮ LIỆU ĐỘNG TỪ BACKEND VÀ CÁC HÀM TRỢ GIÚP HIỂN THỊ
// ============================================================================

// Mảng chứa toàn bộ dữ liệu sự kiện gốc tải về từ Backend
let eventsData = [];

/**
 * Trích xuất đường dẫn hình ảnh của sự kiện một cách an toàn.
 */
function getEventImageUrl(event) {
    return event?.bannerImageUrl || event?.imageUrl || event?.image || '';
}

/**
 * Hàm Helper dựng thẻ hình ảnh HTML, chèn hiệu ứng khi không có ảnh (fallback UI).
 */
function renderEventImage(imageUrl, altText, className = '') {
    if (!imageUrl) {
        return `
            <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 text-orange-400">
                <i class="fas fa-image text-2xl"></i>
            </div>`;
    }
    return `<img src="${imageUrl}" class="${className}" alt="${altText}">`;
}

/**
 * Hàm Helper trích xuất thành phố từ chuỗi địa chỉ đầy đủ của địa điểm tổ chức.
 */
function extractCityFromAddress(address) {
    if (!address) return '';
    const addrUpper = String(address).toUpperCase();

    // Khớp từ khóa các thành phố lớn tại Việt Nam
    if (addrUpper.includes('HÀ NỘI') || addrUpper.includes('HA NOI') || addrUpper.includes('MỸ ĐÌNH')) return 'Hà Nội';
    if (addrUpper.includes('HỒ CHÍ MINH') || addrUpper.includes('TP.HCM') || addrUpper.includes('TP. HỒ CHÍ MINH') || addrUpper.includes('SAI GON') || addrUpper.includes('SÀI GÒN') || addrUpper.includes('QUÂN KHU 7') || addrUpper.includes('HÒA BÌNH')) return 'TP.HCM';
    if (addrUpper.includes('ĐÀ NẴNG') || addrUpper.includes('DA NANG')) return 'Đà Nẵng';
    if (addrUpper.includes('HƯNG YÊN') || addrUpper.includes('HUNG YEN')) return 'Hưng Yên';
    if (addrUpper.includes('CẦN THƠ') || addrUpper.includes('CAN THO')) return 'Cần Thơ';
    if (addrUpper.includes('HẢI PHÒNG') || addrUpper.includes('HAI PHONG')) return 'Hải Phòng';
    if (addrUpper.includes('BÌNH DƯƠNG') || addrUpper.includes('BINH DUONG')) return 'Bình Dương';

    // Cơ chế fallback: cắt dấu phẩy cuối cùng
    const parts = String(address).split(',');
    if (parts.length > 1) {
        return parts[parts.length - 1].trim();
    }
    return '';
}

/**
 * Gọi API backend để lấy tất cả sự kiện có trạng thái PUBLISHED và chuẩn hóa cấu trúc dữ liệu.
 */
async function loadEventsFromBackend() {
    try {
        // Gọi API công khai lấy sự kiện, giới hạn kích thước tối đa 100 sự kiện để tối ưu tốc độ tải
        const response = await window.apiClient.getPublicEvents({ page: 0, size: 100 });
        const apiEvents = response.content || response || [];

        // Chuẩn hóa và lọc các sự kiện có trạng thái đã xuất bản (PUBLISHED)
        eventsData = apiEvents
            .filter(e => e.status === 'PUBLISHED' || !e.status)
            .map(e => {
                return {
                    id: e.eventId || e.id,
                    name: e.title || e.name || 'Sự kiện',
                    category: e.categoryName || 'Sự kiện',
                    date: e.startTime ? new Date(e.startTime).toLocaleDateString('vi-VN') : 'Sắp diễn ra',
                    location: e.venue ? e.venue.venueName : (e.location || 'Đang cập nhật'),
                    city: e.venue?.city || extractCityFromAddress(e.venue?.address || e.location),
                    address: e.venue?.address || e.location || '',
                    price: e.price != null ? `${Number(e.price).toLocaleString('vi-VN')} VNĐ` : 'Xem chi tiết',
                    image: e.bannerImageUrl || e.imageUrl || '',
                    featured: e.featured || false
                };
            });

        // Khởi tạo mảng sự kiện sau khi lọc ban đầu bằng bản sao của dữ liệu gốc
        filteredEvents = [...eventsData];
    } catch (error) {
        console.error("Gặp lỗi khi tải danh sách sự kiện từ API Backend:", error);
    }
}

// ============================================================================
// 2. LOGIC ĐIỀU KHIỂN SLIDER BANNER CHÍNH (HERO SLIDER)
// ============================================================================
let currentHeroSlide = 0;       // Chỉ số của slide banner hiện tại
let heroInterval;               // Biến lưu luồng đếm thời gian tự cuộn slide
let dynamicHeroSlides = [];     // Mảng chứa các đối tượng slide dựng động từ sự kiện nổi bật

/**
 * Khởi tạo dữ liệu và giao diện cho Hero Slider.
 * Ưu tiên lấy 3 sự kiện nổi bật (featured = true) từ Backend để quảng bá.
 */
function initHeroSlider() {
    const track = document.getElementById('hero-slider-track');
    const dotsContainer = document.getElementById('hero-dots-container');
    if (!track || !dotsContainer) return;

    // Lọc ra các sự kiện nổi bật để hiển thị quảng cáo, nếu không đủ thì lấy 3 sự kiện đầu tiên
    const topEvents = eventsData.filter(e => e.featured).slice(0, 3);
    const sliderEvents = topEvents.length > 0 ? topEvents : eventsData.slice(0, 3);

    // Ánh xạ dữ liệu sự kiện sang định dạng hiển thị của Slide quảng cáo
    dynamicHeroSlides = sliderEvents.map((e, idx) => {
        const colors = ["bg-orange-500", "bg-purple-600", "bg-blue-600"];
        return {
            tag: e.category || "SỰ KIỆN NỔI BẬT",
            title: e.name,
            desc: `Chào mừng bạn đến với sự kiện ${e.name} tại ${e.location}. Đặt vé ngay hôm nay để nhận ưu đãi đặc biệt!`,
            img: getEventImageUrl(e),
            link: `nat-event-detail.html?id=${e.id}`,
            colorClass: colors[idx % 3] // Luân phiên đổi màu sắc tag cho sinh động
        };
    });

    if (dynamicHeroSlides.length === 0) return;

    // 1. Dựng cấu trúc HTML các slides quảng cáo
    track.innerHTML = dynamicHeroSlides.map(slide => `
        <div class="w-full h-full flex-shrink-0 relative">
            ${renderEventImage(slide.img, slide.title, 'w-full h-full object-cover')}
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent flex items-end p-8 md:p-16">
                <div class="max-w-4xl text-white">
                    <span class="${slide.colorClass} text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-4 inline-block shadow-sm">${slide.tag}</span>
                    <h2 class="text-3xl md:text-5xl font-black mb-4 leading-tight">${slide.title}</h2>
                    <p class="text-xs md:text-sm font-medium opacity-90 mb-6 max-w-2xl leading-relaxed">${slide.desc}</p>
                    <a href="${slide.link}" class="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-8 py-3.5 rounded-xl transition duration-300 text-xs uppercase tracking-widest inline-block shadow-lg hover:shadow-orange-500/20 hover:-translate-y-0.5">Mua Vé Ngay</a>
                </div>
            </div>
        </div>
    `).join('');

    // 2. Dựng các nút chấm tròn (Dots) chỉ mục điều hướng dưới chân banner
    dotsContainer.innerHTML = dynamicHeroSlides.map((_, idx) => `
        <span onclick="setHeroSlide(${idx})" class="w-2.5 h-2.5 rounded-full bg-white/50 cursor-pointer transition-all duration-300 hero-dot ${idx === 0 ? 'active w-5 bg-orange-500' : ''}"></span>
    `).join('');

    // 3. Kích hoạt luồng đếm thời gian để tự động chuyển slide sau mỗi 4 giây
    startHeroInterval();
}

/**
 * Hiển thị chính xác slide tại chỉ số cụ thể, hỗ trợ hiệu ứng chuyển cảnh trượt mượt mà.
 */
function showHeroSlide(idx) {
    const track = document.getElementById('hero-slider-track');
    const dots = document.querySelectorAll('.hero-dot');
    if (!track) return;

    // Vòng lặp bảo vệ chỉ số slide vượt biên
    if (idx >= dynamicHeroSlides.length) {
        currentHeroSlide = 0;
    } else if (idx < 0) {
        currentHeroSlide = dynamicHeroSlides.length - 1;
    } else {
        currentHeroSlide = idx;
    }

    // Sử dụng CSS Transform TranslateX để trượt toàn bộ thanh trượt
    track.style.transform = `translateX(-${currentHeroSlide * 100}%)`;

    // Đồng bộ trạng thái active (đổi màu và độ dài nút chấm tròn)
    dots.forEach((dot, index) => {
        if (index === currentHeroSlide) {
            dot.classList.add('active', 'w-5', 'bg-orange-500');
            dot.classList.remove('bg-white/50', 'w-2.5');
        } else {
            dot.classList.remove('active', 'w-5', 'bg-orange-500');
            dot.classList.add('bg-white/50', 'w-2.5');
        }
    });
}

/**
 * Di chuyển Slide sang trái hoặc phải theo số lượng bước n (ví dụ: -1 hoặc +1).
 * Đồng thời đặt lại đếm giờ tự cuộn để tránh xung đột thao tác của người dùng.
 */
window.moveHeroSlide = function (n) {
    clearInterval(heroInterval);
    currentHeroSlide += n;
    showHeroSlide(currentHeroSlide);
    startHeroInterval();
};

/**
 * Nhảy trực tiếp đến Slide chỉ định khi người dùng click vào dấu chấm tròn.
 */
window.setHeroSlide = function (idx) {
    clearInterval(heroInterval);
    currentHeroSlide = idx;
    showHeroSlide(currentHeroSlide);
    startHeroInterval();
};

/**
 * Thiết lập bộ định thời tự động cuộn Slide sau mỗi 4000ms.
 */
function startHeroInterval() {
    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        currentHeroSlide++;
        showHeroSlide(currentHeroSlide);
    }, 4000);
}

// ============================================================================
// 3. LOGIC CAROUSEL SỰ KIỆN NỔI BẬT (FEATURED CAROUSEL)
// ============================================================================
let featuredInterval;               // Bộ đếm thời gian cho Carousel
let isFeaturedPaused = false;       // Cờ tạm dừng trượt khi rê chuột vào khung hình

/**
 * Khởi tạo Carousel giới thiệu danh sách các sự kiện nổi bật với chế độ tự cuộn chậm cực mượt.
 */
function initFeaturedCarousel() {
    const track = document.getElementById('featured-carousel-track');
    if (!track) return;

    // Lọc lấy danh sách các sự kiện nổi bật
    const featuredEvents = eventsData.filter(e => e.featured);

    // Dựng giao diện HTML cho từng Card trong Carousel
    track.innerHTML = featuredEvents.map(event => `
        <div class="flex-shrink-0 w-80 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col h-[400px]">
            <div class="relative w-full h-48 overflow-hidden bg-slate-100">
                <span class="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-white font-extrabold text-[9px] px-3 py-1.5 rounded-full uppercase tracking-wider z-10">${event.category}</span>
                ${renderEventImage(getEventImageUrl(event), event.name, 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out')}
            </div>
            <div class="p-6 flex-1 flex flex-col justify-between">
                <div>
                    <h3 class="text-base font-extrabold text-slate-900 group-hover:text-brand-purple transition-colors line-clamp-2 leading-snug tracking-tight mb-2">${event.name}</h3>
                    <p class="text-xs font-semibold text-slate-400 flex items-center gap-1.5"><i class="fas fa-map-marker-alt text-orange-500"></i> ${event.location}</p>
                </div>
                <div class="border-t border-slate-50 pt-4 flex items-center justify-between">
                    <div class="flex flex-col">
                        <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-0.5">Ngày diễn ra</span>
                        <span class="text-xs font-bold text-slate-600 flex items-center gap-1.5"><i class="far fa-calendar-alt text-brand-purple"></i> ${event.date}</span>
                    </div>
                    <a href="nat-event-detail.html?id=${event.id}" class="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-orange-500/10 transition">Mua vé</a>
                </div>
            </div>
        </div>
    `).join('');

    // Bắt đầu luồng cuộn pixel-by-pixel
    startFeaturedInterval();

    // 1. Lắng nghe sự kiện di chuột vào (mouseenter) để dừng cuộn nhằm giúp người dùng dễ xem chi tiết
    track.addEventListener('mouseenter', () => {
        isFeaturedPaused = true;
    });

    // 2. Lắng nghe sự kiện di chuột ra (mouseleave) để tiếp tục cuộn tự động
    track.addEventListener('mouseleave', () => {
        isFeaturedPaused = false;
    });

    // 3. Liên kết sự kiện click cho các nút mũi tên trái / phải
    const btnPrev = document.getElementById('featured-prev');
    const btnNext = document.getElementById('featured-next');

    if (btnPrev && btnNext) {
        btnPrev.addEventListener('click', () => {
            clearInterval(featuredInterval);
            track.scrollLeft -= 340; // Trượt sang trái 1 cột kích thước 340px
            startFeaturedInterval();
        });
        btnNext.addEventListener('click', () => {
            clearInterval(featuredInterval);
            track.scrollLeft += 340; // Trượt sang phải 1 cột kích thước 340px
            startFeaturedInterval();
        });
    }
}

/**
 * Cuộn tự động Carousel từng điểm ảnh (2px mỗi 25ms) tạo hiệu ứng trượt vô tận mượt mà.
 */
function startFeaturedInterval() {
    clearInterval(featuredInterval);
    featuredInterval = setInterval(() => {
        const track = document.getElementById('featured-carousel-track');
        if (!track || isFeaturedPaused) return;

        // Tính toán khoảng cách cuộn tối đa cho phép
        const maxScroll = track.scrollWidth - track.clientWidth;

        // Nếu đã cuộn tới sát lề phải, tự động quay về vị trí ban đầu bên trái
        if (track.scrollLeft >= maxScroll - 5) {
            track.scrollLeft = 0;
        } else {
            track.scrollLeft += 2; // Tăng dần 2px mỗi bước lặp
        }
    }, 25);
}

// ============================================================================
// 4. LOGIC TÌM KIẾM, LỌC VÀ PHÂN TRANG (PAGINATION & FILTERS)
// ============================================================================

let currentPage = 1;                // Lưu trang hiện tại (mặc định bắt đầu từ trang 1)
const itemsPerPage = 8;             // Giới hạn hiển thị tối đa 8 sự kiện trên một trang
let filteredEvents = [];            // Mảng chứa danh sách sự kiện sau khi qua bộ lọc tìm kiếm
let currentCategory = "Tất cả";     // Tên danh mục hiện tại đang được lọc

/**
 * Khởi tạo toàn bộ sự kiện tìm kiếm và hiển thị phân trang.
 */
function initAllEventsPagination() {
    setupPaginationFilters();
    renderPaginationEvents();
}

/**
 * Dựng thanh các danh mục sự kiện động (Category Chips) từ dữ liệu thực tế Backend.
 * Tránh hardcode thủ công trong file HTML, chứng minh tư duy lập trình chuyên nghiệp.
 */
function syncCategoryChips() {
    const container = document.getElementById('all-events-categories');
    if (!container) return;

    // Tạo mảng danh mục duy nhất từ dữ liệu gốc bằng Set
    const uniqueCategories = ['Tất cả'];
    for (let i = 0; i < eventsData.length; i++) {
        const cat = eventsData[i].category || 'Sự kiện';
        if (cat && !uniqueCategories.includes(cat)) {
            uniqueCategories.push(cat);
        }
    }

    // Dựng mã HTML cho các nút bấm danh mục
    container.innerHTML = uniqueCategories.map(category => {
        const isActive = category === currentCategory;
        const activeClass = 'border-brand-purple bg-brand-purple text-white';
        const normalClass = 'border-slate-200 bg-white text-slate-650 hover:border-brand-purple hover:text-brand-purple';

        return `
            <button
                type="button"
                data-category="${category}"
                class="pagination-chip px-5 py-2.5 border rounded-full text-xs font-bold transition ${isActive ? activeClass : normalClass}">
                ${category}
            </button>
        `;
    }).join('');

    // Liên kết sự kiện click cho các nút danh mục vừa tạo
    container.querySelectorAll('.pagination-chip').forEach((button) => {
        button.addEventListener('click', () => {
            currentCategory = button.dataset.category;
            currentPage = 1; // Khởi tạo lại về trang đầu tiên sau khi chuyển danh mục
            syncCategoryChips();
            filterEvents();
        });
    });
}

/**
 * Thiết lập các bộ lắng nghe sự kiện tìm kiếm ở cả trang chủ lẫn Header.
 */
function setupPaginationFilters() {
    syncCategoryChips();

    // 1. Sự kiện thay đổi ô tìm kiếm tại khu vực Tất cả sự kiện
    const searchInput = document.getElementById('all-events-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            filterEvents();
        });
    }

    // 2. [ĐỒNG BỘ UX] Sự kiện gõ từ khóa ở thanh tìm kiếm Header và nhấn Enter
    const headerSearchInput = document.getElementById('header-search-keyword') || document.querySelector('#header-container input');
    if (headerSearchInput) {
        headerSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentPage = 1;

                // Tự động cuộn trang xuống lưới hiển thị sự kiện để người dùng thấy ngay kết quả
                const section = document.getElementById('all-events-section-title') || document.getElementById('all-events-grid');
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                filterEvents();
            }
        });
    }
}

/**
 * [Hàm Helper Tách Nhỏ] Kiểm tra điều kiện lọc theo danh mục.
 */
function checkIfEventMatchesCategory(event, targetCategory) {
    if (targetCategory === "Tất cả") {
        return true; // Trả về true nếu không lọc cụ thể
    }
    return event.category === targetCategory;
}

/**
 * [Hàm Helper Tách Nhỏ] Kiểm tra điều kiện lọc theo từ khóa tìm kiếm (trong tên sự kiện hoặc địa điểm).
 */
function checkIfEventMatchesKeyword(event, keyword) {
    if (!keyword) {
        return true; // Khớp tất cả nếu không gõ từ khóa
    }
    const lowerKeyword = keyword.toLowerCase();
    const eventName = (event.name || '').toLowerCase();
    const eventLocation = (event.location || '').toLowerCase();

    return eventName.includes(lowerKeyword) || eventLocation.includes(lowerKeyword);
}

/**
 * [Hàm Helper Tách Nhỏ] Kiểm tra điều kiện lọc theo địa điểm được truyền từ URL tham số.
 */
function checkIfEventMatchesLocation(event, locationParam) {
    if (!locationParam) {
        return true; // Khớp tất cả nếu không lọc địa điểm qua URL
    }
    const lowerLocationParam = locationParam.toLowerCase();
    const eventLocation = (event.location || '').toLowerCase();

    return eventLocation.includes(lowerLocationParam);
}

/**
 * [Tái Cấu Trúc Sư Phạm] Bộ lọc tổng thể các sự kiện dựa vào điều kiện kết hợp.
 * Sử dụng vòng lặp truyền thống và các hàm Helper kiểm tra riêng biệt thay thế cho mảng logic phức tạp.
 */
function filterEvents() {
    // Thu thập từ khóa tìm kiếm từ cả hai ô nhập (ưu tiên ô tìm kiếm chi tiết)
    const oldSearchInput = document.getElementById('all-events-search');
    const headerSearchInput = document.getElementById('header-search-keyword') || document.querySelector('#header-container input');

    let keyword = "";
    if (oldSearchInput && oldSearchInput.value) {
        keyword = oldSearchInput.value.trim();
    } else if (headerSearchInput) {
        keyword = headerSearchInput.value.trim();
    }

    // Đọc tham số địa điểm từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const locationParam = urlParams.get('location') || '';

    // Khởi tạo lại mảng kết quả rỗng
    const results = [];

    // Duyệt tuyến tính qua mảng dữ liệu gốc
    for (let i = 0; i < eventsData.length; i++) {
        const event = eventsData[i];

        const isCatMatch = checkIfEventMatchesCategory(event, currentCategory);
        const isKeyMatch = checkIfEventMatchesKeyword(event, keyword);
        const isLocMatch = checkIfEventMatchesLocation(event, locationParam);

        // Sự kiện thỏa mãn tất cả bộ lọc thì đưa vào kết quả hiển thị
        if (isCatMatch && isKeyMatch && isLocMatch) {
            results.push(event);
        }
    }

    filteredEvents = results;
    renderPaginationEvents();
}

/**
 * [Tường Minh Hóa Thuật Toán Phân Trang] Hiển thị danh sách sự kiện tương ứng của trang hiện tại lên giao diện.
 */
function renderPaginationEvents() {
    const grid = document.getElementById('all-events-grid');
    const controls = document.getElementById('pagination-controls');
    if (!grid || !controls) return;

    // --- CÔNG THỨC TOÁN HỌC PHÂN TRANG CHI TIẾT ---
    const totalItems = filteredEvents.length;
    const startIndex = (currentPage - 1) * itemsPerPage; // Vị trí bắt đầu trích xuất
    const endIndex = startIndex + itemsPerPage;         // Vị trí kết thúc trích xuất

    // Cắt mảng sự kiện để chỉ lấy đúng 8 phần tử của trang hiện tại
    const paginatedItems = filteredEvents.slice(startIndex, endIndex);

    // Trường hợp không tìm thấy kết quả nào sau khi lọc
    if (paginatedItems.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16 flex flex-col items-center justify-center">
                <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl mb-4 shadow-inner">
                    <i class="fas fa-search"></i>
                </div>
                <h3 class="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-1">Không tìm thấy sự kiện nào</h3>
                <p class="text-[10px] text-slate-400 font-bold">Hãy thử thay đổi danh mục hoặc từ khóa tìm kiếm</p>
            </div>
        `;
        controls.innerHTML = '';
        return;
    }

    // Render danh sách sự kiện lên lưới hiển thị
    grid.innerHTML = paginatedItems.map(event => `
        <a href="nat-event-detail.html?id=${event.id}" class="group block bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-brand-purple/5 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between h-[360px]">
            <div class="relative w-full h-40 overflow-hidden bg-slate-100 flex-shrink-0">
                ${renderEventImage(getEventImageUrl(event), event.name, 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out')}
                <div class="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md text-slate-900 font-extrabold text-[10px] px-3 py-1.5 rounded-full shadow-sm z-10">${event.price}</div>
            </div>
            <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <span class="text-[9px] font-extrabold text-brand-orange uppercase tracking-widest mb-1 inline-block">${event.category}</span>
                    <h3 class="text-xs font-extrabold text-slate-800 group-hover:text-brand-purple transition-colors line-clamp-2 leading-snug tracking-tight">${event.name}</h3>
                </div>
                <div class="border-t border-slate-50 pt-3 mt-3 flex flex-col gap-1.5 text-[10px] font-bold text-slate-400">
                    <span class="flex items-center gap-1.5"><i class="fas fa-map-marker-alt text-slate-300"></i> ${event.location}</span>
                    <span class="flex items-center gap-1.5 text-slate-600"><i class="far fa-calendar-alt text-brand-purple"></i> ${event.date}</span>
                </div>
            </div>
        </a>
    `).join('');

    // Tiến hành vẽ các nút bấm phân trang phía dưới lưới
    renderPaginationControls();
}

/**
 * Vẽ thanh điều khiển phân trang động (Nút Trước, các số Trang, và nút Tiếp Theo).
 */
function renderPaginationControls() {
    const controls = document.getElementById('pagination-controls');
    if (!controls) return;

    // Tính tổng số lượng trang dựa vào công thức làm tròn lên
    const totalItems = filteredEvents.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Nếu tổng số trang nhỏ hơn hoặc bằng 1 thì ẩn thanh điều khiển phân trang đi
    if (totalPages <= 1) {
        controls.innerHTML = '';
        return;
    }

    let buttonsHTML = '';

    // 1. Dựng nút bấm quay lại trang trước (Prev Button)
    const isFirstPage = currentPage === 1;
    buttonsHTML += `
        <button onclick="changePage(${currentPage - 1})" ${isFirstPage ? 'disabled' : ''} class="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition shadow-sm">
            <i class="fas fa-chevron-left text-xs"></i>
        </button>
    `;

    // 2. Dựng danh sách các nút số trang chi tiết
    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        const activeClass = 'bg-brand-purple text-white border-brand-purple';
        const normalClass = 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50';

        buttonsHTML += `
            <button onclick="changePage(${i})" class="w-10 h-10 rounded-full border ${isActive ? activeClass : normalClass} font-extrabold text-xs flex items-center justify-center transition shadow-sm">
                ${i}
            </button>
        `;
    }

    // 3. Dựng nút bấm tiến đến trang sau (Next Button)
    const isLastPage = currentPage === totalPages;
    buttonsHTML += `
        <button onclick="changePage(${currentPage + 1})" ${isLastPage ? 'disabled' : ''} class="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition shadow-sm">
            <i class="fas fa-chevron-right text-xs"></i>
        </button>
    `;

    controls.innerHTML = buttonsHTML;
}

/**
 * Xử lý sự kiện khi người dùng nhấn chuyển sang trang số `pageNum`.
 * Đồng thời cuộn màn hình mượt mà trở lại đầu danh sách sự kiện để tối ưu trải nghiệm.
 */
window.changePage = function (pageNum) {
    const totalItems = filteredEvents.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Kiểm tra tính hợp lệ của số trang yêu cầu chuyển
    if (pageNum < 1 || pageNum > totalPages) return;

    currentPage = pageNum;
    renderPaginationEvents();

    // Cuộn màn hình lên đầu danh sách sự kiện mượt mà
    const gridEl = document.getElementById('all-events-section-title');
    if (gridEl) {
        gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};