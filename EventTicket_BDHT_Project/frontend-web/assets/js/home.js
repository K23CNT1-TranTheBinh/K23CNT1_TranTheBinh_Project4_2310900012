// --- API INTEGRATION & HOME PAGE LOGIC ---

// STATE MANAGEMENT
let currentPage = 1;
// FIX: TỐI ƯU UX - Giới hạn phân trang hiển thị 8 item/trang
const itemsPerPage = 8;
let ALL_EVENTS_DATA = [];
let filteredEvents = [];

function getEventImageUrl(event) {
    return event?.bannerImageUrl || event?.imageUrl || '';
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

// KHỞI CHẠY KHI TRANG LOAD
document.addEventListener('DOMContentLoaded', async function() {
    await initializeHomePage();
});

async function initializeHomePage() {
    if (window.pageUtils && window.pageUtils.loadHeader) {
        await window.pageUtils.loadHeader();
    }
    
    // 1. Setup Filter Event Listeners
    setupAllEventsSection();
    
    // 2. Fetch and render API data
    await fetchEvents();

    if (window.pageUtils && window.pageUtils.loadFooter) {
        await window.pageUtils.loadFooter();
    }
}

// --- FETCH ALL EVENTS FROM BACKEND ---
async function fetchEvents() {
    try {
        // Step A: Display loading skeletons
        showSkeletons();
        
        // Step B: Get all published events from Spring Boot (large size to load the full list for client filtering/pagination)
        const response = await window.apiClient.getPublicEvents({ page: 0, size: 999 });
        
        if (!response || !response.content) {
            throw new Error("Không nhận được dữ liệu hợp lệ từ Backend.");
        }
        
        const allEvents = response.content.filter(e => e.status === 'PUBLISHED');
        ALL_EVENTS_DATA = allEvents;
        filteredEvents = [...allEvents];
        
        // Step C: Distribute data
        
        // 1. Hero Slider Banners (Use top 3-5 events, sorted by eventId descending or featured)
        const featuredEvents = allEvents.filter(e => e.featured === true || e.status === 'PUBLISHED');
        const sliderEvents = featuredEvents.length > 0 ? featuredEvents.slice(0, 5) : allEvents.slice(0, 5);
        renderHeroSlider(sliderEvents);
        
        // 2. Latest Events (Sorted by createdAt descending)
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
                // Start marquee scrolling only AFTER rendering into DOM
                setupMarqueeScroll('latest-events-track', 1);
            }
        }
        
        // 3. Featured Events (Featured events or default lists)
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
                // Start marquee scrolling only AFTER rendering into DOM
                setupMarqueeScroll('featured-events-track', 1.2);
            }
        }
        
        // 4. Categories Filter Options
        populateCategoryFilter(allEvents);
        populateLocationFilter(allEvents);
        
        // 5. Paginated All Events Grid
        currentPage = 1;
        renderAllEventsGrid();
        
        // Step D: Enable Slider Autoplay interval after DOM load
        startHeroInterval();
        
    } catch (error) {
        console.error("Lỗi khi kết nối Backend API:", error);
        showErrorStates();
    }
}

// --- POPULATE CATEGORIES DYNAMICALLY ---
function populateCategoryFilter(events) {
    const categorySelect = document.getElementById('event-category-filter');
    if (!categorySelect) return;
    
    const categories = [...new Set(events.map(e => e.categoryName).filter(c => c !== null && c !== ''))];
    categorySelect.innerHTML = '<option value="">Tất cả danh mục</option>';
    
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        categorySelect.appendChild(opt);
    });
}

function populateLocationFilter(events) {
    const locationSelect = document.getElementById('header-location-filter');
    if (!locationSelect) return;

    const cities = [...new Set(events
        .map(event => (event?.venue?.city || extractCityFromAddress(event?.venue?.address) || '').trim())
        .filter(city => city !== ''))];

    locationSelect.innerHTML = '<option value="">Mọi địa điểm</option>';

    cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.innerText = city;
        locationSelect.appendChild(opt);
    });

    const queryLocation = new URLSearchParams(window.location.search).get('location');
    if (queryLocation) {
        locationSelect.value = queryLocation;
    }
}

function extractCityFromAddress(address) {
    if (!address) return null;
    const parts = address.split(',');
    if (parts.length > 1) return parts[parts.length - 1].trim();
    return null;
}

function normalizeSearchValue(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function matchesLocationKeyword(event, keyword) {
    const normalizedKeyword = normalizeSearchValue(keyword);
    if (!normalizedKeyword) return true;

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

// --- SKELETON LOADING INDICATORS ---
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

// --- ERROR PLACEMENT UI ---
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

// --- ASYNCHRONOUS TICKET PRICE UPDATE ---
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

// --- COMPILING BEAUTIFUL EVENT CARDS ---
function createEventCardHtml(event, isGrid = false) {
    const title = event.title || event.name || 'Sự kiện';
    const venue = event.venue ? event.venue.venueName : (event.location || 'Địa điểm tổ chức');
    const id = event.eventId || event.id;
    const img = getEventImageUrl(event);
    
    // FIX: Không dùng giá trị địa điểm giả; chỉ hiển thị dữ liệu thực từ backend hoặc nhãn trung lập.
    let city = event?.venue?.city || extractCityFromAddress(event?.venue?.address) || 'Địa điểm';
    if (city) {
        city = city.toUpperCase();
    }
    
    const date = event.startTime ? new Date(event.startTime).toLocaleDateString('vi-VN') : 'Sắp diễn ra';
    const category = event.categoryName || 'Sự kiện';
    const detailUrl = getDetailPath(id);

    const widthClass = isGrid ? 'w-full' : 'w-[280px] flex-shrink-0';
    const priceElementId = `card-price-${id}-${isGrid ? 'grid' : 'track'}-${Math.random().toString(36).substr(2, 5)}`;

    // Update the price asynchronously in the background
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

// --- DYNAMIC HERO SLIDER GENERATION ---
let heroIndex = 0;
let heroInterval;

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

        // FIX: Đồng bộ dữ liệu thật cho các slide (ID đã gắn sẵn trong index.html)
        // Chỉ gán cho tối đa 3 slide vì HTML hiện hỗ trợ hero-slide-0..2
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
    const track = document.getElementById('hero-slider-track');
    if (!track || track.children.length <= 1) return;
    
    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        heroIndex++;
        showHeroSlide(heroIndex);
    }, 4000);
}

// --- CONTINUOUS HORIZONTAL MARQUEE AUTO-SCROLL (PAUSE ON HOVER) ---
// FIX: TỐI ƯU UX - Tự động cuộn danh sách (Dừng khi hover chuột đã được xử lý bên dưới)
function setupMarqueeScroll(trackId, speed = 1) {
    const track = document.getElementById(trackId);
    if (!track) return;
    
    let scrollInterval;
    let isHovered = false;
    
    const startScroll = () => {
        clearInterval(scrollInterval);
        scrollInterval = setInterval(() => {
            if (isHovered) return;
            track.scrollLeft += speed;
            
            // Loop scroll seamlessly
            if (track.scrollLeft >= (track.scrollWidth - track.clientWidth - 4)) {
                track.scrollLeft = 0;
            }
        }, 30);
    };
    
    track.addEventListener('mouseenter', () => {
        isHovered = true;
    });
    
    track.addEventListener('mouseleave', () => {
        isHovered = false;
    });
    
    startScroll();
}

// Manual scroll triggers
window.scrollHorizontally = function(trackId, amount) {
    const track = document.getElementById(trackId);
    if (track) {
        track.scrollBy({ left: amount, behavior: 'smooth' });
    }
};

// --- REDIRECT DYNAMIC DETAILS ROUTER ---
function getDetailPath(id) {
    if (window.pageUtils && window.pageUtils.resolveUrl) {
        return window.pageUtils.resolveUrl(`pages/user/event-detail.html?id=${id}`);
    }
    return window.location.pathname.includes('/pages/') ? `user/event-detail.html?id=${id}` : `pages/user/event-detail.html?id=${id}`;
}

// --- ALL EVENTS FILTERS & PAGINATION LOGIC ---
function setupAllEventsSection() {
    const btnFilter = document.getElementById('btn-event-filter');
    const keywordInput = document.getElementById('header-search-keyword') || document.querySelector('#header-container input');
    const categoryFilterSelect = document.getElementById('event-category-filter');
    const timeFilterSelect = document.getElementById('event-time-filter');
    const locationFilterSelect = document.getElementById('header-location-filter');

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

        const now = new Date();
        filteredEvents = fetchedEvents.filter(event => {
            if (category && event.categoryName !== category) return false;
            if (keyword && !matchesLocationKeyword(event, keyword)) return false;
            if (location) {
                const city = (event?.venue?.city || extractCityFromAddress(event?.venue?.address) || '').toLowerCase();
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

        if (badgeCount) {
            badgeCount.innerText = `${filteredEvents.length} sự kiện`;
        }

    // 3. RENDER EMPTY STATE IF ZERO
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

    // 4. SLICING & RENDERING (Max 16 items per page)
    const startIndex = (currentPage - 1) * itemsPerPage;
    const slicedList = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

    grid.innerHTML = slicedList.map(event => createEventCardHtml(event, true)).join('');

    // 5. UPDATE PAGINATION CONTROLS
    renderPaginationControls(filteredEvents.length);
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        grid.innerHTML = '<div class="col-span-full text-center text-red-500 py-10">Lỗi khi tải dữ liệu từ máy chủ!</div>';
    }
}

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

function renderPaginationControls(totalCount) {
    const container = document.getElementById('all-events-pagination');
    if (!container) return;

    container.innerHTML = '';
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    if (totalPages <= 1) return;

    // Prev Button
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

    // Dynamic Numbers List
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

    // Next Button
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

function goToPage(page) {
    currentPage = page;
    renderAllEventsGrid();

    const section = document.getElementById('all-events-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// --- REDIRECT TRIGGER ON CAROUSEL HEADER ACTIONS ---
window.scrollToAllEvents = function(type) {
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
