// --- KHỞI CHẠY KHI TRANG LOAD ---
document.addEventListener('DOMContentLoaded', async function() {
    await initializeHomePage();
});

async function initializeHomePage() {
    if (window.pageUtils && window.pageUtils.loadHeader) {
        await window.pageUtils.loadHeader();
    }
    await loadHomePage();
    setupHomeSearch();
    setupDateFilter();
    initHeroSlider();
    if (window.pageUtils && window.pageUtils.loadFooter) {
        await window.pageUtils.loadFooter();
    }
    await applyCategoryFromQuery();
}

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

async function applyCategoryFromQuery() {
    const category = getQueryParam('category');
    if (!category) return;

    const chips = Array.from(document.querySelectorAll('.category-chip'));
    const selectedChip = chips.find(chip => chip.innerText.trim().toLowerCase() === category.trim().toLowerCase());

    if (selectedChip) {
        selectedChip.click();
    } else {
        await loadEventsByCategory(category);
    }
}

// ==========================================
// 1. CÁC HÀM XỬ LÝ TRANG CHỦ
// ==========================================
async function loadHomePage() {
    const giantContainer = document.getElementById('featured-giant-container');
    const gridContainer = document.getElementById('featured-grid-container');
    const categoryFilters = document.getElementById('category-filters');
    const musicContainer = document.getElementById('music-event-list');
    const cultureContainer = document.getElementById('culture-event-list');
    const tourismContainer = document.getElementById('tourism-event-list');

    // Dữ liệu mock phòng vệ đỉnh cao trong trường hợp DB trống
    const mockEvents = [
        {
            eventId: 1,
            name: "Liveshow HÀ NHI - Người yêu cũ là Tri kỷ",
            location: "Ecopark Hưng Yên",
            cityName: "Hà Nội",
            bannerImageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=600",
            minPrice: 3100000,
            date: "2026-07-25T19:30:00",
            category: "Vé ca nhạc"
        },
        {
            eventId: 2,
            name: "À Ố Show - Vở diễn Xiếc tre đặc sắc",
            location: "Nhà Hát Lớn TP. Hồ Chí Minh",
            cityName: "TP. HCM",
            bannerImageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=600",
            minPrice: 700000,
            date: "2026-07-15T20:00:00",
            category: "Văn hóa nghệ thuật"
        },
        {
            eventId: 3,
            name: "Tinh Hoa Bắc Bộ - The Quintessence of Tonkin",
            location: "Chùa Thầy, Quốc Oai, Hà Nội",
            cityName: "Hà Nội",
            bannerImageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600",
            minPrice: 450000,
            date: "2026-07-22T19:00:00",
            category: "Văn hóa nghệ thuật"
        },
        {
            eventId: 4,
            name: "Dragon Ocean Concert - Dòng Chảy | Phương Linh",
            location: "Khu du lịch Đồi Rồng, Hải Phòng",
            cityName: "Hà Nội",
            bannerImageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600",
            minPrice: 800000,
            date: "2026-09-05T20:00:00",
            category: "Vé ca nhạc"
        },
        {
            eventId: 5,
            name: "Tour Trekking & Cắm trại Hồ Ba Bể kì vĩ",
            location: "Hồ Ba Bể, Bắc Kạn",
            cityName: "Hà Nội",
            bannerImageUrl: "https://images.unsplash.com/photo-1470229722913-7c092fb6224d?q=80&w=600",
            minPrice: 2389500,
            date: "2026-08-12T07:00:00",
            category: "Vé tham quan - du lịch"
        },
        {
            eventId: 6,
            name: "Show Diễn Ký Ức Hội An đỉnh cao nghệ thuật",
            location: "Công viên Ấn tượng Hội An, Quảng Nam",
            cityName: "Đà Nẵng",
            bannerImageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=600",
            minPrice: 600000,
            date: "2026-08-20T20:00:00",
            category: "Văn hóa nghệ thuật"
        },
        {
            eventId: 7,
            name: "Private Quốc Thiên In Fantasy show hoành tráng",
            location: "Nhà Hát Lớn Hà Nội",
            cityName: "Hà Nội",
            bannerImageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=600",
            minPrice: 1200000,
            date: "2026-08-16T19:30:00",
            category: "Vé ca nhạc"
        },
        {
            eventId: 8,
            name: "Workshop Nấu Ăn Ẩm Thực Ấn Độ Benaras",
            location: "Quận 1, TP. Hồ Chí Minh",
            cityName: "TP. HCM",
            bannerImageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600",
            minPrice: 500000,
            date: "2026-08-18T14:00:00",
            category: "Workshop"
        }
    ];

    try {
        let homeData = { categories: [], featuredEvents: [], latestEvents: [] };
        if (window.apiClient) {
            try {
                homeData = await window.apiClient.get('/api/nat/public/home');
            } catch(apiErr) {
                console.warn("Lỗi API public/home, chuyển sang mock data:", apiErr);
            }
        }

        // Đổ categories filter chips
        const categoriesList = homeData.categories && homeData.categories.length > 0 ? homeData.categories : ["Vé ca nhạc", "Văn hóa nghệ thuật", "Vé tham quan - du lịch", "Workshop", "Vé xem phim", "Thể thao"];
        if (categoryFilters) renderCategoryFilters(categoriesList, categoryFilters);

        // Đổ sự kiện nổi bật
        let featuredList = homeData.featuredEvents || [];
        if (featuredList.length === 0) {
            featuredList = mockEvents.slice(0, 5);
        }

        // Render sự kiện nổi bật dạng grid: 1 card to trái, 4 card nhỏ bên phải
        if (giantContainer && gridContainer) {
            renderFeaturedGrid(featuredList, giantContainer, gridContainer);
        }

        // Phân loại các sự kiện cho danh mục
        const allEvents = [...featuredList, ...(homeData.latestEvents || mockEvents)];
        
        // 1. Ca nhạc
        const musicEvents = allEvents.filter(e => e.category === "Vé ca nhạc" || (e.category && e.category.toLowerCase().includes("nhạc"))).slice(0, 4);
        if (musicContainer) renderCategoryList(musicEvents.length > 0 ? musicEvents : mockEvents.filter(e => e.category === "Vé ca nhạc").slice(0, 4), musicContainer);

        // 2. Văn hóa nghệ thuật
        const cultureEvents = allEvents.filter(e => e.category === "Văn hóa nghệ thuật" || (e.category && e.category.toLowerCase().includes("văn hóa"))).slice(0, 4);
        if (cultureContainer) renderCategoryList(cultureEvents.length > 0 ? cultureEvents : mockEvents.filter(e => e.category === "Văn hóa nghệ thuật").slice(0, 4), cultureContainer);

        // 3. Tham quan
        const tourismEvents = allEvents.filter(e => e.category === "Vé tham quan - du lịch" || (e.category && e.category.toLowerCase().includes("tham quan"))).slice(0, 4);
        if (tourismContainer) renderCategoryList(tourismEvents.length > 0 ? tourismEvents : mockEvents.filter(e => e.category === "Vé tham quan - du lịch").slice(0, 4), tourismContainer);

        // Dựng Slider trượt ngang mini danh mục
        renderMiniSlider(allEvents);

    } catch (error) {
        console.error('Lỗi khởi tạo homepage:', error);
        // Fallback tối đa
        if (giantContainer && gridContainer) renderFeaturedGrid(mockEvents.slice(0, 5), giantContainer, gridContainer);
        if (musicContainer) renderCategoryList(mockEvents.filter(e => e.category === "Vé ca nhạc").slice(0, 4), musicContainer);
        if (cultureContainer) renderCategoryList(mockEvents.filter(e => e.category === "Văn hóa nghệ thuật").slice(0, 4), cultureContainer);
        if (tourismContainer) renderCategoryList(mockEvents.filter(e => e.category === "Vé tham quan - du lịch").slice(0, 4), tourismContainer);
        renderMiniSlider(mockEvents);
    }
}

// ==========================================
// 6. LỌC SỰ KIỆN THEO NGÀY
// ==========================================
function setupDateFilter() {
    const btnFilterDate = document.getElementById('btn-filter-date');
    if (!btnFilterDate) return;

    btnFilterDate.addEventListener('click', async () => {
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;

        if (!startDate || !endDate) {
            alert('Vui lòng chọn đầy đủ Từ ngày và Đến ngày!');
            return;
        }

        const originalText = btnFilterDate.innerHTML;
        
        // Loading state
        btnFilterDate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lọc...';
        btnFilterDate.classList.add('pointer-events-none', 'opacity-50');

        try {
            const response = await window.apiClient.get(`/api/nat/public/events/date-range?startDate=${startDate}&endDate=${endDate}`);
            
            const giantContainer = document.getElementById('featured-giant-container');
            const gridContainer = document.getElementById('featured-grid-container');
            
            if (giantContainer && gridContainer) {
                giantContainer.innerHTML = '';
                gridContainer.innerHTML = '';
                
                if (response && response.length > 0) {
                    renderFeaturedGrid(response, giantContainer, gridContainer);
                } else {
                    gridContainer.innerHTML = '<p class="text-gray-500 font-bold p-6 w-full text-center">Không tìm thấy sự kiện nào trong khoảng thời gian này.</p>';
                }
                
                // Scroll down to results
                giantContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (err) {
            console.error("Date Filter Error:", err);
            alert('Có lỗi xảy ra khi lọc sự kiện.');
        } finally {
            btnFilterDate.innerHTML = originalText;
            btnFilterDate.classList.remove('pointer-events-none', 'opacity-50');
        }
    });
}

function setupHomeSearch() {
    const searchKeyword = document.getElementById('event-search-keyword');
    const searchButton = document.getElementById('btn-search-events');

    if (!searchKeyword || !searchButton) return;

    searchButton.addEventListener('click', async () => {
        const keyword = searchKeyword.value.trim();
        if (!keyword) {
            await loadHomePage();
            return;
        }
        await searchEvents(keyword);
    });

    searchKeyword.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchButton.click();
        }
    });
}

function renderCategoryFilters(categories, container) {
    if (!container) return;
    container.innerHTML = '';

    const allChip = document.createElement('div');
    allChip.className = 'px-4 py-2 border border-gray-200 rounded-full text-xs font-bold bg-white text-slate-700 cursor-pointer hover:border-brand-purple hover:text-brand-purple transition duration-200 category-chip active';
    allChip.innerText = 'Tất cả';
    allChip.setAttribute('data-i18n', 'body.filter_all');
    allChip.addEventListener('click', async () => {
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.classList.remove('active', 'bg-brand-purple', 'text-white', 'border-brand-purple');
            chip.classList.add('bg-white', 'text-slate-700', 'border-gray-200');
        });
        allChip.classList.add('active', 'bg-brand-purple', 'text-white', 'border-brand-purple');
        allChip.classList.remove('bg-white', 'text-slate-700', 'border-gray-200');
        await loadHomePage();
    });
    container.appendChild(allChip);

    categories.forEach(category => {
        const chip = document.createElement('div');
        chip.className = 'px-4 py-2 border border-gray-200 rounded-full text-xs font-bold bg-white text-slate-700 cursor-pointer hover:border-brand-purple hover:text-brand-purple transition duration-200 category-chip';
        chip.innerText = category;

        // Map category names to localization keys dynamically
        let i18nKey = '';
        const normCat = category.toLowerCase().trim();
        if (normCat.includes('ca nhạc') || normCat.includes('concert')) i18nKey = 'nav.music';
        else if (normCat.includes('văn hóa') || normCat.includes('culture') || normCat.includes('nghệ thuật')) i18nKey = 'nav.culture';
        else if (normCat.includes('tham quan') || normCat.includes('du lịch') || normCat.includes('tourism') || normCat.includes('sightseeing')) i18nKey = 'nav.tourism';
        else if (normCat.includes('workshop')) i18nKey = 'nav.workshop';
        else if (normCat.includes('xem phim') || normCat.includes('movies') || normCat.includes('movie')) i18nKey = 'nav.movies';
        else if (normCat.includes('thể thao') || normCat.includes('sports')) i18nKey = 'nav.sports';
        else if (normCat.includes('tin tức') || normCat.includes('news')) i18nKey = 'nav.news';
        else if (normCat.includes('công nghệ') || normCat.includes('tech')) i18nKey = 'nav.tech';
        else if (normCat.includes('giáo dục') || normCat.includes('education')) i18nKey = 'nav.education';

        if (i18nKey) {
            chip.setAttribute('data-i18n', i18nKey);
        }

        chip.addEventListener('click', async () => {
            document.querySelectorAll('.category-chip').forEach(c => {
                c.classList.remove('active', 'bg-brand-purple', 'text-white', 'border-brand-purple');
                c.classList.add('bg-white', 'text-slate-700', 'border-gray-200');
            });
            chip.classList.add('active', 'bg-brand-purple', 'text-white', 'border-brand-purple');
            chip.classList.remove('bg-white', 'text-slate-700', 'border-gray-200');
            await loadEventsByCategory(category);
        });
        container.appendChild(chip);
    });

    if (window.i18n && typeof window.i18n.renderLanguage === 'function') {
        window.i18n.renderLanguage();
    }
}

async function searchEvents(keyword) {
    const gridContainer = document.getElementById('featured-grid-container');
    const giantContainer = document.getElementById('featured-giant-container');
    if (!gridContainer || !giantContainer) return;

    try {
        if (!window.apiClient) throw new Error('API Client không khả dụng');
        const events = await window.apiClient.get(`/api/nat/public/events/search?keyword=${encodeURIComponent(keyword)}`);
        
        giantContainer.innerHTML = '';
        if (events.length === 0) {
            gridContainer.innerHTML = `<div class="col-span-2 text-center text-xs font-bold text-slate-400 py-12">Không tìm thấy sự kiện phù hợp.</div>`;
        } else {
            renderSmallEventList(events, gridContainer);
        }
    } catch (error) {
        console.error('Error searching events:', error);
        gridContainer.innerHTML = `<div class="col-span-2 text-center text-xs font-bold text-red-500 py-12">Không tìm thấy sự kiện phù hợp (Lỗi: ${error.message}).</div>`;
    }
}

async function loadEventsByCategory(category) {
    const gridContainer = document.getElementById('featured-grid-container');
    const giantContainer = document.getElementById('featured-giant-container');
    if (!gridContainer || !giantContainer) return;

    try {
        if (!window.apiClient) throw new Error('API Client không khả dụng');
        const events = await window.apiClient.get(`/api/nat/public/events/category/${encodeURIComponent(category)}`);
        
        giantContainer.innerHTML = '';
        if (events.length === 0) {
            gridContainer.innerHTML = `<div class="col-span-2 text-center text-xs font-bold text-slate-400 py-12">Không có sự kiện thuộc danh mục này.</div>`;
        } else {
            renderSmallEventList(events, gridContainer);
        }
    } catch (error) {
        console.error('Error category events:', error);
        gridContainer.innerHTML = `<div class="col-span-2 text-center text-xs font-bold text-slate-400 py-12">Không có sự kiện thuộc danh mục này.</div>`;
    }
}

// Render Grid: 1 giant trái, 4 small phải
function renderFeaturedGrid(events, giantBox, gridBox) {
    if (!events || events.length === 0) return;

    // Giant card (Sự kiện đầu tiên)
    const giantEvent = events[0];
    const giantTitle = giantEvent.name || giantEvent.eventName || 'Sự kiện nổi bật';
    const giantVenue = giantEvent.location || 'Địa điểm lớn';
    const giantId = giantEvent.eventId || giantEvent.id;
    const giantImg = giantEvent.bannerImageUrl || giantEvent.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
    const giantCity = giantEvent.cityName || 'HÀ NỘI';
    const giantPrice = giantEvent.minPrice ? new Intl.NumberFormat('vi-VN').format(giantEvent.minPrice) + ' VNĐ' : '<span data-i18n="event.contact_price">Liên hệ</span>';
    let giantDate = 'Sắp diễn ra';
    if (giantEvent.date) {
        giantDate = new Date(giantEvent.date).toLocaleDateString('vi-VN');
    }

    const giantDetailUrl = getDetailPath(giantId);

    giantBox.innerHTML = `
        <a href="${giantDetailUrl}" class="group block bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all duration-300 ease-in-out h-full flex flex-col">
            <div class="relative w-full aspect-video sm:aspect-square overflow-hidden bg-slate-100 flex-shrink-0">
                <span class="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-md text-white font-extrabold text-[10px] px-3 py-1.5 rounded-full uppercase tracking-widest z-10">${giantCity}</span>
                <img src="${giantImg}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" alt="${giantTitle}">
                <div class="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md text-gray-900 font-extrabold text-xs px-4 py-2 rounded-full shadow-sm z-10"><span data-i18n="event.price_from">Giá từ</span> ${giantPrice}</div>
            </div>
            <div class="p-8 flex-1 flex flex-col justify-between">
                <div>
                    <h3 class="text-xl font-extrabold text-gray-900 group-hover:text-brand-purple transition-colors line-clamp-2 leading-snug tracking-tight">${giantTitle}</h3>
                    <p class="text-sm font-medium text-gray-500 mt-3 flex items-center gap-2"><i class="fas fa-map-marker-alt text-brand-orange"></i> ${giantVenue}</p>
                </div>
                <div class="border-t border-gray-100 pt-5 mt-5 flex items-center justify-between text-xs font-bold text-gray-500">
                    <span class="flex items-center gap-2"><i class="far fa-calendar-alt"></i> ${giantDate}</span>
                    <span class="text-brand-orange hover:text-orange-600 inline-flex items-center gap-1.5 transition-colors"><span data-i18n="event.buy_ticket">Mua vé</span> <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>
        </a>
    `;

    // 4 small cards
    const smallEvents = events.slice(1, 5);
    renderSmallEventList(smallEvents, gridBox);

    if (window.i18n && typeof window.i18n.renderLanguage === 'function') {
        window.i18n.renderLanguage();
    }
}

function renderSmallEventList(events, container) {
    if (!container) return;
    container.innerHTML = events.map(event => {
        const title = event.name || event.eventName || 'Sự kiện nổi bật';
        const venue = event.location || 'Địa điểm tổ chức';
        const id = event.eventId || event.id;
        const img = event.bannerImageUrl || event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500';
        const city = event.cityName || 'HÀ NỘI';
        const price = event.minPrice ? new Intl.NumberFormat('vi-VN').format(event.minPrice) + 'đ' : '<span data-i18n="event.contact_price">Liên hệ</span>';
        let date = 'Sắp diễn ra';
        if (event.date) {
            date = new Date(event.date).toLocaleDateString('vi-VN');
        }

        const detailUrl = getDetailPath(id);

        return `
            <a href="${detailUrl}" class="group block bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all duration-300 ease-in-out flex">
                <div class="relative w-2/5 aspect-[3/4] overflow-hidden bg-slate-100 flex-shrink-0">
                    <span class="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-md text-white font-extrabold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider z-10">${city}</span>
                    <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" alt="${title}">
                </div>
                <div class="p-6 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="text-sm font-extrabold text-gray-900 group-hover:text-brand-purple transition-colors line-clamp-2 leading-snug tracking-tight">${title}</h3>
                        <p class="text-xs font-medium text-gray-500 mt-2 flex items-center gap-1.5"><i class="fas fa-map-marker-alt text-brand-orange"></i> ${venue}</p>
                    </div>
                    <div class="border-t border-gray-50 pt-3 mt-3 flex items-center justify-between text-xs font-bold text-gray-500">
                        <span class="flex items-center gap-1.5"><i class="far fa-calendar-alt"></i> ${date}</span>
                        <span class="text-brand-orange bg-orange-50 px-2 py-1 rounded-md">${price}</span>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    if (window.i18n && typeof window.i18n.renderLanguage === 'function') {
        window.i18n.renderLanguage();
    }
}

function renderCategoryList(events, container) {
    if (!container) return;
    container.innerHTML = events.map(event => {
        const title = event.name || event.eventName || 'Sự kiện đặc sắc';
        const venue = event.location || 'Địa điểm tổ chức';
        const id = event.eventId || event.id;
        const img = event.bannerImageUrl || event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500';
        const price = event.minPrice ? new Intl.NumberFormat('vi-VN').format(event.minPrice) + 'đ' : '<span data-i18n="event.contact_price">Liên hệ</span>';
        let date = 'Sắp diễn ra';
        if (event.date) {
            date = new Date(event.date).toLocaleDateString('vi-VN');
        }

        const detailUrl = getDetailPath(id);

        return `
            <a href="${detailUrl}" class="group block bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all duration-300 ease-in-out">
                <div class="relative w-full aspect-video overflow-hidden bg-slate-100 flex-shrink-0">
                    <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" alt="${title}">
                    <div class="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-gray-900 font-extrabold text-[11px] px-3 py-1.5 rounded-full shadow-sm z-10">${price}</div>
                </div>
                <div class="p-6 flex flex-col justify-between h-[130px]">
                    <h3 class="text-sm font-extrabold text-gray-900 group-hover:text-brand-purple transition-colors line-clamp-2 leading-snug tracking-tight">${title}</h3>
                    <div class="flex flex-col gap-1.5 mt-auto">
                        <span class="text-xs font-medium text-gray-500 flex items-center gap-1.5"><i class="fas fa-map-marker-alt text-brand-orange"></i> ${venue}</span>
                        <span class="text-xs font-bold text-gray-500 flex items-center gap-1.5"><i class="far fa-calendar-alt"></i> ${date}</span>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    if (window.i18n && typeof window.i18n.renderLanguage === 'function') {
        window.i18n.renderLanguage();
    }
}

function getDetailPath(id) {
    if (window.pageUtils && window.pageUtils.resolveUrl) {
        return window.pageUtils.resolveUrl(`pages/user/event-detail.html?id=${id}`);
    }
    return window.location.pathname.includes('/pages/') ? `user/event-detail.html?id=${id}` : `pages/user/event-detail.html?id=${id}`;
}

// ==========================================
// 2. HERO SLIDER CAROUSEL LOGIC
// ==========================================
let heroIndex = 0;
let heroInterval;

function initHeroSlider() {
    showHeroSlide(heroIndex);
    startHeroInterval();
}

function showHeroSlide(idx) {
    const track = document.getElementById('hero-slider-track');
    const dots = document.querySelectorAll('.hero-dot');
    if (!track) return;
    
    const slidesCount = 3;
    if (idx >= slidesCount) heroIndex = 0;
    if (idx < 0) heroIndex = slidesCount - 1;

    track.style.transform = `translateX(-${heroIndex * 100}%)`;
    
    dots.forEach((dot, index) => {
        if (index === heroIndex) {
            dot.classList.add('active', 'w-5', 'bg-orange-500');
            dot.classList.remove('bg-white/50', 'w-2.5');
        } else {
            dot.classList.remove('active', 'w-5', 'bg-orange-500');
            dot.classList.add('bg-white/50', 'w-2.5');
        }
    });
}

window.moveHeroSlide = function(n) {
    clearInterval(heroInterval);
    heroIndex += n;
    showHeroSlide(heroIndex);
    startHeroInterval();
};

window.setHeroSlide = function(idx) {
    clearInterval(heroInterval);
    heroIndex = idx;
    showHeroSlide(heroIndex);
    startHeroInterval();
};

function startHeroInterval() {
    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        heroIndex++;
        showHeroSlide(heroIndex);
    }, 3000); // 3 seconds interval
}

// ==========================================
// 3. HORIZONTAL MINI SLIDER
// ==========================================
function renderMiniSlider(events) {
    const track = document.getElementById('mini-slider-track');
    if (!track) return;

    const dummyMiniEvents = [
        { id: 1, name: 'Hòa Nhạc Berliner', category: 'Vé ca nhạc', bannerImageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400' },
        { id: 2, name: 'À Ố Show Tre Việt', category: 'Văn hóa nghệ thuật', bannerImageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400' },
        { id: 3, name: 'Show Tinh Hoa Bắc Bộ', category: 'Văn hóa nghệ thuật', bannerImageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
        { id: 4, name: 'Liveshow HÀ NHI', category: 'Vé ca nhạc', bannerImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400' },
        { id: 5, name: 'Ký Ức Hội An', category: 'Văn hóa nghệ thuật', bannerImageUrl: 'https://images.unsplash.com/photo-1470229722913-7c092fb6224d?w=400' },
        { id: 6, name: 'DaNang Craft Beer', category: 'Workshop', bannerImageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400' }
    ];

    const finalEvents = events && events.length >= 6 ? events.slice(0, 8) : dummyMiniEvents;

    track.innerHTML = finalEvents.map(item => {
        const title = item.name || item.eventName || item.title || 'Sự kiện';
        const img = item.bannerImageUrl || item.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400';
        const id = item.eventId || item.id;
        const detailUrl = getDetailPath(id);
        const categoryLabel = item.category || 'Sự kiện mới';

        // Map mini-slider category badge label to localization key dynamically
        let categoryI18nAttr = '';
        const normCat = categoryLabel.toLowerCase().trim();
        if (normCat.includes('ca nhạc') || normCat.includes('concert')) categoryI18nAttr = 'data-i18n="nav.music"';
        else if (normCat.includes('văn hóa') || normCat.includes('culture') || normCat.includes('nghệ thuật')) categoryI18nAttr = 'data-i18n="nav.culture"';
        else if (normCat.includes('tham quan') || normCat.includes('du lịch') || normCat.includes('tourism') || normCat.includes('sightseeing')) categoryI18nAttr = 'data-i18n="nav.tourism"';
        else if (normCat.includes('workshop')) categoryI18nAttr = 'data-i18n="nav.workshop"';
        else if (normCat.includes('xem phim') || normCat.includes('movies') || normCat.includes('movie')) categoryI18nAttr = 'data-i18n="nav.movies"';
        else if (normCat.includes('thể thao') || normCat.includes('sports')) categoryI18nAttr = 'data-i18n="nav.sports"';
        else if (normCat.includes('tin tức') || normCat.includes('news')) categoryI18nAttr = 'data-i18n="nav.news"';

        return `
            <a href="${detailUrl}" class="mini-slider-card group flex-shrink-0 block bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all duration-300 ease-in-out p-3">
                <div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 mb-4">
                    <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" alt="${title}">
                    <span class="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md text-brand-purple font-extrabold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm z-10" ${categoryI18nAttr}>${categoryLabel}</span>
                </div>
                <h4 class="text-sm font-extrabold text-gray-900 line-clamp-1 leading-snug group-hover:text-brand-purple transition-colors px-1 tracking-tight">${title}</h4>
            </a>
        `;
    }).join('');

    if (window.i18n && typeof window.i18n.renderLanguage === 'function') {
        window.i18n.renderLanguage();
    }
}
