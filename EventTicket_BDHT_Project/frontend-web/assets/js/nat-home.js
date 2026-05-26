/**
 * ----------------------------------------------------------------------------
 * HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT
 * Tệp tin: home.js
 * Chức năng: Điều khiển trang chủ (Landing Page index.html)
 * Người thực hiện: Sinh viên Nguyễn Anh Tuấn
 * Vai trò: Quản lý các dải sự kiện cuộn ngang, Banner Hero Slider, 
 *          nạp bộ lọc danh mục/địa điểm động và lưới phân trang sự kiện toàn cục.
 * ----------------------------------------------------------------------------
 */

// ============================================================================
// 1. QUẢN LÝ TRẠNG THÁI GIAO DIỆN (STATE MANAGEMENT)
// ============================================================================
let currentPage = 1;         // Trang hiện tại đang hiển thị trong lưới Tất cả sự kiện
const itemsPerPage = 8;      // Số lượng sự kiện tối đa hiển thị trên mỗi trang lưới sự kiện
let ALL_EVENTS_DATA = [];    // Bộ nhớ đệm lưu toàn bộ danh sách sự kiện gốc lấy từ API Backend
let filteredEvents = [];      // Danh sách các sự kiện thỏa mãn bộ lọc tìm kiếm hiện hành

/**
 * Hàm trợ giúp trích xuất địa chỉ hình ảnh banner hoặc ảnh chính của sự kiện một cách an toàn.
 */
function getEventImageUrl(event) {
    return event?.bannerImageUrl || event?.imageUrl || '';
}

/**
 * Hàm trợ giúp dựng thẻ img chứa ảnh sự kiện, tự động hiển thị ảnh trống nếu dữ liệu bị rỗng.
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

// Lắng nghe sự kiện tải xong tài liệu DOM để bắt đầu khởi chạy trang chủ
document.addEventListener('DOMContentLoaded', async function () {
    await initializeHomePage();
});

/**
 * Tiến trình khởi chạy tổng thể của Trang chủ.
 */
async function initializeHomePage() {
    // 1. Tải Header dùng chung bằng cơ chế nạp động
    if (window.pageUtils && window.pageUtils.loadHeader) {
        await window.pageUtils.loadHeader();
    }

    // 2. Thiết lập bộ lắng nghe sự kiện lọc và tìm kiếm ở lưới sự kiện
    setupAllEventsSection();

    // 3. Kết nối API Backend tải dữ liệu sự kiện thực tế để phân phối lên giao diện
    await fetchEvents();

    // 4. Tải Footer dùng chung bằng cơ chế nạp động
    if (window.pageUtils && window.pageUtils.loadFooter) {
        await window.pageUtils.loadFooter();
    }
}

// ============================================================================
// 2. KẾT NỐI API TẢI DỮ LIỆU THỰC TẾ TỪ BACKEND (API FETCHING)
// ============================================================================
async function fetchEvents() {
    try {
        // Bước A: Hiển thị giao diện xương (Skeleton loading) tạo trải nghiệm chuyên nghiệp
        showSkeletons();

        // Bước B: Gọi API công khai tải tối đa 999 sự kiện phục vụ bộ lọc tìm kiếm cục bộ ở Client
        const response = await window.apiClient.getPublicEvents({ page: 0, size: 999 });

        if (!response || !response.content) {
            throw new Error("Không nhận được dữ liệu hợp lệ từ Backend.");
        }

        // Lọc sạch mảng sự kiện chỉ giữ các sự kiện đã được xuất bản (PUBLISHED)
        const allEvents = response.content.filter(e => e.status === 'PUBLISHED');
        ALL_EVENTS_DATA = allEvents;
        filteredEvents = [...allEvents];

        // Bước C: Phân phối dữ liệu vào các dải thành phần trên Trang chủ

        // 1. Slider Banner lớn đầu trang (Hero Slider) - Lấy tối đa 5 sự kiện nổi bật
        const featuredEvents = allEvents.filter(e => e.featured === true || e.status === 'PUBLISHED');
        const sliderEvents = featuredEvents.length > 0 ? featuredEvents.slice(0, 5) : allEvents.slice(0, 5);
        renderHeroSlider(sliderEvents);

        // 2. Dải sự kiện mới nhất (Sắp xếp theo ngày tạo giảm dần - Newest)
        const latestTrack = document.getElementById('latest-events-track');
        if (latestTrack) {
            const sortedByNewest = [...allEvents]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10);

            if (sortedByNewest.length === 0) {
                latestTrack.innerHTML = `
                    <div class="w-full col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200 border-dashed shadow-sm text-center">
                        <i class="far fa-calendar-times text-5xl text-gray-300 mb-4"></i>
                        <p class="text-gray-500 font-medium text-lg">Hiện tại không có sự kiện mới nhất nào được mở bán.</p>
                    </div>
                `;
            } else {
                latestTrack.innerHTML = sortedByNewest.map(event => createEventCardHtml(event, false)).join('');
                // Kích hoạt cơ chế trượt vô hạn cho sự kiện mới nhất (Tốc độ cuộn: 1)
                setupMarqueeScroll('latest-events-track', 1);
            }
        }

        // 3. Dải sự kiện tiêu biểu/nổi bật (Lấy 10 sự kiện mặc định đầu tiên)
        const featuredTrack = document.getElementById('featured-events-track');
        if (featuredTrack) {
            const featuredList = allEvents.slice(0, 10);

            if (featuredList.length === 0) {
                featuredTrack.innerHTML = `
                    <div class="w-full col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200 border-dashed shadow-sm text-center">
                        <i class="far fa-star text-5xl text-gray-300 mb-4"></i>
                        <p class="text-gray-500 font-medium text-lg">Hiện tại không có sự kiện nổi bật nào được mở bán.</p>
                    </div>
                `;
            } else {
                featuredTrack.innerHTML = featuredList.map(event => createEventCardHtml(event, false)).join('');
                // Kích hoạt cơ chế trượt vô hạn cho sự kiện tiêu biểu (Tốc độ cuộn nhanh hơn: 1.2)
                setupMarqueeScroll('featured-events-track', 1.2);
            }
        }

        // 4. Thiết lập dữ liệu cho bộ lọc danh mục và địa phương động
        populateCategoryFilter(allEvents);
        populateLocationFilter(allEvents);

        // 5. Hiển thị lưới phân trang sự kiện toàn cục ở phần chân trang
        currentPage = 1;
        renderAllEventsGrid();

        // Bước D: Bắt đầu thiết lập khoảng thời gian tự cuộn Banner lớn đầu trang
        startHeroInterval();

    } catch (error) {
        console.error("Lỗi khi kết nối Backend API để tải sự kiện:", error);
        showErrorStates(); // Hiển thị giao diện báo lỗi kết nối máy chủ trực quan
    }
}

// ============================================================================
// 3. NẠP DỮ LIỆU ĐỘNG VÀO CÁC Ô LỌC TÌM KIẾM (DYNAMIC DROP-DOWNS)
// ============================================================================

/**
 * Nạp động các tùy chọn danh mục sự kiện thực tế từ Database vào thẻ select.
 */
function populateCategoryFilter(events) {
    const categorySelect = document.getElementById('event-category-filter');
    if (!categorySelect) return;

    // Loại bỏ các danh mục bị trùng lặp bằng cấu trúc Set
    const categories = [...new Set(events.map(e => e.categoryName).filter(c => c !== null && c !== ''))];
    categorySelect.innerHTML = '<option value="">Tất cả danh mục</option>';

    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        categorySelect.appendChild(opt);
    });
}

/**
 * Nạp động danh sách các tỉnh/thành phố thực tế của sự kiện vào hộp lọc địa điểm trên Header.
 * Đồng thời ép kiểu style màu chữ tối và nền trắng để tránh lỗi ẩn chữ của trình duyệt.
 */
function populateLocationFilter(events) {
    const locationSelect = document.getElementById('header-location-filter');
    if (!locationSelect) return;

    // Trích xuất các tỉnh thành không trùng lặp và loại bỏ các giá trị rỗng
    const cities = [...new Set(events
        .map(event => (event?.venue?.city || extractCityFromAddress(event?.venue?.address || event?.location) || '').trim())
        .filter(city => city !== ''))];

    // Thiết lập tùy chọn mặc định có thuộc tính CSS màu chữ và màu nền hiển thị rõ ràng
    locationSelect.innerHTML = '<option value="" style="color: #1e293b; background-color: #ffffff;">Mọi địa điểm</option>';

    cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.innerText = city;
        opt.style.color = '#1e293b';       // Chữ màu xám đậm Slate
        opt.style.backgroundColor = '#ffffff'; // Nền trắng
        locationSelect.appendChild(opt);
    });

    // Đồng bộ lại ô địa điểm nếu có tham số được lưu trên URL từ trang trước
    const queryLocation = new URLSearchParams(window.location.search).get('location');
    if (queryLocation) {
        locationSelect.value = queryLocation;
    }
}

/**
 * Hàm phân tích chuỗi địa chỉ đầy đủ để trích xuất ra tên Thành phố lớn tại Việt Nam.
 * Có cơ chế dự phòng cắt chuỗi bằng dấu phẩy cuối cùng.
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

    // Cơ chế dự phòng: lấy phần tử cuối cùng sau dấu phẩy
    const parts = String(address).split(',');
    if (parts.length > 1) {
        return parts[parts.length - 1].trim();
    }
    return '';
}

/**
 * Hàm chuẩn hóa chuỗi phục vụ việc tìm kiếm không dấu, không ký tự đặc biệt, không phân biệt hoa thường.
 */
function normalizeSearchValue(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Khử toàn bộ dấu tiếng Việt
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')   // Loại bỏ các ký tự đặc biệt
        .replace(/\s+/g, ' ')           // Rút gọn nhiều khoảng trắng liên tiếp
        .trim();
}

/**
 * Kiểm tra xem sự kiện có chứa từ khóa tìm kiếm trong bất kỳ thuộc tính nào hay không.
 */
function matchesLocationKeyword(event, keyword) {
    const normalizedKeyword = normalizeSearchValue(keyword);
    if (!normalizedKeyword) return true;

    // Tập hợp toàn bộ các chuỗi văn bản tìm kiếm khả dụng
    const searchableText = [
        event?.title,
        event?.artistNames,
        event?.description,
        event?.location,
        event?.venue?.venueName,
        event?.venue?.address,
        event?.venue?.city,
        event?.venue?.district,
        event?.venue?.province,
    ].filter(Boolean).join(' | ');

    return normalizeSearchValue(searchableText).includes(normalizedKeyword);
}

// ============================================================================
// 4. HIỆU ỨNG TẢI TRANG XƯƠNG (SKELETON LOADING EFFECTS)
// ============================================================================
function showSkeletons() {
    const skeletonCard = `
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full w-[280px] flex-shrink-0 animate-pulse">
            <div class="w-full aspect-[4/3] bg-slate-200"></div>
            <div class="p-5 flex-1 flex flex-col gap-3">
                <div class="h-5 bg-slate-200 rounded w-5/6"></div>
                <div class="h-4 bg-slate-200 rounded w-1/2"></div>
                <div class="h-4 bg-slate-200 rounded w-2/3"></div>
                <div class="h-8 bg-slate-200 rounded mt-4"></div>
            </div>
        </div>
    `;

    const gridSkeleton = `
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full w-full animate-pulse">
            <div class="w-full aspect-[4/3] bg-slate-200"></div>
            <div class="p-5 flex-1 flex flex-col gap-3">
                <div class="h-5 bg-slate-200 rounded w-5/6"></div>
                <div class="h-4 bg-slate-200 rounded w-1/2"></div>
                <div class="h-4 bg-slate-200 rounded w-2/3"></div>
                <div class="h-8 bg-slate-200 rounded mt-4"></div>
            </div>
        </div>
    `;

    const latestTrack = document.getElementById('latest-events-track');
    const featuredTrack = document.getElementById('featured-events-track');
    const grid = document.getElementById('all-events-grid');

    if (latestTrack) latestTrack.innerHTML = skeletonCard.repeat(4);
    if (featuredTrack) featuredTrack.innerHTML = skeletonCard.repeat(4);
    if (grid) grid.innerHTML = gridSkeleton.repeat(8);
}

/**
 * Hiển thị thông báo mất kết nối máy chủ đẹp mắt nếu gọi API thất bại.
 */
function showErrorStates() {
    const latestTrack = document.getElementById('latest-events-track');
    const featuredTrack = document.getElementById('featured-events-track');
    const grid = document.getElementById('all-events-grid');

    const errorHtml = `
        <div class="w-full col-span-full flex flex-col items-center justify-center py-16 bg-red-50 rounded-2xl border border-red-100 text-center p-6 mx-auto">
            <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-3"></i>
            <p class="text-red-700 font-extrabold text-base">Không thể kết nối đến máy chủ Backend</p>
            <p class="text-red-500 text-xs mt-1">Vui lòng khởi chạy server Spring Boot hoặc kiểm tra kết nối mạng của bạn.</p>
        </div>
    `;

    if (latestTrack) latestTrack.innerHTML = errorHtml;
    if (featuredTrack) featuredTrack.innerHTML = errorHtml;
    if (grid) grid.innerHTML = errorHtml;
}

// ============================================================================
// 5. CẬP NHẬT GIÁ VÉ BẤT ĐỒNG BỘ NỀN (BACKGROUND TICKET PRICE LOADER)
// ============================================================================

/**
 * Gọi API Backend bất đồng bộ để tìm hạng vé có giá trị thấp nhất và hiển thị lên Card.
 * Giúp tối ưu hóa tốc độ tải trang chủ lúc ban đầu, tránh nghẽn luồng xử lý chính.
 */
async function updateCardPrice(eventId, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    try {
        const ticketTypes = await window.apiClient.get(`/api/vtd/public/ticket-types/${eventId}`);
        if (ticketTypes && ticketTypes.length > 0) {
            const prices = ticketTypes.map(t => t.price).filter(p => p !== undefined && p !== null);
            if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                el.innerText = minPrice > 0 ? new Intl.NumberFormat('vi-VN').format(minPrice) + 'đ' : 'Miễn phí';
                return;
            }
        }
        el.innerText = 'Liên hệ';
    } catch (e) {
        el.innerText = 'Liên hệ';
    }
}

// ============================================================================
// 6. DỰNG THẺ SỰ KIỆN HTML (EVENT CARD CREATOR)
// ============================================================================
function createEventCardHtml(event, isGrid = false) {
    const title = event.title || event.name || 'Sự kiện';
    const venue = event.venue ? event.venue.venueName : (event.location || 'Địa điểm tổ chức');
    const id = event.eventId || event.id;
    const img = getEventImageUrl(event);

    // Trích xuất thành phố của sự kiện để hiển thị nhãn đẹp
    let city = event?.venue?.city || extractCityFromAddress(event?.venue?.address || event?.location) || 'Địa điểm';
    if (city) {
        city = city.toUpperCase();
    }

    const date = event.startTime ? new Date(event.startTime).toLocaleDateString('vi-VN') : 'Sắp diễn ra';
    const category = event.categoryName || 'Sự kiện';
    const detailUrl = getDetailPath(id);

    const widthClass = isGrid ? 'w-full' : 'w-[280px] flex-shrink-0';
    const priceElementId = `card-price-${id}-${isGrid ? 'grid' : 'track'}-${Math.random().toString(36).substr(2, 5)}`;

    // Thiết lập bộ hẹn giờ tải giá vé bất đồng bộ chạy ngầm sau 10ms
    setTimeout(() => {
        updateCardPrice(id, priceElementId);
    }, 10);

    return `
        <a href="${detailUrl}" class="group block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-in-out cursor-pointer flex flex-col h-full ${widthClass}">
            <div class="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 flex-shrink-0">
                <span class="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-brand-purple text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm z-10">${city}</span>
                ${renderEventImage(img, title, 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out')}
                <div class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider z-10">${category}</div>
            </div>
            <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <h3 class="font-extrabold text-slate-800 group-hover:text-brand-purple transition-colors text-base line-clamp-2 leading-snug tracking-tight mb-3" title="${title}">${title}</h3>
                    <div class="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
                        <i class="fas fa-map-marker-alt text-brand-orange/80"></i>
                        <span class="line-clamp-1">${venue}</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs font-bold text-slate-600 mb-4">
                        <i class="far fa-calendar-alt text-brand-purple/80"></i>
                        <span>${date}</span>
                    </div>
                </div>
                <div class="border-t border-slate-100 pt-4 mt-auto flex items-center justify-between">
                    <div>
                        <p class="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Giá vé từ</p>
                        <span id="${priceElementId}" class="text-brand-orange font-black text-lg">Đang tải...</span>
                    </div>
                    <span class="w-10 h-10 rounded-full bg-orange-50 text-brand-orange flex items-center justify-center group-hover:bg-brand-orange group-hover:text-white transition-all duration-300">
                        <i class="fas fa-arrow-right text-sm"></i>
                    </span>
                </div>
            </div>
        </a>
    `;
}

// ============================================================================
// 7. VẬN HÀNH HERO SLIDER BANNER LỚN ĐẦU TRANG
// ============================================================================
let heroIndex = 0;
let heroInterval;

/**
 * Thiết lập dữ liệu và vẽ cấu trúc slide banner.
 * Đồng thời đồng bộ các phần tử tĩnh được viết sẵn trong index.html.
 */
function renderHeroSlider(events) {
    const track = document.getElementById('hero-slider-track');
    const dotsContainer = document.getElementById('hero-dots-container');
    if (!track) return;

    track.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';

    if (events.length === 0) {
        track.innerHTML = `
            <div class="w-full h-full flex-shrink-0 relative bg-slate-900 flex items-center justify-center">
                <div class="text-white text-center">
                    <h2 class="text-3xl font-bold mb-2">BDHT Event Ticketing</h2>
                    <p class="text-gray-400">Kênh bán vé sự kiện hiện đại, nhanh chóng và uy tín hàng đầu</p>
                </div>
            </div>
        `;
        return;
    }

    events.forEach((event, index) => {
        const title = event.title || 'Sự kiện âm nhạc';
        const description = event.description || 'Hòa mình vào thế giới sự kiện đầy lôi cuốn cùng hệ thống bán vé chuyên nghiệp BDHT.';
        const id = event.eventId;
        const img = getEventImageUrl(event);
        const category = event.categoryName || 'HOT CONCERT';
        const detailUrl = getDetailPath(id);

        // Đồng bộ dữ liệu thật cho các banner viết tĩnh trong index.html
        const titleEl = document.getElementById(`hero-slide-${index}-title`);
        const subtitleEl = document.getElementById(`hero-slide-${index}-subtitle`);
        const ctaEl = document.getElementById(`hero-slide-${index}-cta`);
        const bannerImgEl = document.getElementById(`banner-img-${index}`);

        if (titleEl) titleEl.innerText = title;
        if (subtitleEl) subtitleEl.innerText = category;
        if (ctaEl) ctaEl.href = detailUrl;
        if (bannerImgEl) {
            if (img) {
                bannerImgEl.src = img;
                bannerImgEl.style.display = '';
            } else {
                bannerImgEl.removeAttribute('src');
                bannerImgEl.style.display = 'none';
            }
        }

        const slide = document.createElement('div');
        slide.className = 'w-full h-full flex-shrink-0 relative';
        slide.innerHTML = `
            <div class="w-full h-full bg-slate-900">
                ${renderEventImage(img, title, 'w-full h-full object-cover opacity-90')}
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent flex items-end p-8 md:p-20">
                <div class="max-w-7xl mx-auto w-full text-white">
                    <span class="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-[11px] px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block shadow-lg">${category}</span>
                    <h2 class="text-4xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight text-white drop-shadow-md">
                        ${title}
                    </h2>
                    <p class="text-sm md:text-base font-medium opacity-90 mb-8 max-w-2xl leading-relaxed text-gray-200 line-clamp-2">
                        ${description}
                    </p>
                    <a href="${detailUrl}" class="bg-gradient-to-r from-orange-500 to-rose-500 hover:scale-105 active:scale-95 text-white font-bold px-8 py-4 rounded-full transition-all duration-300 text-sm uppercase tracking-wider inline-block shadow-[0_8px_30px_rgb(242,111,33,0.3)]">
                        Mua Vé Ngay <i class="fas fa-arrow-right ml-2"></i>
                    </a>
                </div>
            </div>
        `;
        track.appendChild(slide);

        // Tạo các nút tròn chấm điều hướng (Dots)
        if (dotsContainer) {
            const dot = document.createElement('span');
            dot.className = `w-3 h-3 rounded-full bg-white/50 hover:bg-white cursor-pointer transition-all duration-300 hero-dot shadow-sm`;
            dot.addEventListener('click', () => setHeroSlide(index));
            dotsContainer.appendChild(dot);
        }
    });

    heroIndex = 0;
    showHeroSlide(0);
}

/**
 * Hiển thị Slide Banner tương ứng với chỉ số được truyền vào.
 */
function showHeroSlide(idx) {
    const track = document.getElementById('hero-slider-track');
    const dots = document.querySelectorAll('.hero-dot');
    if (!track) return;

    const slidesCount = track.children.length;
    if (slidesCount === 0) return;

    if (idx >= slidesCount) heroIndex = 0;
    if (idx < 0) heroIndex = slidesCount - 1;

    track.style.transform = `translateX(-${heroIndex * 100}%)`;

    dots.forEach((dot, index) => {
        if (index === heroIndex) {
            dot.className = 'w-6 h-3 rounded-full bg-orange-500 cursor-pointer transition-all duration-300 hero-dot active shadow-sm';
        } else {
            dot.className = 'w-3 h-3 rounded-full bg-white/50 hover:bg-white cursor-pointer transition-all duration-300 hero-dot shadow-sm';
        }
    });
}

/**
 * Chuyển slide banner tiến lên hoặc lùi lại và reset thời gian chờ tự động cuộn.
 */
window.moveHeroSlide = function (n) {
    clearInterval(heroInterval);
    heroIndex += n;
    showHeroSlide(heroIndex);
    startHeroInterval();
};

/**
 * Nhảy thẳng tới slide banner được click và reset thời gian chờ tự động cuộn.
 */
window.setHeroSlide = function (idx) {
    clearInterval(heroInterval);
    heroIndex = idx;
    showHeroSlide(heroIndex);
    startHeroInterval();
};

/**
 * Đặt đếm giờ tự cuộn Banner sau 4 giây.
 */
function startHeroInterval() {
    const track = document.getElementById('hero-slider-track');
    if (!track || track.children.length <= 1) return;

    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        heroIndex++;
        showHeroSlide(heroIndex);
    }, 4000);
}

// ============================================================================
// 8. TỰ CUỘN SỰ KIỆN MƯỢT MÀ VÀ HỖ TRỢ KÉO THẢ (MARQUEE SCROLL & DRAG TO SCROLL)
// ============================================================================

/**
 * Vận hành dải sự kiện cuộn tự động trơn tru bằng RequestAnimationFrame.
 * Hỗ trợ kéo chuột để cuộn, chạm lướt trên điện thoại, lăn trackpad mượt mà.
 */
function setupMarqueeScroll(trackId, speed = 1.2) {
    const track = document.getElementById(trackId);
    if (!track) return;

    let isHovered = false;            // Trạng thái rê chuột vào dải sự kiện
    let isDragging = false;           // Trạng thái giữ chuột để kéo cuộn
    let startX = 0;                   // Tọa độ X ban đầu khi click chuột xuống
    let scrollLeftStart = 0;          // Vị trí cuộn ngang bắt đầu
    let isAutoScrollPaused = false;   // Trạng thái tạm ngưng cuộn tự động khi người dùng tương tác
    let autoScrollTimer = null;       // Bộ đếm thời gian khôi phục cuộn tự động
    let lastScrollLeft = track.scrollLeft; // Lưu vết vị trí cuộn cũ để phát hiện hành vi cuộn bằng tay

    // Tạm dừng cuộn tự động trong một vài giây
    function pauseAutoScroll(seconds) {
        isAutoScrollPaused = true;
        if (autoScrollTimer) {
            clearTimeout(autoScrollTimer);
        }
        autoScrollTimer = setTimeout(() => {
            isAutoScrollPaused = false;
        }, seconds * 1000);
    }

    // Tối ưu hóa CSS để hoạt ảnh chạy trơn tru
    function initializeScrollStyles() {
        track.classList.remove('scroll-smooth', 'snap-x');
        track.style.scrollBehavior = 'auto';
        track.style.scrollSnapType = 'none';
        track.style.cursor = 'grab'; // Biểu tượng con trỏ bàn tay kéo thả
    }

    // Vòng lặp vẽ hoạt ảnh tốc độ cao đồng bộ với tần số quét của màn hình
    function runAutoScrollAnimation() {
        if (!isHovered && !isDragging && !isAutoScrollPaused) {
            track.scrollLeft += speed;
            const maxScrollPosition = track.scrollWidth - track.clientWidth;

            // Nếu đã cuộn đến sát mép bên phải, lập tức quay lại vị trí 0
            if (track.scrollLeft >= maxScrollPosition - 1) {
                track.scrollLeft = 0;
            }
            lastScrollLeft = track.scrollLeft;
        } else {
            lastScrollLeft = track.scrollLeft;
        }
        requestAnimationFrame(runAutoScrollAnimation);
    }

    // Lắng nghe hành vi tự cuộn bằng tay để tạm ngưng tự động cuộn 3 giây
    track.addEventListener('scroll', () => {
        if (Math.abs(track.scrollLeft - lastScrollLeft) > 2.5) {
            pauseAutoScroll(3);
            lastScrollLeft = track.scrollLeft;
        }
    });

    // Dừng cuộn khi rê chuột vào để người dùng dễ đọc chữ
    track.addEventListener('mouseenter', () => {
        isHovered = true;
    });
    track.addEventListener('mouseleave', () => {
        isHovered = false;
    });

    // Bắt đầu thao tác kéo lướt chuột
    track.addEventListener('mousedown', (e) => {
        isDragging = true;
        track.style.cursor = 'grabbing';
        startX = e.pageX - track.offsetLeft;
        scrollLeftStart = track.scrollLeft;
        pauseAutoScroll(5); // Tạm dừng 5 giây khi bắt đầu kéo
    });

    track.addEventListener('mouseup', () => {
        isDragging = false;
        track.style.cursor = 'grab';
    });

    track.addEventListener('mouseleave', () => {
        isDragging = false;
        track.style.cursor = 'grab';
    });

    // Tính toán cự ly dịch chuyển và cập nhật thanh cuộn khi di chuột kéo thả
    track.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault(); // Tránh bôi đen hình ảnh khi kéo
        const currentX = e.pageX - track.offsetLeft;
        const walk = (currentX - startX) * 1.5; // Nhân tốc độ kéo
        track.scrollLeft = scrollLeftStart - walk;
        lastScrollLeft = track.scrollLeft;
        pauseAutoScroll(5);
    });

    initializeScrollStyles();
    requestAnimationFrame(runAutoScrollAnimation);
}

/**
 * Cuộn ngang dải sự kiện mượt mà sang trái / phải khi nhấn các nút bấm mũi tên.
 */
window.scrollHorizontally = function (trackId, amount) {
    const track = document.getElementById(trackId);
    if (!track) return;

    track.style.scrollBehavior = 'smooth'; // Bật tạm hiệu ứng cuộn mượt mặc định

    let targetScroll = track.scrollLeft + amount;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (targetScroll < 0) targetScroll = 0;
    if (targetScroll > maxScroll) targetScroll = maxScroll;

    track.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
    });
};

/**
 * Trả về đường dẫn xem chi tiết sự kiện an toàn cho cả môi trường chạy local và host.
 */
function getDetailPath(id) {
    if (window.pageUtils && window.pageUtils.resolveUrl) {
        return window.pageUtils.resolveUrl(`pages/user/nat-event-detail.html?id=${id}`);
    }
    return window.location.pathname.includes('/pages/') ? `user/nat-event-detail.html?id=${id}` : `pages/user/nat-event-detail.html?id=${id}`;
}

// ============================================================================
// 9. THIẾT LẬP CÁC LẮNG NGHE LỌC SỰ KIỆN Ở LƯỚI PHÂN TRANG (GRID FILTER LISTENERS)
// ============================================================================
function setupAllEventsSection() {
    const btnFilter = document.getElementById('btn-event-filter');
    const keywordInput = document.getElementById('header-search-keyword') || document.querySelector('#header-container input');
    const categoryFilterSelect = document.getElementById('event-category-filter');
    const timeFilterSelect = document.getElementById('event-time-filter');
    const locationFilterSelect = document.getElementById('header-location-filter');

    // Đồng bộ hóa các tham số lọc nếu có sẵn trên thanh địa chỉ URL
    const queryParams = new URLSearchParams(window.location.search);
    const queryCategory = queryParams.get('category');
    const queryLocation = queryParams.get('location');

    if (queryCategory && categoryFilterSelect) {
        categoryFilterSelect.value = queryCategory;
    }

    if (queryLocation && locationFilterSelect) {
        locationFilterSelect.value = queryLocation;
    }

    if (btnFilter) {
        btnFilter.addEventListener('click', () => {
            currentPage = 1;
            renderAllEventsGrid();
        });
    }

    // Lắng nghe nhập từ khóa ở ô tìm kiếm trên Header
    if (keywordInput) {
        keywordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentPage = 1;
                const section = document.getElementById('all-events-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                renderAllEventsGrid();
            }
        });
        keywordInput.addEventListener('input', () => {
            currentPage = 1;
            renderAllEventsGrid();
        });
    }

    if (categoryFilterSelect) {
        categoryFilterSelect.addEventListener('change', () => {
            currentPage = 1;
            renderAllEventsGrid();
            syncUrlParams();
        });
    }

    if (timeFilterSelect) {
        timeFilterSelect.addEventListener('change', () => {
            currentPage = 1;
            renderAllEventsGrid();
            syncUrlParams();
        });
    }

    if (locationFilterSelect) {
        locationFilterSelect.addEventListener('change', () => {
            currentPage = 1;
            renderAllEventsGrid();
            syncUrlParams();
        });
    }
}

// ============================================================================
// 10. LỌC VÀ HIỂN THỊ LƯỚI PHÂN TRANG SỰ KIỆN (GRID RENDERER WITH FILTERS)
// ============================================================================
async function renderAllEventsGrid() {
    const grid = document.getElementById('all-events-grid');
    const badgeCount = document.getElementById('all-events-badge-count');

    if (!grid) return;

    const keywordInput = document.getElementById('header-search-keyword') || document.querySelector('#header-container input');
    const categorySelect = document.getElementById('event-category-filter');
    const timeSelect = document.getElementById('event-time-filter');
    const locationSelect = document.getElementById('header-location-filter');

    const keyword = keywordInput?.value?.trim() || '';
    const category = categorySelect?.value || '';
    const timeFilter = timeSelect?.value || '';
    const location = locationSelect?.value || '';

    try {
        grid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fas fa-spinner fa-spin text-brand-orange text-3xl"></i></div>';

        // Lấy luồng gọi dữ liệu phù hợp (Ưu tiên đọc mảng bộ nhớ đệm client để tăng tốc phản hồi)
        let fetchPromise;
        if (category) {
            fetchPromise = window.apiClient.get(`/api/vtd/public/events/category/${encodeURIComponent(category)}`);
        } else if (keyword) {
            fetchPromise = ALL_EVENTS_DATA.length > 0
                ? Promise.resolve(ALL_EVENTS_DATA)
                : window.apiClient.get(`/api/vtd/public/events?page=0&size=100`);
        } else if (timeFilter) {
            fetchPromise = window.apiClient.get(`/api/vtd/public/events/time-filter?filter=${encodeURIComponent(timeFilter)}`);
        } else {
            fetchPromise = ALL_EVENTS_DATA.length > 0
                ? Promise.resolve(ALL_EVENTS_DATA)
                : window.apiClient.get(`/api/vtd/public/events?page=0&size=100`);
        }

        const res = await fetchPromise;
        let fetchedEvents = [];
        if (Array.isArray(res)) {
            fetchedEvents = res;
        } else if (res && res.content) {
            fetchedEvents = res.content;
        }

        // Thực hiện lọc mảng đa tiêu chuẩn
        const now = new Date();
        filteredEvents = fetchedEvents.filter(event => {
            if (category && event.categoryName !== category) return false;
            if (keyword && !matchesLocationKeyword(event, keyword)) return false;
            if (location) {
                // Hỗ trợ cả cơ chế trích xuất fallback từ tên địa điểm event.location
                const city = (event?.venue?.city || extractCityFromAddress(event?.venue?.address || event?.location) || '').toLowerCase();
                if (!city.includes(location.toLowerCase())) return false;
            }

            if (timeFilter) {
                const tf = timeFilter;
                const eventDate = new Date(event.startTime);
                if (tf === 'upcoming' && eventDate <= now) return false;
                if (tf === 'this-week') {
                    const oneWeekLater = new Date();
                    oneWeekLater.setDate(now.getDate() + 7);
                    if (eventDate < now || eventDate > oneWeekLater) return false;
                }
                if (tf === 'this-month') {
                    if (eventDate.getMonth() !== now.getMonth() || eventDate.getFullYear() !== now.getFullYear()) return false;
                }
            }
            return true;
        });

        // Cập nhật thẻ đếm số lượng kết quả tìm thấy
        if (badgeCount) {
            badgeCount.innerText = `${filteredEvents.length} sự kiện`;
        }

        // Hiển thị trạng thái rỗng nếu bộ lọc không tìm ra kết quả nào
        if (filteredEvents.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 p-6 text-center shadow-sm w-full">
                    <i class="far fa-calendar-times text-5xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 font-extrabold text-lg">Không tìm thấy sự kiện nào</p>
                    <p class="text-gray-400 text-sm mt-1">Vui lòng thay đổi bộ lọc hoặc từ khóa tìm kiếm và thử lại nhé.</p>
                </div>
            `;
            const paginationContainer = document.getElementById('all-events-pagination');
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        // Cắt mảng lấy đúng số phần tử hiển thị của trang hiện hành (Phân trang)
        const startIndex = (currentPage - 1) * itemsPerPage;
        const slicedList = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

        // Vẽ danh sách sự kiện lên màn hình
        grid.innerHTML = slicedList.map(event => createEventCardHtml(event, true)).join('');

        // Cập nhật lại giao diện các nút số trang điều khiển phân trang
        renderPaginationControls(filteredEvents.length);
    } catch (error) {
        console.error("Gặp lỗi trong quá trình lọc hiển thị lưới sự kiện:", error);
        grid.innerHTML = '<div class="col-span-full text-center text-red-500 py-10">Đã xảy ra sự cố khi tải dữ liệu từ máy chủ.</div>';
    }
}

/**
 * Đồng bộ hóa các tiêu chí lọc lên thanh địa chỉ URL để lưu vết tìm kiếm khi người dùng chuyển trang.
 */
function syncUrlParams() {
    const category = document.getElementById('event-category-filter')?.value || '';
    const location = document.getElementById('header-location-filter')?.value || '';
    const params = new URLSearchParams(window.location.search);

    if (category) {
        params.set('category', category);
    } else {
        params.delete('category');
    }

    if (location) {
        params.set('location', location);
    } else {
        params.delete('location');
    }

    const search = params.toString();
    history.replaceState(null, '', search ? `${window.location.pathname}?${search}` : window.location.pathname);
}

/**
 * Vẽ thanh nút phân trang động ở chân lưới sự kiện.
 */
function renderPaginationControls(totalCount) {
    const container = document.getElementById('all-events-pagination');
    if (!container) return;

    container.innerHTML = '';
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    if (totalPages <= 1) return; // Chỉ có 1 trang thì ẩn phân trang

    // 1. Tạo nút quay lại trang trước
    const prevBtn = document.createElement('button');
    if (currentPage === 1) {
        prevBtn.className = 'border border-gray-100 text-gray-300 bg-gray-50 px-4 py-2.5 rounded-xl font-bold text-sm pointer-events-none flex items-center gap-1';
        prevBtn.disabled = true;
    } else {
        prevBtn.className = 'border border-gray-200 text-slate-700 hover:bg-orange-50 hover:text-brand-orange hover:border-brand-orange px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer flex items-center gap-1';
        prevBtn.addEventListener('click', () => {
            goToPage(currentPage - 1);
        });
    }
    prevBtn.innerHTML = `<i class="fas fa-chevron-left text-xs"></i> Trang trước`;
    container.appendChild(prevBtn);

    // 2. Tạo danh sách các số trang chi tiết
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        if (i === currentPage) {
            pageBtn.className = 'bg-brand-orange text-white shadow-md shadow-orange-500/20 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300';
        } else {
            pageBtn.className = 'border border-gray-200 text-slate-700 hover:bg-orange-50 hover:text-brand-orange hover:border-brand-orange px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer';
            pageBtn.addEventListener('click', () => {
                goToPage(i);
            });
        }
        pageBtn.innerText = i;
        container.appendChild(pageBtn);
    }

    // 3. Tạo nút chuyển tới trang sau
    const nextBtn = document.createElement('button');
    if (currentPage === totalPages) {
        nextBtn.className = 'border border-gray-100 text-gray-300 bg-gray-50 px-4 py-2.5 rounded-xl font-bold text-sm pointer-events-none flex items-center gap-1';
        nextBtn.disabled = true;
    } else {
        nextBtn.className = 'border border-gray-200 text-slate-700 hover:bg-orange-50 hover:text-brand-orange hover:border-brand-orange px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer flex items-center gap-1';
        nextBtn.addEventListener('click', () => {
            goToPage(currentPage + 1);
        });
    }
    nextBtn.innerHTML = `Trang sau <i class="fas fa-chevron-right text-xs"></i>`;
    container.appendChild(nextBtn);
}

/**
 * Xử lý chuyển hướng đến trang số chỉ định và cuộn màn hình lên đầu danh mục.
 */
function goToPage(page) {
    currentPage = page;
    renderAllEventsGrid();

    const section = document.getElementById('all-events-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Cuộn giao diện màn hình xuống lưới sự kiện toàn cục khi người dùng nhấn nút danh mục từ Header.
 */
window.scrollToAllEvents = function (type) {
    const section = document.getElementById('all-events-section');
    if (!section) return;

    const categorySelect = document.getElementById('event-category-filter');
    const searchInput = document.getElementById('header-search-keyword') || document.querySelector('#header-container input');
    const timeFilter = document.getElementById('event-time-filter');
    const locationFilter = document.getElementById('header-location-filter');

    if (type === 'newest' || type === 'featured') {
        if (categorySelect) categorySelect.value = '';
        if (searchInput) searchInput.value = '';
        if (timeFilter) timeFilter.value = '';
        if (locationFilter) locationFilter.value = '';
        syncUrlParams();
    }

    currentPage = 1;
    renderAllEventsGrid();
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
