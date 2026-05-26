/**
 * All Events Premium Interface JS - BDHT Ticketing Platform
 * Role: Senior Frontend Developer & UI/UX Expert
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Load dynamic header and footer from shared components
    if (window.pageUtils && window.pageUtils.loadHeader) {
        await window.pageUtils.loadHeader();
    }
    
    // Lấy dữ liệu thật từ Backend trước khi khởi tạo UI
    await loadEventsFromBackend();

    // Initialize premium components
    initHeroSlider();
    initFeaturedCarousel();
    initAllEventsPagination();

    if (window.pageUtils && window.pageUtils.loadFooter) {
        await window.pageUtils.loadFooter();
    }
});

// ==========================================
// 1. DỮ LIỆU ĐỘNG TỪ BACKEND (DYNAMIC DATA)
// ==========================================
let eventsData = [];

function getEventImageUrl(event) {
    return event?.bannerImageUrl || event?.imageUrl || event?.image || '';
}

function renderEventImage(imageUrl, altText, className = '') {
    if (!imageUrl) {
        return `
            <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 text-orange-400">
                <i class="fas fa-image text-2xl"></i>
            </div>`;
    }

    return `<img src="${imageUrl}" class="${className}" alt="${altText}">`;
}

async function loadEventsFromBackend() {
    try {
        const response = await window.apiClient.getPublicEvents({ page: 0, size: 100 });
        const apiEvents = response.content || response || [];
        
        eventsData = apiEvents.filter(e => e.status === 'PUBLISHED' || !e.status).map(e => ({
            id: e.eventId || e.id,
            name: e.title || e.name || 'Sự kiện',
            category: e.categoryName || 'Sự kiện',
            date: e.startTime ? new Date(e.startTime).toLocaleDateString('vi-VN') : 'Sắp diễn ra',
            location: e.venue ? e.venue.venueName : (e.location || 'Đang cập nhật'),
            price: 'Xem chi tiết',
            image: e.bannerImageUrl || e.imageUrl || '',
            featured: e.featured || false
        }));
        filteredEvents = [...eventsData];
    } catch (error) {
        console.error("Lỗi tải danh sách sự kiện từ API:", error);
    }
}

// ==========================================
// 2. HERO SLIDER LOGIC
// ==========================================
let currentHeroSlide = 0;
let heroInterval;
let dynamicHeroSlides = [];

function initHeroSlider() {
    const track = document.getElementById('hero-slider-track');
    const dotsContainer = document.getElementById('hero-dots-container');
    if (!track || !dotsContainer) return;

    // Lấy top 3 sự kiện nổi bật từ database backend
    const topEvents = eventsData.filter(e => e.featured).slice(0, 3);
    const sliderEvents = topEvents.length > 0 ? topEvents : eventsData.slice(0, 3);
    
    dynamicHeroSlides = sliderEvents.map((e, idx) => ({
        tag: e.category || "SỰ KIỆN HOT",
        title: e.name,
        desc: `Tham gia sự kiện ${e.name} tại ${e.location}. Đặt vé ngay hôm nay!`,
        img: getEventImageUrl(e),
        link: `event-detail.html?id=${e.id}`,
        colorClass: ["bg-orange-500", "bg-purple-600", "bg-blue-600"][idx % 3]
    }));

    if (dynamicHeroSlides.length === 0) return;

    // Render slides động
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

    // Render dots
    dotsContainer.innerHTML = dynamicHeroSlides.map((_, idx) => `
        <span onclick="setHeroSlide(${idx})" class="w-2.5 h-2.5 rounded-full bg-white/50 cursor-pointer transition-all duration-300 hero-dot ${idx === 0 ? 'active w-5 bg-orange-500' : ''}"></span>
    `).join('');

    startHeroInterval();
}

function showHeroSlide(idx) {
    const track = document.getElementById('hero-slider-track');
    const dots = document.querySelectorAll('.hero-dot');
    if (!track) return;

    if (idx >= dynamicHeroSlides.length) currentHeroSlide = 0;
    else if (idx < 0) currentHeroSlide = dynamicHeroSlides.length - 1;
    else currentHeroSlide = idx;

    track.style.transform = `translateX(-${currentHeroSlide * 100}%)`;

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

window.moveHeroSlide = function(n) {
    clearInterval(heroInterval);
    currentHeroSlide += n;
    showHeroSlide(currentHeroSlide);
    startHeroInterval();
};

window.setHeroSlide = function(idx) {
    clearInterval(heroInterval);
    currentHeroSlide = idx;
    showHeroSlide(currentHeroSlide);
    startHeroInterval();
};

function startHeroInterval() {
    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        currentHeroSlide++;
        showHeroSlide(currentHeroSlide);
    }, 4000); // 4 seconds auto-scroll
}

// ==========================================
// 3. FEATURED CAROUSEL LOGIC
// ==========================================
let featuredInterval;
let isFeaturedPaused = false;

function initFeaturedCarousel() {
    const track = document.getElementById('featured-carousel-track');
    if (!track) return;

    // Filter featured items
    const featuredEvents = eventsData.filter(e => e.featured);

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
                    <a href="event-detail.html?id=${event.id}" class="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-orange-500/10 transition">Mua vé</a>
                </div>
            </div>
        </div>
    `).join('');

    // Auto-scroll loop
    startFeaturedInterval();

    // Hover listeners
    track.addEventListener('mouseenter', () => { isFeaturedPaused = true; });
    track.addEventListener('mouseleave', () => { isFeaturedPaused = false; });

    // Arrow buttons
    const btnPrev = document.getElementById('featured-prev');
    const btnNext = document.getElementById('featured-next');

    if (btnPrev && btnNext) {
        btnPrev.addEventListener('click', () => {
            clearInterval(featuredInterval);
            track.scrollLeft -= 340;
            startFeaturedInterval();
        });
        btnNext.addEventListener('click', () => {
            clearInterval(featuredInterval);
            track.scrollLeft += 340;
            startFeaturedInterval();
        });
    }
}

function startFeaturedInterval() {
    clearInterval(featuredInterval);
    featuredInterval = setInterval(() => {
        const track = document.getElementById('featured-carousel-track');
        if (!track || isFeaturedPaused) return;

        // Auto-scroll right
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= maxScroll - 5) {
            track.scrollLeft = 0; // wrap around smoothly
        } else {
            track.scrollLeft += 2; // pixel-by-pixel micro-scrolling
        }
    }, 25);
}

// ==========================================
// 4. PAGINATION LOGIC (ALL EVENTS SECTION)
// ==========================================
let currentPage = 1;
// FIX: TỐI ƯU UX - Giới hạn phân trang hiển thị 8 item/trang
const itemsPerPage = 8;
let filteredEvents = [...eventsData];
let currentCategory = "Tất cả";

function initAllEventsPagination() {
    setupPaginationFilters();
    renderPaginationEvents();
}

// FIX: render danh mục động từ dữ liệu backend thay vì hardcode chips trong HTML
function syncCategoryChips() {
    const container = document.getElementById('all-events-categories');
    if (!container) return;

    const uniqueCategories = ['Tất cả', ...new Set(eventsData.map(event => event.category || 'Sự kiện').filter(Boolean))];

    container.innerHTML = uniqueCategories.map((category, index) => {
        const isActive = category === currentCategory;
        return `
            <button
                type="button"
                data-category="${category}"
                class="pagination-chip px-5 py-2.5 border rounded-full text-xs font-bold transition ${isActive
                    ? 'border-brand-purple bg-brand-purple text-white'
                    : 'border-slate-200 bg-white text-slate-650 hover:border-brand-purple hover:text-brand-purple'}">
                ${category}
            </button>
        `;
    }).join('');

    container.querySelectorAll('.pagination-chip').forEach((button) => {
        button.addEventListener('click', () => {
            currentCategory = button.dataset.category;
            currentPage = 1;
            syncCategoryChips();
            filterEvents();
        });
    });
}

function setupPaginationFilters() {
    syncCategoryChips();

    const oldSearchInput = document.getElementById('all-events-search');
    if (oldSearchInput) {
        oldSearchInput.addEventListener('input', () => {
            currentPage = 1;
            filterEvents();
        });
    }

    // FIX: TỐI ƯU UX - Bắt sự kiện Search từ Top Header
    const headerSearchInput = document.getElementById('header-search-keyword') || document.querySelector('#header-container input');
    if (headerSearchInput) {
        headerSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentPage = 1;
                const section = document.getElementById('all-events-section-title') || document.getElementById('all-events-grid');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                filterEvents();
            }
        });
    }
}

function filterEvents() {
    // FIX: TỐI ƯU UX - Lấy keyword từ Top Header nếu ô search cũ đã bị xóa
    const oldSearchInput = document.getElementById('all-events-search');
    const headerSearchInput = document.getElementById('header-search-keyword') || document.querySelector('#header-container input');

    let keyword = "";
    if (oldSearchInput && oldSearchInput.value) {
        keyword = oldSearchInput.value.trim().toLowerCase();
    } else if (headerSearchInput) {
        keyword = headerSearchInput.value.trim().toLowerCase();
    }

    filteredEvents = eventsData.filter(event => {
        const matchesCategory = currentCategory === "Tất cả" || event.category === currentCategory;
        const matchesKeyword = event.name.toLowerCase().includes(keyword) ||
                               event.location.toLowerCase().includes(keyword);
        return matchesCategory && matchesKeyword;
    });

    renderPaginationEvents();
}

function renderPaginationEvents() {
    const grid = document.getElementById('all-events-grid');
    const controls = document.getElementById('pagination-controls');
    if (!grid || !controls) return;

    // Slicing math
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredEvents.slice(startIndex, endIndex);

    if (paginatedItems.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16 flex flex-col items-center justify-center">
                <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl mb-4 shadow-inner"><i class="fas fa-search"></i></div>
                <h3 class="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-1">Không tìm thấy sự kiện nào</h3>
                <p class="text-[10px] text-slate-400 font-bold">Hãy thử thay đổi danh mục hoặc từ khóa tìm kiếm</p>
            </div>
        `;
        controls.innerHTML = '';
        return;
    }

    grid.innerHTML = paginatedItems.map(event => `
        <a href="event-detail.html?id=${event.id}" class="group block bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-brand-purple/5 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between h-[360px]">
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

    renderPaginationControls();
}

function renderPaginationControls() {
    const controls = document.getElementById('pagination-controls');
    if (!controls) return;

    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    if (totalPages <= 1) {
        controls.innerHTML = '';
        return;
    }

    let buttonsHTML = '';

    // Prev Button
    buttonsHTML += `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition shadow-sm">
            <i class="fas fa-chevron-left text-xs"></i>
        </button>
    `;

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        buttonsHTML += `
            <button onclick="changePage(${i})" class="w-10 h-10 rounded-full border ${isActive ? 'bg-brand-purple text-white border-brand-purple' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} font-extrabold text-xs flex items-center justify-center transition shadow-sm">
                ${i}
            </button>
        `;
    }

    // Next Button
    buttonsHTML += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition shadow-sm">
            <i class="fas fa-chevron-right text-xs"></i>
        </button>
    `;

    controls.innerHTML = buttonsHTML;
}

window.changePage = function(pageNum) {
    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    if (pageNum < 1 || pageNum > totalPages) return;

    currentPage = pageNum;
    renderPaginationEvents();

    // Scroll smoothly to All Events grid top
    const gridEl = document.getElementById('all-events-section-title');
    if (gridEl) {
        gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};