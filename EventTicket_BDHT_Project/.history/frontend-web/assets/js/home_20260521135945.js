/**
 * Trang chu: banner, featured/latest events, danh sach co search/filter/pagination.
 */

const eventListState = {
    page: 0,
    size: 8,
    mode: 'page',
    lastPage: false,
};

document.addEventListener('DOMContentLoaded', () => {
    fetchHomePageData();
    bindEventFilters();
    loadPagedEvents(0);
    startAutoSlide();
});

async function fetchHomePageData() {
    try {
        const responseData = await window.apiClient.get('/api/vtd/public/home');

        if (responseData.banners && responseData.banners.length > 0) {
            renderBanners(responseData.banners);
        }

        renderCategoryOptions(responseData.categories || []);
        renderLatestEvents(responseData.latestEvents || []);
        renderFeaturedEvents(responseData.featuredEvents || []);
    } catch (error) {
        console.error('Loi khi tai du lieu trang chu:', error);
        renderTemplate('mini-slider-track', 'tmpl-latest-event-error');
        renderTemplate('featured-events-wrapper', 'tmpl-featured-event-error');
    }
}

function bindEventFilters() {
    const filterBtn = document.getElementById('btn-event-filter');
    const searchInput = document.getElementById('event-search-keyword');
    const prevBtn = document.getElementById('btn-prev-events');
    const nextBtn = document.getElementById('btn-next-events');

    if (filterBtn) filterBtn.addEventListener('click', applyEventFilters);
    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') applyEventFilters();
        });
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (eventListState.mode === 'page' && eventListState.page > 0) {
                loadPagedEvents(eventListState.page - 1);
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (eventListState.mode === 'page' && !eventListState.lastPage) {
                loadPagedEvents(eventListState.page + 1);
            }
        });
    }
}

async function applyEventFilters() {
    const keyword = document.getElementById('event-search-keyword')?.value.trim();
    const category = document.getElementById('event-category-filter')?.value;
    const timeFilter = document.getElementById('event-time-filter')?.value;

    try {
        setAllEventsStatus('Dang tai danh sach su kien...');
        let events;
        if (keyword) {
            eventListState.mode = 'filter';
            events = await window.apiClient.get(`/api/vtd/public/events/search?keyword=${encodeURIComponent(keyword)}`);
        } else if (category) {
            eventListState.mode = 'filter';
            events = await window.apiClient.get(`/api/vtd/public/events/category/${encodeURIComponent(category)}`);
        } else if (timeFilter) {
            eventListState.mode = 'filter';
            events = await window.apiClient.get(`/api/vtd/public/events/time-filter?filter=${encodeURIComponent(timeFilter)}`);
        } else {
            await loadPagedEvents(0);
            return;
        }

        renderAllEvents(events || []);
        setPagerEnabled(false);
        setAllEventsStatus(`${events?.length || 0} su kien phu hop`);
    } catch (error) {
        renderAllEvents([]);
        setAllEventsStatus(`Khong the loc su kien: ${error.message}`);
    }
}

async function loadPagedEvents(page) {
    try {
        eventListState.mode = 'page';
        setAllEventsStatus('Dang tai danh sach su kien...');
        const data = await window.apiClient.get(`/api/vtd/public/events?page=${page}&size=${eventListState.size}`);
        const events = Array.isArray(data) ? data : (data.content || []);
        eventListState.page = data.number ?? page;
        eventListState.lastPage = Boolean(data.last);
        renderAllEvents(events);
        setPagerEnabled(true);
        setAllEventsStatus(`Trang ${eventListState.page + 1}${data.totalElements != null ? ` - Tong ${data.totalElements} su kien` : ''}`);
    } catch (error) {
        renderAllEvents([]);
        setAllEventsStatus(`Khong the tai danh sach su kien: ${error.message}`);
    }
}

function renderCategoryOptions(categories) {
    const select = document.getElementById('event-category-filter');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Tat ca danh muc</option>' +
        categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
    select.value = current;
}

function renderBanners(banners) {
    for (let i = 0; i < 3; i++) {
        const imgEl = document.getElementById(`banner-img-${i}`);
        if (imgEl && banners[i]) imgEl.src = resolveImageUrl(banners[i]);
    }
}

function renderLatestEvents(events) {
    const track = document.getElementById('mini-slider-track');
    if (!track) return;

    if (events.length === 0) {
        renderTemplate('mini-slider-track', 'tmpl-latest-event-empty');
        return;
    }

    track.innerHTML = '';
    events.forEach(event => {
        const card = cloneTemplate('tmpl-latest-event-card');
        fillField(card, 'bannerImage', null, { src: resolveImageUrl(event.bannerImageUrl), alt: event.title || '' });
        fillField(card, 'categoryName', event.categoryName || 'Su kien');
        fillField(card, 'title', event.title || 'Su kien');
        fillField(card, 'createdAt', formatDate(event.createdAt || event.startTime));
        fillField(card, 'minPrice', formatCurrency(event.minPrice || 0));
        card.querySelector('.mini-slider-card').addEventListener('click', () => openEventDetail(event.eventId));
        track.appendChild(card);
    });
}

let allFeaturedEvents = [];
let visibleCount = 8;

function renderFeaturedEvents(events) {
    const btnContainer = document.getElementById('btn-container');
    allFeaturedEvents = events || [];
    visibleCount = 8;

    if (allFeaturedEvents.length === 0) {
        renderTemplate('featured-events-wrapper', 'tmpl-featured-event-error');
        if (btnContainer) btnContainer.classList.add('hidden');
        return;
    }

    renderGrid(visibleCount, 'featured-grid-container', allFeaturedEvents);

    if (btnContainer) {
        btnContainer.classList.toggle('hidden', allFeaturedEvents.length <= visibleCount);
        const btnLoadMore = document.getElementById('btn-load-more');
        if (btnLoadMore) {
            btnLoadMore.onclick = () => {
                visibleCount += 8;
                renderGrid(visibleCount, 'featured-grid-container', allFeaturedEvents);
                if (visibleCount >= allFeaturedEvents.length || visibleCount >= 16) btnContainer.classList.add('hidden');
            };
        }
    }
}

function renderAllEvents(events) {
    const grid = document.getElementById('all-events-grid');
    if (!grid) return;
    if (!events || events.length === 0) {
        grid.innerHTML = '<div class="col-span-full bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-500 font-bold">Khong co su kien phu hop.</div>';
        return;
    }
    grid.innerHTML = '';
    events.forEach(event => grid.appendChild(createEventCard(event)));
}

function renderGrid(count, containerId, events) {
    const gridContainer = document.getElementById(containerId);
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    events.slice(0, count).forEach(event => gridContainer.appendChild(createEventCard(event)));
}

function createEventCard(event) {
    const card = cloneTemplate('tmpl-featured-card');
    fillField(card, 'bannerImage', null, { src: resolveImageUrl(event.bannerImageUrl), alt: event.title || '' });
    fillField(card, 'categoryName', event.categoryName || 'Su kien');
    fillField(card, 'title', event.title || 'Su kien');
    fillField(card, 'minPrice', event.startTime ? formatDate(event.startTime) : formatCurrency(event.minPrice || 0));
    card.firstElementChild.addEventListener('click', () => openEventDetail(event.eventId));
    return card;
}

function openEventDetail(eventId) {
    if (!eventId) return;
    window.location.href = window.pageUtils.resolveUrl(`/pages/user/event-detail.html?id=${eventId}`);
}

function cloneTemplate(templateId) {
    const tmpl = document.getElementById(templateId);
    return tmpl.content.cloneNode(true);
}

function renderTemplate(containerId, templateId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(cloneTemplate(templateId));
}

function fillField(fragment, field, text = null, attrs = {}) {
    const el = fragment.querySelector(`[data-field="${field}"]`);
    if (!el) return;
    if (text !== null) el.textContent = text;
    Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val || resolveImageUrl(null)));
}

function setAllEventsStatus(message) {
    const status = document.getElementById('all-events-status');
    if (status) status.textContent = message;
}

function setPagerEnabled(enabled) {
    const prev = document.getElementById('btn-prev-events');
    const next = document.getElementById('btn-next-events');
    if (prev) prev.disabled = !enabled || eventListState.page <= 0;
    if (next) next.disabled = !enabled || eventListState.lastPage;
}

let currentSlide = 0;
const totalSlides = 3;
let autoSlideInterval;

function updateSliderUI() {
    const track = document.getElementById('hero-slider-track');
    const dots = document.querySelectorAll('.hero-dot');
    if (track) track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, index) => {
        const isActive = index === currentSlide;
        dot.classList.toggle('bg-white', isActive);
        dot.classList.toggle('active', isActive);
        dot.classList.toggle('shadow-md', isActive);
        dot.classList.toggle('bg-white/40', !isActive);
    });
}

function moveHeroSlide(direction) {
    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    updateSliderUI();
    resetAutoSlide();
}

function setHeroSlide(index) {
    currentSlide = index;
    updateSliderUI();
    resetAutoSlide();
}

function startAutoSlide() {
    autoSlideInterval = setInterval(() => moveHeroSlide(1), 5000);
}

function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
}

function scrollMiniSlider(offset) {
    const track = document.getElementById('mini-slider-track');
    if (track) track.scrollBy({ left: offset, behavior: 'smooth' });
}

function resolveImageUrl(value) {
    if (!value) return window.pageUtils.resolveUrl('assets/images/no-image.png');
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;
    return window.pageUtils.resolveUrl(`assets/images/${value}`);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount || 0));
}

function formatDate(dateString) {
    if (!dateString) return 'Dang cap nhat';
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}
