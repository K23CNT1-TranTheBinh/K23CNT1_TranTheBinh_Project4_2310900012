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
document.addEventListener('DOMContentLoaded', async function () {
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

        // 0. Stats Ribbon
        renderStatsRibbon(allEvents);

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
                    <div class="w-full flex flex-col items-center justify-center py-16 rounded-2xl text-center" style="border:1.5px dashed rgba(167,139,250,0.3);background:linear-gradient(135deg,#f8f5ff,#fff7f0);">
                        <i class="far fa-calendar-times text-5xl mb-4" style="color:#c4b5fd;"></i>
                        <p class="font-semibold" style="color:#3b0764;">Hiện tại không có sự kiện mới nhất nào được mở bán.</p>
                    </div>
                `;
            } else {
                latestTrack.innerHTML = sortedByNewest.map(event => createEventCardHtml(event, false)).join('');
                // Start marquee scrolling only AFTER rendering into DOM
                setupMarqueeScroll('latest-events-track', 1);
            }
        }

        // 3. Featured Events
        const featuredTrack = document.getElementById('featured-events-track');
        if (featuredTrack) {
            const featuredList = allEvents.slice(0, 10);

            if (featuredList.length === 0) {
                featuredTrack.innerHTML = `
                    <div class="w-full flex flex-col items-center justify-center py-16 rounded-2xl text-center" style="border:1.5px dashed rgba(167,139,250,0.3);background:linear-gradient(135deg,#f8f5ff,#fff7f0);">
                        <i class="far fa-star text-5xl mb-4" style="color:#c4b5fd;"></i>
                        <p class="font-semibold" style="color:#3b0764;">Hiện tại không có sự kiện nổi bật nào được mở bán.</p>
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

// --- STATS RIBBON ---
function renderStatsRibbon(events) {
    const totalEl = document.getElementById('stat-total-events');
    const catEl = document.getElementById('stat-categories');
    const cityEl = document.getElementById('stat-cities');

    if (totalEl) totalEl.textContent = `${events.length} sự kiện`;

    if (catEl) {
        const cats = new Set(events.map(e => e.categoryName).filter(Boolean));
        catEl.textContent = `${cats.size} danh mục`;
    }

    if (cityEl) {
        const cities = new Set(
            events.map(e => e?.venue?.city || extractCityFromAddress(e?.venue?.address)).filter(Boolean)
        );
        cityEl.textContent = `${cities.size} thành phố`;
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
        <div style="min-width:260px;width:260px;background:rgba(255,255,255,0.92);border:1px solid rgba(167,139,250,0.18);border-radius:1.25rem;overflow:hidden;flex-shrink:0;box-shadow:0 4px 20px rgba(124,58,237,0.06);" class="animate-pulse">
            <div style="width:100%;aspect-ratio:16/10;" class="skeleton-shimmer"></div>
            <div style="padding:1.1rem 1.2rem;display:flex;flex-direction:column;gap:0.65rem;">
                <div style="height:14px;border-radius:6px;width:80%;" class="skeleton-shimmer"></div>
                <div style="height:12px;border-radius:6px;width:55%;" class="skeleton-shimmer"></div>
                <div style="height:12px;border-radius:6px;width:65%;margin-top:4px;" class="skeleton-shimmer"></div>
                <div style="height:36px;border-radius:8px;width:100%;margin-top:8px;" class="skeleton-shimmer"></div>
            </div>
        </div>
    `;

    const gridSkeleton = `
        <div style="background:rgba(255,255,255,0.92);border:1px solid rgba(167,139,250,0.18);border-radius:1.25rem;overflow:hidden;width:100%;box-shadow:0 4px 20px rgba(124,58,237,0.06);" class="animate-pulse">
            <div style="width:100%;aspect-ratio:16/10;" class="skeleton-shimmer"></div>
            <div style="padding:1.1rem 1.2rem;display:flex;flex-direction:column;gap:0.65rem;">
                <div style="height:14px;border-radius:6px;width:80%;" class="skeleton-shimmer"></div>
                <div style="height:12px;border-radius:6px;width:55%;" class="skeleton-shimmer"></div>
                <div style="height:12px;border-radius:6px;width:65%;margin-top:4px;" class="skeleton-shimmer"></div>
                <div style="height:36px;border-radius:8px;width:100%;margin-top:8px;" class="skeleton-shimmer"></div>
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
        <div class="w-full col-span-full flex flex-col items-center justify-center py-16 rounded-2xl text-center p-6" style="background:linear-gradient(135deg,#fff5f5,#fff0f7);border:1.5px solid #fecaca;">
            <i class="fas fa-exclamation-circle text-4xl mb-3" style="color:#f87171;"></i>
            <p style="color:#b91c1c;font-weight:700;font-size:0.95rem;">Không thể kết nối đến máy chủ Backend</p>
            <p style="color:#dc2626;font-size:0.75rem;margin-top:4px;">Vui lòng khởi chạy server Spring Boot hoặc kiểm tra kết nối mạng của bạn.</p>
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

// --- COMPILING BEAUTIFUL EVENT CARDS (Dark Theme) ---
function createEventCardHtml(event, isGrid = false) {
    const title = event.title || event.name || 'Sự kiện';
    const venue = event.venue ? event.venue.venueName : (event.location || 'Địa điểm tổ chức');
    const id = event.eventId || event.id;
    const img = getEventImageUrl(event);

    // Chỉ hiển thị dữ liệu thực từ backend.
    let city = event?.venue?.city || extractCityFromAddress(event?.venue?.address) || 'Địa điểm';
    if (city) city = city.toUpperCase();

    const date = event.startTime ? new Date(event.startTime).toLocaleDateString('vi-VN') : 'Sắp diễn ra';
    const category = event.categoryName || 'Sự kiện';
    const detailUrl = getDetailPath(id);

    const widthStyle = isGrid ? '' : 'min-width:260px;width:260px;flex-shrink:0;';
    const priceElementId = `card-price-${id}-${isGrid ? 'grid' : 'track'}-${Math.random().toString(36).substr(2, 5)}`;

    // Update the price asynchronously in the background
    setTimeout(() => updateCardPrice(id, priceElementId), 10);

    const imgHtml = img
        ? `<img src="${img}" class="w-full h-full object-cover" style="transition:transform 0.6s ease;" alt="${title}" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f3e8ff,#fce7f3);"><i class="fas fa-image" style="font-size:1.5rem;color:#c4b5fd;"></i></div>`;

    return `
        <a href="${detailUrl}" class="glass-card group" style="${widthStyle}text-decoration:none;">
            <div class="card-thumb">
                ${imgHtml}
                <span class="card-city-tag">${city}</span>
                <span class="card-cat-tag">${category}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title" title="${title}">${title}</h3>
                <div class="card-meta">
                    <div class="card-meta-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;">${venue}</span>
                    </div>
                    <div class="card-meta-row">
                        <i class="far fa-calendar-alt" style="color:rgba(168,85,247,0.7);"></i>
                        <span>${date}</span>
                    </div>
                </div>
                <div class="card-footer-row">
                    <div>
                        <p class="price-label">Giá vé từ</p>
                        <span id="${priceElementId}" class="price-value">Đang tải...</span>
                    </div>
                    <span class="card-arrow-btn"><i class="fas fa-arrow-right"></i></span>
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
            <div class="hero-slide" style="display:flex;align-items:center;justify-content:center;background:#080b14;">
                <div style="text-align:center;color:#fff;">
                    <h2 style="font-size:2rem;font-weight:900;margin-bottom:0.5rem;">BDHT Event Ticketing</h2>
                    <p style="color:#64748b;">Kênh bán vé sự kiện hiện đại, nhanh chóng và uy tín hàng đầu</p>
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
        const category = event.categoryName || 'HOT EVENT';
        const detailUrl = getDetailPath(id);
        const date = event.startTime ? new Date(event.startTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        const venue = event.venue ? event.venue.venueName : (event.location || '');

        const imgHtml = img
            ? `<img src="${img}" alt="${title}" style="width:100%;height:100%;object-fit:cover;opacity:0.8;transition:transform 8s ease,opacity 0.9s ease;">`
            : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a0a2e,#0d1a3a);"></div>`;

        const slide = document.createElement('div');
        slide.className = 'hero-slide';
        slide.innerHTML = `
            ${imgHtml}
            <div class="hero-overlay">
                <div class="hero-content">
                    <span class="hero-badge">
                        <span class="dot-live"></span>
                        ${category}
                    </span>
                    <h2 class="hero-title">
                        ${title.split(' ').slice(0, Math.ceil(title.split(' ').length / 2)).join(' ')}<br>
                        <span class="accent">${title.split(' ').slice(Math.ceil(title.split(' ').length / 2)).join(' ')}</span>
                    </h2>
                    <p class="hero-desc">${description.substring(0, 160)}${description.length > 160 ? '...' : ''}</p>
                    <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;">
                        <a href="${detailUrl}" class="hero-cta">
                            Mua Vé Ngay <i class="fas fa-arrow-right"></i>
                        </a>
                        ${date ? `<span style="color:rgba(226,232,240,0.55);font-size:0.8rem;font-weight:600;"><i class="far fa-calendar-alt" style="margin-right:0.4rem;color:#ff6b2b;"></i>${date}</span>` : ''}
                        ${venue ? `<span style="color:rgba(226,232,240,0.55);font-size:0.8rem;font-weight:600;"><i class="fas fa-map-marker-alt" style="margin-right:0.4rem;color:#a855f7;"></i>${venue}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        track.appendChild(slide);

        if (dotsContainer) {
            const dot = document.createElement('div');
            dot.className = 'hero-dot';
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

    // Animate the active slide image (ken burns)
    Array.from(track.children).forEach((slide, i) => {
        const img = slide.querySelector('img');
        if (img) {
            if (i === heroIndex) {
                slide.classList.add('is-active');
                img.style.transform = 'scale(1.06)';
            } else {
                slide.classList.remove('is-active');
                img.style.transform = 'scale(1)';
            }
        }
    });

    // Update pill dots
    dots.forEach((dot, index) => {
        if (index === heroIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

window.moveHeroSlide = function (n) {
    clearInterval(heroInterval);
    heroIndex += n;
    showHeroSlide(heroIndex);
    startHeroInterval();
};

window.setHeroSlide = function (idx) {
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
window.scrollHorizontally = function (trackId, amount) {
    const track = document.getElementById(trackId);
    if (track) {
        track.scrollBy({ left: amount, behavior: 'smooth' });
    }
};

// --- REDIRECT DYNAMIC DETAILS ROUTER ---
function getDetailPath(id) {
    if (window.pageUtils && window.pageUtils.resolveUrl) {
        return window.pageUtils.resolveUrl(`pages/user/nat-event-detail.html?id=${id}`);
    }
    return window.location.pathname.includes('/pages/') ? `user/nat-event-detail.html?id=${id}` : `pages/user/nat-event-detail.html?id=${id}`;
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
            <div class="col-span-full flex flex-col items-center justify-center py-16 p-6 text-center rounded-2xl" style="background:linear-gradient(135deg,#f8f5ff,#fff7f0);border:1.5px dashed rgba(167,139,250,0.35);">
                <i class="far fa-calendar-times text-5xl mb-4" style="color:#c4b5fd;"></i>
                <p style="color:#3b0764;font-weight:700;font-size:1rem;">Không tìm thấy sự kiện nào</p>
                <p style="color:#6b7280;font-size:0.8rem;margin-top:4px;">Vui lòng thay đổi bộ lọc và thử lại nhé.</p>
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

    const baseStyle = 'font-family:Outfit,sans-serif;font-size:0.82rem;font-weight:700;border-radius:0.65rem;padding:0.6rem 1rem;cursor:pointer;display:inline-flex;align-items:center;gap:0.35rem;transition:all 0.25s ease;border:1.5px solid rgba(167,139,250,0.22);';
    const activeStyle = baseStyle + 'background:linear-gradient(135deg,#f97316,#ec4899);color:#fff;box-shadow:0 4px 16px rgba(249,115,22,0.32);border-color:transparent;';
    const inactiveStyle = baseStyle + 'background:rgba(255,255,255,0.85);color:#7c3aed;';
    const disabledStyle = baseStyle + 'background:rgba(255,255,255,0.4);color:#c4b5fd;pointer-events:none;border-color:rgba(167,139,250,0.12);';

    // Prev Button
    const prevBtn = document.createElement('button');
    if (currentPage === 1) {
        prevBtn.style.cssText = disabledStyle;
        prevBtn.disabled = true;
    } else {
        prevBtn.style.cssText = inactiveStyle;
        prevBtn.onmouseover = () => { prevBtn.style.background = 'rgba(249,115,22,0.08)'; prevBtn.style.color = '#f97316'; prevBtn.style.borderColor = 'rgba(249,115,22,0.35)'; };
        prevBtn.onmouseout = () => { prevBtn.style.background = 'rgba(255,255,255,0.85)'; prevBtn.style.color = '#7c3aed'; prevBtn.style.borderColor = 'rgba(167,139,250,0.22)'; };
        prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    }
    prevBtn.innerHTML = `<i class="fas fa-chevron-left" style="font-size:0.7rem;"></i> Trước`;
    container.appendChild(prevBtn);

    // Dynamic Numbers List
    const maxVisible = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        if (i === currentPage) {
            pageBtn.style.cssText = activeStyle;
        } else {
            pageBtn.style.cssText = inactiveStyle;
            const pi = i;
            pageBtn.onmouseover = () => { pageBtn.style.background = 'rgba(249,115,22,0.08)'; pageBtn.style.color = '#f97316'; pageBtn.style.borderColor = 'rgba(249,115,22,0.35)'; };
            pageBtn.onmouseout = () => { pageBtn.style.background = 'rgba(255,255,255,0.85)'; pageBtn.style.color = '#7c3aed'; pageBtn.style.borderColor = 'rgba(167,139,250,0.22)'; };
            pageBtn.addEventListener('click', () => goToPage(pi));
        }
        pageBtn.innerText = i;
        container.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    if (currentPage === totalPages) {
        nextBtn.style.cssText = disabledStyle;
        nextBtn.disabled = true;
    } else {
        nextBtn.style.cssText = inactiveStyle;
        nextBtn.onmouseover = () => { nextBtn.style.background = 'rgba(249,115,22,0.08)'; nextBtn.style.color = '#f97316'; nextBtn.style.borderColor = 'rgba(249,115,22,0.35)'; };
        nextBtn.onmouseout = () => { nextBtn.style.background = 'rgba(255,255,255,0.85)'; nextBtn.style.color = '#7c3aed'; nextBtn.style.borderColor = 'rgba(167,139,250,0.22)'; };
        nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    }
    nextBtn.innerHTML = `Sau <i class="fas fa-chevron-right" style="font-size:0.7rem;"></i>`;
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
