document.addEventListener('DOMContentLoaded', () => {
    // Tải Header dynamic nếu có tiện ích
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }
    
    loadEventDetails();
    setupBookingForm();
    setupStickyFooterScroll();
    setupBuyButtons();
    setupModalEvents();
    initializeReviewSystem();
});

const REVIEW_CACHE_KEY = 'bdht_review_cache';

function getCurrentUserInfo() {
    try {
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) return null;
        return JSON.parse(storedUser);
    } catch (error) {
        return null;
    }
}

function getReviewCache() {
    try {
        const raw = localStorage.getItem(REVIEW_CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function saveReviewCache(items) {
    localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify(items));
}

function getCurrentEventTitle() {
    return document.getElementById('detail-title')?.innerText?.trim() || 'Sự kiện';
}

function normalizeCachedReview(review, context = {}) {
    const rawUser = context.user || review.user || {};
    const userId = String(review.userId || rawUser.userId || rawUser.id || context.userId || '');
    const userName = review.fullName || rawUser.fullName || context.userName || 'Bạn';

    return {
        reviewId: String(review.reviewId || review.id || context.reviewId || `${context.eventId || review.eventId || 'event'}-${Date.now()}`),
        eventId: String(review.eventId || context.eventId || ''),
        eventTitle: context.eventTitle || review.eventTitle || review.event?.title || review.event?.name || getCurrentEventTitle(),
        rating: Number(review.rating ?? context.rating ?? 5),
        comment: review.comment || review.content || context.comment || '',
        createdAt: review.createdAt || context.createdAt || new Date().toISOString(),
        updatedAt: review.updatedAt || context.updatedAt || new Date().toISOString(),
        userId,
        userName
    };
}

function upsertCachedReview(review, context = {}) {
    const items = getReviewCache();
    const normalized = normalizeCachedReview(review, context);
    const index = items.findIndex(item => String(item.reviewId || item.id || '') === String(normalized.reviewId));

    if (index >= 0) {
        items[index] = normalized;
    } else {
        items.unshift(normalized);
    }

    saveReviewCache(items);
}

function removeCachedReview(reviewId) {
    saveReviewCache(getReviewCache().filter(item => String(item.reviewId || item.id || '') !== String(reviewId)));
}

function getCachedUserReviews() {
    const currentUser = getCurrentUserInfo();
    const userId = currentUser ? String(currentUser.userId || currentUser.id || '') : '';
    if (!userId) return [];

    return getReviewCache()
        .filter(item => String(item.userId || '') === userId)
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

window.upsertCachedReview = upsertCachedReview;
window.removeCachedReview = removeCachedReview;
window.getCachedUserReviews = getCachedUserReviews;

// ==========================================
// 1. TẢI CHI TIẾT SỰ KIỆN TỪ BACKEND API
// ==========================================
async function loadEventDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    const loadingMsg = document.getElementById('loading-msg');
    const errorMsg = document.getElementById('error-msg');
    const eventContent = document.getElementById('event-content');
    const ticketTypesContainer = document.getElementById('ticket-types');
    const ticketListStatic = document.getElementById('ticket-types-list-static');
    const eventImagesContainer = document.getElementById('detail-images');
    const venueInfo = document.getElementById('detail-venue-info');

    if (!eventId) {
        if (loadingMsg) loadingMsg.style.display = 'none';
        if (errorMsg) {
            errorMsg.innerText = 'Không tìm thấy mã sự kiện. Vui lòng quay lại Trang chủ!';
            errorMsg.classList.remove('hidden');
        }
        return;
    }

    try {
        let event = null;
        let ticketTypes = [];
        let images = [];

        try {
            event = await window.apiClient.get(`/api/vtd/public/events/${eventId}`);
        } catch (apiErr) {
            console.warn("Lỗi API lấy chi tiết sự kiện:", apiErr);
            throw apiErr;
        }

        if (loadingMsg) loadingMsg.style.display = 'none';
        if (eventContent) eventContent.classList.remove('hidden');

        // Điền Tiêu đề
        const titleEl = document.getElementById('detail-title');
        if (titleEl) titleEl.innerText = event.title || event.name || event.eventName || 'Sự kiện đặc sắc';

        // Điền Địa điểm
        const venueEl = document.getElementById('detail-venue');
        if (venueEl) venueEl.innerText = (event.venue && event.venue.venueName) ? event.venue.venueName : (event.venueName || event.location || 'Chưa cập nhật');

        // Điền mô tả giới thiệu chi tiết và loại bỏ phần II. Sơ Đồ Khán Đài Ghế Ngồi nếu có
        let cleanDescription = event.description || event.desc || 'Chưa có thông tin giới thiệu chi tiết.';
        let seatingChartImgUrl = null;

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(cleanDescription, 'text/html');
            
            // Tìm tiêu đề chứa "Sơ đồ" hoặc "Khán đài" hoặc "II. Sơ đồ"
            const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div'));
            let headingToRemove = null;
            for (const h of headings) {
                const text = (h.textContent || '').trim();
                if (text.includes('Sơ Đồ Khán Đài') || text.includes('SƠ ĐỒ KHÁN ĐÀI') || text.includes('Sơ đồ khán đài') || text.includes('Sơ đồ ghế ngồi') || text.includes('II. Sơ đồ') || text.includes('Sơ đồ Khán đài')) {
                    headingToRemove = h;
                    break;
                }
            }

            if (headingToRemove) {
                // Trích xuất ảnh trong phần sơ đồ khán đài
                let imgEl = headingToRemove.querySelector('img');
                
                if (!imgEl) {
                    let sibling = headingToRemove.nextElementSibling;
                    while (sibling) {
                        if (sibling.tagName.match(/^H[1-6]$/)) {
                            break; // Dừng nếu gặp tiêu đề khác
                        }
                        imgEl = sibling.querySelector('img') || (sibling.tagName === 'IMG' ? sibling : null);
                        if (imgEl) {
                            break;
                        }
                        sibling = sibling.nextElementSibling;
                    }
                }
                
                if (imgEl) {
                    seatingChartImgUrl = imgEl.getAttribute('src') || imgEl.src;
                }
                
                // Xóa tiêu đề và các phần tử con liên quan trong phần sơ đồ đó
                let sibling = headingToRemove.nextElementSibling;
                headingToRemove.remove();
                while (sibling) {
                    if (sibling.tagName.match(/^H[1-6]$/)) {
                        break;
                    }
                    const next = sibling.nextElementSibling;
                    sibling.remove();
                    sibling = next;
                }
                
                cleanDescription = doc.body.innerHTML;
            }
        } catch (e) {
            console.warn("Lỗi phân tích mô tả để bỏ sơ đồ khán đài:", e);
        }

        const descEl = document.getElementById('detail-desc');
        if (descEl) descEl.innerHTML = cleanDescription;
        
        // Phân tách Ngày & Giờ
        const rawDate = event.startTime || event.date;
        const dateEl = document.getElementById('detail-date');
        const timeEl = document.getElementById('detail-time-row');
        if (rawDate) {
            const d = new Date(rawDate);
            if (dateEl) dateEl.innerText = d.toLocaleDateString('vi-VN');
            if (timeEl) timeEl.innerText = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // Cập nhật banner chính và phông nền mờ cinematic bằng ảnh sơ đồ trích xuất được (nếu có)
        const imgUrl = seatingChartImgUrl || event.bannerImageUrl || event.imageUrl || '';
        const imgEl = document.getElementById('detail-image');
        if (imgEl) {
            if (imgUrl) {
                imgEl.src = imgUrl;
                imgEl.style.display = '';
            } else {
                imgEl.removeAttribute('src');
                imgEl.style.display = 'none';
            }
        }

        const blurBgEl = document.getElementById('detail-blur-bg');
        if (blurBgEl) {
            blurBgEl.style.backgroundImage = imgUrl ? `url('${imgUrl}')` : 'none';
        }

        // Tải ảnh sự kiện lên Modal checkout
        const modalImg = document.getElementById('modal-event-image');
        if (modalImg) {
            if (imgUrl) {
                modalImg.src = imgUrl;
                modalImg.style.display = '';
            } else {
                modalImg.removeAttribute('src');
                modalImg.style.display = 'none';
            }
        }

        // Tải chi tiết địa điểm
        if (venueInfo) {
            venueInfo.innerHTML = renderVenueInfo(event.venue || {
                venueName: event.venueName || 'Chưa cập nhật',
                address: event.address || '',
                city: event.city || ''
            });
        }

        // Tải hạng vé
        try {
            // Gọi API lấy hạng vé còn trống (Available) cho thành viên hoặc khách
            const ticketApi = window.apiClient.getToken() ?
                `/api/vtd/member/ticket-types/${eventId}/available` :
                `/api/vtd/public/ticket-types/${eventId}`;
            ticketTypes = await window.apiClient.get(ticketApi);
        } catch (ticketErr) {
            console.warn("Lỗi tải hạng vé thực tế, dùng hạng vé của sự kiện:", ticketErr);
            ticketTypes = event.ticketTypes || [];
        }
        
        // Render vào bộ chọn đặt vé bên phải
        if (ticketTypesContainer) {
            renderTicketTypesSelect(ticketTypes, ticketTypesContainer);
        }

        // Cập nhật danh sách vé đang chọn để giỏ hàng hiển thị đúng vé thực tế
        if (typeof selectedTicketQuantities !== 'undefined') {
            selectedTicketQuantities.length = 0; // Clear array
            ticketTypes.forEach(type => {
                const remaining = type.availableQuantity !== undefined ? type.availableQuantity : (type.totalQuantity - (type.soldQuantity || 0));
                selectedTicketQuantities.push({
                    id: type.ticketTypeId || type.id,
                    name: type.typeName || type.name || 'Vé sự kiện',
                    price: type.price || 0,
                    soldOut: remaining <= 0,
                    quantity: 0
                });
            });
        }

        // Render vào danh sách giá vé tĩnh bên trái
        if (ticketListStatic) {
            renderTicketListStatic(ticketTypes, ticketListStatic);
        }

        // Tải thêm dải ảnh phụ
        if (eventImagesContainer) {
            images = await loadEventImages(eventId);
            renderEventImages(images, eventImagesContainer, imgUrl);
        }

        // Render sự kiện liên quan bằng Dữ Liệu API Thực
        await renderRelatedEvents(event);

    } catch (error) {
        console.error('Lỗi lấy chi tiết sự kiện:', error);
        if (loadingMsg) loadingMsg.style.display = 'none';
        if (errorMsg) {
            errorMsg.innerText = `Không thể tải dữ liệu: ${error.message}`;
            errorMsg.classList.remove('hidden');
        }
    }
}

// Tải thêm ảnh phụ sự kiện
async function loadEventImages(eventId) {
    try {
        const images = await window.apiClient.get(`/api/vtd/public/events/${eventId}/images`);
        return Array.isArray(images) && images.length > 0 ? images : [];
    } catch (error) {
        console.warn('Không lấy được ảnh sự kiện phụ:', error);
        return [];
    }
}

// Vẽ danh sách ảnh thu nhỏ
function renderEventImages(images, container, fallbackImage) {
    if (!container) return;

    // Chỉ lấy các ảnh phụ từ bảng event_images
    const imageUrls = [];
    images.forEach(image => {
        const src = image.imageUrl || image.url;
        if (src && !imageUrls.includes(src)) {
            imageUrls.push(src);
        }
    });

    // Nếu không có ảnh phụ nào, ta dùng ảnh chính làm fallback hiển thị
    if (imageUrls.length === 0 && fallbackImage) {
        imageUrls.push(fallbackImage);
    }

    if (imageUrls.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = imageUrls.map((src, idx) => {
        return `
            <img src="${src}" 
                 alt="Thumbnail ${idx + 1}" 
                 class="detail-thumbnail-img w-16 h-12 object-cover rounded border-2 cursor-pointer transition ${idx === 0 ? 'border-brand-orange scale-102' : 'border-gray-200 hover:border-brand-orange'}" 
                 onclick="changeDetailImage('${src}', this)">
        `;
    }).join('');
}

// Đổi ảnh chính & ảnh mờ phông nền khi bấm ảnh phụ
window.changeDetailImage = function(src, thumbnailEl) {
    const mainImageEl = document.getElementById('detail-image');
    if (mainImageEl) mainImageEl.src = src;
    
    const blurBgEl = document.getElementById('detail-blur-bg');
    if (blurBgEl) blurBgEl.style.backgroundImage = `url('${src}')`;
    
    // Nổi bật ảnh phụ đang chọn
    if (thumbnailEl) {
        const thumbnails = thumbnailEl.parentElement.querySelectorAll('img');
        thumbnails.forEach(img => {
            img.className = "w-16 h-12 object-cover rounded border-2 border-gray-200 cursor-pointer hover:border-brand-orange transition";
        });
        thumbnailEl.className = "w-16 h-12 object-cover rounded border-2 border-brand-orange scale-102 transition";
    }
};

// Render chi tiết địa điểm
function renderVenueInfo(venue) {
    const name = venue.venueName || venue.name || 'Chưa cập nhật';
    const address = venue.address || venue.addressLine || 'Địa chỉ chưa rõ';
    const city = venue.city || venue.cityName || '';

    return `
        <div class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold leading-relaxed text-slate-655">
            <h4 class="text-sm font-extrabold text-slate-800 mb-1">📍 Thông Tin Địa Điểm</h4>
            <p class="font-bold text-slate-900">${name}</p>
            <p>${address}${city ? ', ' + city : ''}</p>
        </div>
    `;
}

// Render các ô chọn hạng vé bên cột phải
function renderTicketTypesSelect(ticketTypes, container) {
    if (!ticketTypes || ticketTypes.length === 0) {
        container.innerHTML = '<p class="text-xs font-bold text-red-500">Không có loại vé nào đang mở bán.</p>';
        return;
    }
    
    container.innerHTML = ticketTypes.map((type, index) => {
        const name = type.typeName || type.name || 'Vé chung';
        const price = type.price ? Number(type.price).toLocaleString('vi-VN') + ' đ' : 'Miễn phí';
        const remaining = type.availableQuantity !== undefined ? type.availableQuantity : (type.totalQuantity - (type.soldQuantity || 0));
        
        return `
            <label class="flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 text-sm font-bold ${index === 0 ? 'border-brand-orange bg-orange-50/30 text-brand-orange shadow-md' : 'border-gray-100 hover:border-brand-orange/50 hover:bg-gray-50 text-slate-700'}" onclick="highlightSelectedTicket(this)">
                <span class="flex items-center gap-3">
                    <div class="relative flex items-center justify-center w-5 h-5 rounded-full border-2 ${index === 0 ? 'border-brand-orange' : 'border-gray-300'}">
                        <div class="w-2.5 h-2.5 rounded-full bg-brand-orange ${index === 0 ? 'scale-100' : 'scale-0'} transition-transform duration-200"></div>
                        <input type="radio" name="ticketType" value="${type.ticketTypeId}" ${index === 0 ? 'checked' : ''} class="opacity-0 absolute inset-0 cursor-pointer">
                    </div>
                    <span class="font-black tracking-wide">${name}</span>
                </span>
                <span class="text-right flex flex-col">
                    <span class="text-brand-orange text-base font-black">${price}</span>
                    <span class="text-[10px] font-semibold text-slate-400">Còn ${remaining} vé</span>
                </span>
            </label>
        `;
    }).join('');
}

// Thay đổi viền nổi bật cho ô vé đang chọn
window.highlightSelectedTicket = function(labelEl) {
    if (!labelEl) return;
    const labels = labelEl.parentElement.querySelectorAll('label');
    labels.forEach(lbl => {
        lbl.className = "flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 cursor-pointer hover:border-brand-orange/50 hover:bg-gray-50 text-slate-700 text-sm font-bold transition-all duration-300";
        const circleBorder = lbl.querySelector('.w-5.h-5');
        const circleDot = lbl.querySelector('.w-2\\.5.h-2\\.5');
        if(circleBorder) {
            circleBorder.classList.remove('border-brand-orange');
            circleBorder.classList.add('border-gray-300');
        }
        if(circleDot) {
            circleDot.classList.remove('scale-100');
            circleDot.classList.add('scale-0');
        }
    });
    
    labelEl.className = "flex items-center justify-between p-4 rounded-xl border-2 border-brand-orange bg-orange-50/30 text-brand-orange shadow-md cursor-pointer transition-all duration-300 text-sm font-bold";
    const circleBorder = labelEl.querySelector('.w-5.h-5');
    const circleDot = labelEl.querySelector('.w-2\\.5.h-2\\.5');
    if(circleBorder) {
        circleBorder.classList.remove('border-gray-300');
        circleBorder.classList.add('border-brand-orange');
    }
    if(circleDot) {
        circleDot.classList.remove('scale-0');
        circleDot.classList.add('scale-100');
    }
};

window.updateTicketQty = function(change) {
    const hiddenInput = document.getElementById('ticket-qty');
    const displaySpan = document.getElementById('ticket-qty-display');
    if(hiddenInput && displaySpan) {
        let currentVal = parseInt(hiddenInput.value) || 1;
        let newVal = currentVal + change;
        if(newVal < 1) newVal = 1;
        if(newVal > 10) newVal = 10;
        hiddenInput.value = newVal;
        displaySpan.innerText = newVal;
    }
};

// Render bảng giá vé tĩnh bên cột trái
function renderTicketListStatic(ticketTypes, container) {
    if (!ticketTypes || ticketTypes.length === 0) {
        container.innerHTML = '<li class="bg-gray-50 p-4 border border-gray-200 rounded-xl text-center text-xs font-bold col-span-2">Đang cập nhật giá vé</li>';
        return;
    }

    container.innerHTML = ticketTypes.map(type => {
        const name = type.typeName || type.name || 'Vé chung';
        const price = type.price ? Number(type.price).toLocaleString('vi-VN') + ' VND' : 'Liên hệ';
        return `
            <li class="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between font-semibold text-sm">
                <span class="text-slate-800 font-extrabold">${name}</span>
                <span class="text-brand-orange font-black">${price}</span>
            </li>
        `;
    }).join('');
}

// ==========================================
// 2. MOCK DATA & RENDER RELATED EVENTS (Grid chia 4 cột)
// ==========================================
async function renderRelatedEvents(currentEvent) {
    const grid = document.getElementById('related-events-grid');
    if (!grid) return;

    try {
        // Lấy danh sách sự kiện từ Backend
        const res = await window.apiClient.get(`/api/vtd/public/events?page=0&size=10`);
        const allEvents = res.content || res || [];
        
        // Lọc bỏ sự kiện hiện tại, lấy 4 sự kiện hiển thị
        const currentEventId = currentEvent ? (currentEvent.eventId || currentEvent.id) : -1;
        const relatedEvents = allEvents.filter(e => (e.eventId || e.id) !== currentEventId).slice(0, 4);
        
        if (relatedEvents.length === 0) {
            grid.innerHTML = '<p class="text-xs text-slate-500 col-span-full">Không có sự kiện liên quan.</p>';
            return;
        }

        grid.innerHTML = relatedEvents.map(event => {
            const title = event.title || event.name || 'Sự kiện';
            const id = event.eventId || event.id;
            const imgUrl = event.bannerImageUrl || event.imageUrl || '';
            const date = event.startTime ? new Date(event.startTime).toLocaleDateString('vi-VN') : 'Sắp diễn ra';
            const imageMarkup = imgUrl
                ? `<img src="${imgUrl}" alt="${title}" class="w-full h-full object-cover group-hover:scale-102 transition" />`
                : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 text-orange-400">
                    <i class="fas fa-image text-2xl"></i>
                   </div>`;
            
            let city = 'VN';
            if (event.venue && event.venue.address) {
                const parts = event.venue.address.split(',');
                city = parts[parts.length - 1].trim().toUpperCase();
            }
            const location = event.venue ? event.venue.venueName : 'Đang cập nhật';

        return `
            <div onclick="window.location.href='nat-event-detail.html?id=${id}'" class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-150 flex flex-col hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer">
                <div class="relative h-44 overflow-hidden bg-slate-900">
                    ${imageMarkup}
                    <span class="absolute top-3 left-3 text-[10px] font-extrabold bg-brand-purple text-white px-2.5 py-1 rounded shadow">
                        ${date}
                    </span>
                    <span class="absolute top-3 right-3 text-[9px] font-extrabold bg-brand-orange text-white px-2 py-0.5 rounded shadow uppercase">
                        ${city}
                    </span>
                </div>
                <div class="p-4 flex-1 flex flex-col justify-between gap-3">
                    <h4 class="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-orange transition">
                        ${title}
                    </h4>
                    <div class="text-[11px] text-slate-500 font-medium truncate">📍 ${location}</div>
                    <div class="border-t border-gray-100 pt-2 flex items-center justify-between">
                        <span class="text-[10px] text-slate-400 uppercase font-bold">Giá từ</span>
                        <span class="text-xs font-black text-brand-orange">Xem chi tiết</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    } catch (error) {
        console.error("Lỗi lấy sự kiện liên quan:", error);
        grid.innerHTML = '<p class="text-xs text-slate-500 col-span-full">Không thể tải sự kiện liên quan.</p>';
    }
}

// ==========================================
// 3. ĐẶT VÉ SỰ KIỆN (CALL API MUA HÀNG THỰC TẾ)
// ==========================================
function setupBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    if (!bookingForm) return;

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgBox = document.getElementById('booking-msg');
        const token = window.apiClient ? window.apiClient.getToken() : null;
        const isLoggedIn = !!token;

        if (!isLoggedIn) {
            if (msgBox) {
                msgBox.className = "text-xs font-bold text-center p-3 bg-red-50 border border-red-100 rounded text-red-655";
                msgBox.innerHTML = 'Bạn cần đăng nhập trước khi đặt vé.';
            }
            setTimeout(() => {
                window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('pages/user/nat-login.html') : './nat-login.html';
            }, 1400);
            return;
        }

        const qtyInput = document.getElementById('ticket-qty');
        const qty = Number(qtyInput ? qtyInput.value : 1) || 1;
        const selectedTicketType = document.querySelector('input[name="ticketType"]:checked');
        
        if (!selectedTicketType) {
            if (msgBox) {
                msgBox.className = "text-xs font-bold text-center p-3 bg-red-50 border border-red-100 rounded text-red-655";
                msgBox.innerText = 'Vui lòng chọn loại vé.';
            }
            return;
        }

        const ticketTypeId = Number(selectedTicketType.value);
        // Lấy thông tin hạng vé để hiển thị ở trang payment
        const selectedLabel = selectedTicketType.closest('label');
        const typeName = selectedLabel ? selectedLabel.querySelector('span span').innerText : 'Vé sự kiện';
        const priceText = selectedLabel ? selectedLabel.querySelectorAll('span')[2].innerText.split('(')[0].trim() : '0';
        const unitPrice = Number(priceText.replace(/[^0-9]/g, ''));

        // 1. Đóng gói dữ liệu giỏ hàng tạm thời
        const pendingCheckout = {
            eventId: new URLSearchParams(window.location.search).get('id'),
            eventName: document.getElementById('detail-title').innerText,
            bannerImageUrl: document.getElementById('detail-image').src,
            items: [{
                ticketTypeId: ticketTypeId,
                typeName: typeName,
                quantity: qty,
                price: unitPrice,
                subtotal: unitPrice * qty
            }],
            totalQuantity: qty,
            totalAmount: unitPrice * qty,
            createdAt: new Date().toISOString()
        };

        // 2. Lưu vào sessionStorage để đảm bảo an toàn dữ liệu phiên giao dịch
        sessionStorage.setItem('checkoutData', JSON.stringify(pendingCheckout));

        // 3. Hiệu ứng chuyển hướng
        if (msgBox) {
            msgBox.className = "text-xs font-bold text-center p-3 bg-blue-50 border border-blue-100 rounded text-blue-600";
            msgBox.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang chuyển đến trang thanh toán...';
        }

        try {
            setTimeout(() => {
                window.location.href = 'nat-payment.html';
            }, 800);
        } catch (error) {
            if (msgBox) {
                msgBox.className = "text-xs font-bold text-center p-3 bg-red-50 border border-red-100 rounded text-red-655";
                msgBox.innerText = `Lỗi đặt vé: ${error.message}`;
            }
        }
    });
}

// Lấy hoặc tạo mới giỏ hàng
async function getOrCreateOrder() {
    let orderId = localStorage.getItem('currentOrderId');
    if (orderId) return orderId;

    const data = await window.apiClient.post('/api/vtd/member/orders', {});
    if (!data || !data.orderId) {
        throw new Error('Không tạo được phiên giao dịch đơn hàng.');
    }

    orderId = data.orderId;
    localStorage.setItem('currentOrderId', orderId);
    return orderId;
}

// ==========================================
// 4. HIỆN / ẨN STICKY FOOTER ON SCROLL
// ==========================================
function setupStickyFooterScroll() {
    window.addEventListener('scroll', () => {
        const footer = document.getElementById('sticky-checkout-bar');
        const bookingBox = document.getElementById('booking-block');
        if (!footer || !bookingBox) return;

        const triggerOffset = bookingBox.offsetTop + bookingBox.offsetHeight;
        if (window.scrollY > triggerOffset) {
            footer.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
            footer.classList.add('translate-y-0', 'opacity-100');
        } else {
            footer.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
            footer.classList.remove('translate-y-0', 'opacity-100');
        }
    });
}

// ==========================================
// 4b. LIÊN KẾT NÚT MUA NGAY / BUY NOW
// ==========================================
function setupBuyButtons() {
    const summaryBtn = document.getElementById('summary-buy-btn');
    const stickyBar = document.getElementById('sticky-checkout-bar');
    const bookingBox = document.getElementById('booking-block');

    if (summaryBtn && bookingBox) {
        summaryBtn.addEventListener('click', () => {
            bookingBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    if (stickyBar && bookingBox) {
        stickyBar.addEventListener('click', () => {
            bookingBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
}

// ==========================================
// 5. MODAL CART & PAYMENT LOGIC
// ==========================================

// Dữ liệu vé hiện đang được chọn trong giỏ hàng checkout
let selectedTicketQuantities = [];

// FIX: Định nghĩa hàm setupModalEvents để xử lý đóng mở Modal đặt vé
function setupModalEvents() {
    const modal = document.getElementById('booking-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    // Các nút kích hoạt modal (nếu có trong HTML)
    const triggerBtns = document.querySelectorAll('[data-trigger="booking-modal"]');

    if (!modal) return;

    const openModal = () => {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        if (typeof renderModalCart === 'function') renderModalCart();
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    
    triggerBtns.forEach(btn => btn.addEventListener('click', openModal));

    // Đóng khi click ra ngoài vùng modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// Render giỏ hàng trong Modal
function renderModalCart() {
    const container = document.getElementById('modal-cart-items');
    if (!container) return;

    container.innerHTML = selectedTicketQuantities.map(ticket => {
        const priceStr = ticket.price.toLocaleString('vi-VN') + ' VNĐ';
        
        let controlHtml = '';
        if (ticket.soldOut) {
            controlHtml = `<span class="bg-gray-200 text-slate-500 font-bold px-3 py-1 rounded text-xs">Bán hết</span>`;
        } else {
            controlHtml = `
                <div class="flex items-center border border-gray-250 rounded-lg overflow-hidden bg-white">
                    <button type="button" onclick="updateModalQty(${ticket.id}, -1)" class="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-500 font-extrabold flex items-center justify-center transition">-</button>
                    <input type="text" readonly value="${ticket.quantity}" class="w-8 text-center font-bold text-xs bg-transparent focus:outline-none" />
                    <button type="button" onclick="updateModalQty(${ticket.id}, 1)" class="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 font-extrabold flex items-center justify-center transition">+</button>
                </div>
            `;
        }

        return `
            <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-xs">
                <div class="flex flex-col gap-0.5 max-w-[200px] sm:max-w-xs">
                    <span class="font-extrabold text-slate-800 truncate">${ticket.name}</span>
                    <span class="text-slate-450 font-bold">${priceStr}</span>
                </div>
                <div>
                    ${controlHtml}
                </div>
            </div>
        `;
    }).join('');

    calculateTotal();
}

// Cập nhật số lượng vé trong Modal
window.updateModalQty = function(ticketId, delta) {
    const ticket = selectedTicketQuantities.find(t => t.id === ticketId);
    if (!ticket) return;

    ticket.quantity = Math.max(0, ticket.quantity + delta);
    renderModalCart();
};

// Tính toán tổng tiền thực tế
function calculateTotal() {
    let subtotal = 0;
    selectedTicketQuantities.forEach(t => {
        subtotal += t.price * t.quantity;
    });

    // Áp dụng giảm giá coupon
    const total = subtotal * (1 - window.activeDiscount);

    const totalEl = document.getElementById('modal-cart-total');
    if (totalEl) {
        totalEl.innerText = total.toLocaleString('vi-VN') + ' VNĐ';
    }
}

// Kiểm tra mã giảm giá
window.checkCoupon = async function() {
    const codeEl = document.getElementById('coupon-code');
    const msgEl = document.getElementById('coupon-msg');
    if (!codeEl || !msgEl) return;

    const code = codeEl.value.trim().toUpperCase();
    if (!code) {
        msgEl.className = "text-[10px] font-bold text-center mt-1 text-red-500";
        msgEl.innerText = "Vui lòng nhập mã coupon.";
        return;
    }

    try {
        msgEl.className = "text-[10px] font-bold text-center mt-1 text-blue-500";
        msgEl.innerText = "Đang kiểm tra mã...";

        // FIX: Đồng bộ với API backend đúng phương thức POST
        const response = await window.apiClient.post('/api/vtd/public/promotions/validate', { code });
        
        // Lấy % giảm giá từ DB (Giả sử mặc định là 10% nếu DB không cấu hình % giảm)
        const discountVal = response.discountValue || 10;
        msgEl.className = "text-[10px] font-bold text-center mt-1 text-emerald-500";
        msgEl.innerText = `Áp dụng thành công! Giảm giá ${discountVal}% tổng tiền vé.`;
        
        window.activeDiscount = discountVal > 1 ? discountVal / 100 : discountVal;
        calculateTotal();
    } catch (error) {
        msgEl.className = "text-[10px] font-bold text-center mt-1 text-red-500";
        // Hiển thị chính xác thông báo lỗi từ Backend (ví dụ: "Mã giảm giá đã hết lượt sử dụng")
        msgEl.innerText = error.message || "Mã coupon không tồn tại hoặc đã hết hạn.";
        window.activeDiscount = 0;
        calculateTotal();
    }
};

// Xác nhận thanh toán và chuyển tiếp dữ liệu qua nat-payment.html
window.submitModalCheckout = function() {
    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const email = document.getElementById('cust-email').value.trim();
    const idcard = document.getElementById('cust-idcard').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const terms = document.getElementById('terms-chk').checked;

    if (!name || !phone || !email || !idcard || !address) {
        alert("Vui lòng nhập đầy đủ thông tin khách hàng bắt buộc!");
        return;
    }

    if (!terms) {
        alert("Vui lòng đồng ý với các Điều khoản & Chính sách trước khi tiếp tục!");
        return;
    }

    const totalStr = document.getElementById('modal-cart-total').innerText;
    if (totalStr === '0 VNĐ') {
        alert("Giỏ hàng của bạn đang trống! Vui lòng chọn ít nhất 1 hạng vé.");
        return;
    }

    const totalAmount = Number(String(totalStr).replace(/[^\d.-]/g, '')) || 0;

    // Lấy phương thức thanh toán đang chọn
    const selectedPaymentEl = document.querySelector('input[name="payment-method"]:checked');
    const selectedPayment = selectedPaymentEl ? selectedPaymentEl.value : 'VNPAY';

    const eventName = document.getElementById('detail-title').innerText;
    const orderId = localStorage.getItem('currentOrderId') || Math.floor(100000 + Math.random() * 900000).toString();

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id') || '1';

    const items = selectedTicketQuantities
        .filter(ticket => Number(ticket.quantity || 0) > 0)
        .map(ticket => ({
            ticketTypeId: ticket.id || null,
            quantity: Number(ticket.quantity || 1),
            typeName: ticket.name || 'Vé',
            subtotal: Number(ticket.price || 0) * Number(ticket.quantity || 1)
        }));

    const checkoutData = {
        eventId: eventId,
        selectedPayment: selectedPayment,
        totalAmount: totalAmount,
        eventName: eventName,
        orderId: orderId,
        customer: {
            name: name,
            phone: phone,
            email: email,
            idcard: idcard,
            address: address
        },
        items: items.length > 0 ? items : [{
            ticketTypeId: null,
            quantity: 1,
            typeName: eventName,
            subtotal: totalAmount
        }]
    };

    localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    localStorage.setItem('pendingCheckout', JSON.stringify(checkoutData));

    document.body.classList.remove('overflow-hidden');

    alert(`🎉 Đăng ký thông tin mua vé thành công!\nHọ tên: ${name}\nTổng thanh toán: ${totalStr}\n\nHệ thống đang chuyển hướng tới cổng thanh toán an toàn...`);
    
    // Chuyển hướng
                window.location.href = './nat-payment.html';
};

// ==========================================================
// REVIEW / RATING SYSTEM - HỆ THỐNG ĐÁNH GIÁ CHỐNG SPAM
// ==========================================================

async function initializeReviewSystem() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    
    if (!eventId) return;

    // Kiểm tra điều kiện hiển thị form đánh giá
    await checkReviewEligibility(eventId);
    
    // Tải danh sách reviews
    await loadReviews(eventId);
    
    // Setup star rating interaction
    setupStarRating();
    
    // Setup form submit
    setupReviewFormSubmit(eventId);
}

// Kiểm tra điều kiện hiển thị form đánh giá
async function checkReviewEligibility(eventId) {
    const token = window.apiClient ? window.apiClient.getToken() : null;
    const formContainer = document.getElementById('review-form-container');
    const form = document.getElementById('review-form');
    const loginPrompt = document.getElementById('review-login-prompt');
    const notPurchasedPrompt = document.getElementById('review-not-purchased-prompt');
    const alreadyReviewedPrompt = document.getElementById('review-already-reviewed-prompt');

    if (!formContainer) return;

    // 1. KIỂM TRA ĐĂNG NHẬP
    if (!token) {
        loginPrompt.classList.remove('hidden');
        form.classList.add('hidden');
        return;
    }

        try {
        const eligibility = await window.apiClient.get(`/api/vtd/member/events/${eventId}/review-eligibility`);

        if (eligibility?.hasReviewed) {
            alreadyReviewedPrompt.classList.remove('hidden');
            form.classList.add('hidden');
            return;
        }

        if (!eligibility?.eligible) {
            notPurchasedPrompt.classList.remove('hidden');
            form.classList.add('hidden');
            return;
        }

        loginPrompt.classList.add('hidden');
        notPurchasedPrompt.classList.add('hidden');
        alreadyReviewedPrompt.classList.add('hidden');
        form.classList.remove('hidden');
        return;
    } catch (err) {
        console.warn("Loi kiem tra quyen danh gia tu backend, dung fallback cu:", err);
    }
// 2. KIỂM TRA QUYỀN ĐÁNH GIÁ (ĐÃ MUA VÉ CHƯA)
    let isEligible = false;
    try {
        // Sử dụng API lấy danh sách đơn hàng đã có của Backend để kiểm tra
        const ordersResponse = await window.apiClient.get('/api/vtd/member/orders');
        const orders = Array.isArray(ordersResponse) ? ordersResponse : (ordersResponse?.content || []);
        
        isEligible = orders.some(order => 
            (String(order.eventId) === String(eventId) || (order.event && String(order.event.id) === String(eventId))) && 
            (order.status === 'COMPLETED' || order.status === 'CONFIRMED' || order.status === 'PAID')
        );
    } catch (err) {
        console.warn("Lỗi kiểm tra lịch sử mua vé, tạm thời cho phép đánh giá:", err);
        isEligible = true; // Fallback cho phép đánh giá nếu API lỗi để thuận tiện test
    }

    if (!isEligible) {
        notPurchasedPrompt.classList.remove('hidden');
        form.classList.add('hidden');
        return;
    }

    // 3. KIỂM TRA TRÙNG LẶP (ĐÃ ĐÁNH GIÁ CHƯA)
    let hasReviewed = false;
    try {
        // Sử dụng API lấy tất cả bình luận của sự kiện để kiểm tra xem user đã bình luận chưa
        const reviewsResponse = await window.apiClient.get(`/api/vtd/public/events/${eventId}/reviews`);
        const reviews = Array.isArray(reviewsResponse) ? reviewsResponse : (reviewsResponse?.content || []);
        
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            const userObj = JSON.parse(storedUser);
            const currentUserId = userObj.userId || userObj.id;
            
            hasReviewed = reviews.some(r => 
                String(r.userId) === String(currentUserId) || 
                (r.user && (String(r.user.userId) === String(currentUserId) || String(r.user.id) === String(currentUserId)))
            );
        }
    } catch (err) {
        console.warn("Lỗi kiểm tra trùng lặp đánh giá:", err);
        hasReviewed = false;
    }

    if (hasReviewed) {
        alreadyReviewedPrompt.classList.remove('hidden');
        form.classList.add('hidden');
        return;
    }

    // 4. HIỂN THỊ FORM ĐÁNH GIÁ
    loginPrompt.classList.add('hidden');
    notPurchasedPrompt.classList.add('hidden');
    alreadyReviewedPrompt.classList.add('hidden');
    form.classList.remove('hidden');
}

// Setup Star Rating Interaction (1-5 sao)
function setupStarRating() {
    const starContainer = document.getElementById('star-rating');
    const ratingInput = document.getElementById('review-rating');
    const ratingDisplay = document.getElementById('rating-display');
    
    if (!starContainer) return;

    const stars = starContainer.querySelectorAll('button');
    const starLabels = ['', '1 sao ⭐', '2 sao ⭐⭐', '3 sao ⭐⭐⭐', '4 sao ⭐⭐⭐⭐', '5 sao ⭐⭐⭐⭐⭐'];

    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            e.preventDefault();
            const rating = star.dataset.rating;
            ratingInput.value = rating;
            
            // Cập nhật hiển thị sao
            stars.forEach((s, idx) => {
                if (idx < rating) {
                    s.classList.remove('text-gray-300');
                    s.classList.add('text-yellow-400');
                } else {
                    s.classList.add('text-gray-300');
                    s.classList.remove('text-yellow-400');
                }
            });

            // Cập nhật text
            if (ratingDisplay) {
                ratingDisplay.innerText = `Bạn xếp hạng: ${starLabels[rating]}`;
            }
        });

        // Hover effect
        star.addEventListener('mouseover', () => {
            const rating = star.dataset.rating;
            stars.forEach((s, idx) => {
                if (idx < rating) {
                    s.classList.remove('text-gray-300');
                    s.classList.add('text-yellow-300');
                } else {
                    s.classList.add('text-gray-300');
                    s.classList.remove('text-yellow-300');
                }
            });
        });
    });

    starContainer.addEventListener('mouseleave', () => {
        const currentRating = ratingInput.value;
        stars.forEach((s, idx) => {
            if (idx < currentRating) {
                s.classList.remove('text-gray-300');
                s.classList.add('text-yellow-400');
            } else {
                s.classList.add('text-gray-300');
                s.classList.remove('text-yellow-400');
            }
        });
    });
}

// Setup Form Submit
function setupReviewFormSubmit(eventId) {
    const form = document.getElementById('review-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rating = document.getElementById('review-rating').value;
        const content = document.getElementById('review-content').value.trim();

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            alert('Vui lòng chọn xếp hạng từ 1 đến 5 sao.');
            return;
        }

        if (content.length < 10) {
            alert('Nhận xét phải có ít nhất 10 ký tự.');
            return;
        }

        if (content.length > 500) {
            alert('Nhận xét không vượt quá 500 ký tự.');
            return;
        }

        // Submit
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang gửi...';
        submitBtn.disabled = true;

        try {
            let response;
            const currentUser = getCurrentUserInfo();
            const currentEventTitle = getCurrentEventTitle();
            const reviewPayload = {
                rating: parseInt(rating),
                comment: content,
                userId: currentUser?.userId || currentUser?.id || '',
                userName: currentUser?.fullName || currentUser?.userName || 'Bạn',
                eventId,
                eventTitle: currentEventTitle
            };

            if (currentEditReviewId) {
                // Sửa đánh giá (PUT)
                response = await window.apiClient.put(`/api/vtd/member/reviews/${currentEditReviewId}`, {
                    rating: parseInt(rating),
                    comment: content
                });
                reviewPayload.reviewId = currentEditReviewId;
                upsertCachedReview(response || reviewPayload, {
                    reviewId: currentEditReviewId,
                    eventId,
                    eventTitle: currentEventTitle,
                    userId: currentUser?.userId || currentUser?.id || '',
                    userName: currentUser?.fullName || currentUser?.userName || 'Bạn',
                    rating: parseInt(rating),
                    comment: content
                });
            } else {
                // Đánh giá mới (POST)
                response = await window.apiClient.post(`/api/vtd/member/events/${eventId}/reviews`, {
                    rating: parseInt(rating),
                    comment: content
                });
                reviewPayload.reviewId = response?.reviewId || response?.id || `${eventId}-${Date.now()}`;
                upsertCachedReview(response || reviewPayload, reviewPayload);
            }

            if (response) {
                const wasEditing = Boolean(currentEditReviewId);

                if (wasEditing) {
                    alert('Cập nhật đánh giá thành công!');
                } else {
                    alert('🎉 Cảm ơn bạn! Đánh giá của bạn đã được gửi thành công.');
                }

                // Reset form
                form.reset();
                document.getElementById('review-rating').value = 5;
                document.getElementById('rating-display').innerText = 'Bạn xếp hạng: 5 sao ⭐⭐⭐⭐⭐';

                // Khôi phục nút submit
                submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Gửi đánh giá';
                currentEditReviewId = null;

                // Reload reviews
                await loadReviews(eventId);

                // Hide form & show "already reviewed" message (chỉ ẩn khi viết mới, nếu sửa thì ko cần ẩn, 
                // nhưng backend chỉ cho 1 user/1 review nên ẩn luôn cũng hợp lý)
                if (!wasEditing) {
                    form.classList.add('hidden');
                    document.getElementById('review-already-reviewed-prompt').classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Lỗi gửi đánh giá:', error);
            alert('Lỗi: ' + (error.message || 'Không thể gửi đánh giá. Vui lòng thử lại.'));
        } finally {
            if (!currentEditReviewId && !form.classList.contains('hidden')) {
                submitBtn.innerHTML = originalText;
            }
            submitBtn.disabled = false;
        }
    });
}

// Tải danh sách reviews từ Backend
async function loadReviews(eventId) {
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return;

    // FIX: Hiển thị trạng thái đang tải trước khi gọi API
    reviewsList.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-brand-orange mr-2"></i>Đang tải bình luận...</div>';

    try {
        // Gọi song song: danh sách reviews + điểm TB chính thức từ Backend
        const [response, avgResponse] = await Promise.allSettled([
            window.apiClient.get(`/api/vtd/public/events/${eventId}/reviews`),
            window.apiClient.get(`/api/vtd/public/events/${eventId}/reviews/average`)
        ]);
        
        // FIX: Xử lý trường hợp Backend trả về Page object (có content) hoặc Array trực tiếp
        const reviewsData = response.status === 'fulfilled' ? response.value : [];
        const data = Array.isArray(reviewsData) ? reviewsData : (reviewsData?.content || []);
        
        // Lấy điểm TB từ Backend (ưu tiên) hoặc tính client-side (fallback)
        let backendAvg = null;
        if (avgResponse.status === 'fulfilled' && avgResponse.value != null) {
            // Backend có thể trả về số trực tiếp hoặc object { averageRating: ... }
            const avgVal = avgResponse.value;
            backendAvg = typeof avgVal === 'number' ? avgVal : (avgVal?.averageRating ?? avgVal?.average ?? null);
        }
        
        calculateAndRenderReviewStats(data, backendAvg); // Truyền điểm TB từ Backend
        renderReviews(data);           
    } catch (err) {
        console.warn('Lỗi tải danh sách reviews:', err);
        reviewsList.innerHTML = '<div class="text-center py-4 text-slate-400"><p>Không thể tải đánh giá lúc này.</p></div>';
    }
}

// ==========================================================
// FIX: HÀM TÍNH TOÁN THỐNG KÊ ĐỘNG (DYNAMIC STATISTICS)
// backendAvg: điểm TB chính thức từ API (ưu tiên), null = tự tính client-side
// ==========================================================
function calculateAndRenderReviewStats(reviews, backendAvg) {
    const data = Array.isArray(reviews) ? reviews : [];
    const total = data.length;
    
    const avgDisplay = document.getElementById('avg-rating');
    const totalDisplay = document.getElementById('total-reviews-count');

    // Nếu chưa có review nào, đưa về trạng thái 0
    if (total === 0 && backendAvg == null) {
        if (avgDisplay) avgDisplay.innerText = "0.0";
        if (totalDisplay) totalDisplay.innerText = "Chưa có lượt đánh giá";
        [1, 2, 3, 4, 5].forEach(s => {
            const bar = document.getElementById(`star-${s}-bar`);
            const countTxt = document.getElementById(`star-${s}-count`);
            if (bar) bar.style.width = '0%';
            if (countTxt) countTxt.innerText = '0';
        });
        return;
    }

    // 1. Điểm trung bình: ưu tiên Backend, fallback tự tính
    let average;
    if (backendAvg != null && !isNaN(Number(backendAvg))) {
        average = Number(backendAvg).toFixed(1);
    } else {
        const sum = data.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        average = total > 0 ? (sum / total).toFixed(1) : "0.0";
    }
    
    // 2. Đếm phân bổ số lượng từng loại sao (luôn tính client-side)
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    data.forEach(r => {
        const star = Math.round(Number(r.rating) || 5);
        if (distribution[star] !== undefined) distribution[star]++;
    });

    // 3. Cập nhật giao diện chính
    if (avgDisplay) avgDisplay.innerText = average;
    if (totalDisplay) totalDisplay.innerText = `Dựa trên ${total} lượt đánh giá`;

    // 4. Cập nhật các thanh Progress Bar và con số chi tiết
    const starsOrder = [5, 4, 3, 2, 1];
    starsOrder.forEach((star) => {
        const count = distribution[star];
        const percent = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
        
        const bar = document.getElementById(`star-${star}-bar`);
        const label = document.getElementById(`star-${star}-count`);
        
        if (bar) bar.style.width = percent + '%';
        if (label) label.innerText = count;
    });
}

// Render danh sách reviews
function renderReviews(reviews) {
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return;

    const data = Array.isArray(reviews) ? reviews : [];
    
    // Lấy thông tin current user để hiển thị nút sửa/xóa
    let currentUserId = null;
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            const userObj = JSON.parse(storedUser);
            currentUserId = userObj.userId || userObj.id;
        } catch (e) {}
    }
    
    // FIX: Luôn dọn dẹp container trước khi render để tránh lặp nội dung hoặc kẹt loading
    reviewsList.innerHTML = '';

    if (data.length === 0) {
        reviewsList.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <i class="fas fa-comments text-3xl mb-2 block opacity-50"></i>
                <p class="text-sm font-semibold">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
            </div>
        `;
        return;
    }

    reviewsList.innerHTML = data.map(review => {
        // FIX: Mapping chính xác tên từ Database. Kiểm tra cả trường phẳng và đối tượng lồng (nested user object)
        const name = review.fullName || 
                     (review.user && review.user.fullName) || 
                     review.userName || 
                     (review.user && review.user.userName) || 
                     'Người dùng ẩn danh';

        // FIX: Lấy ảnh đại diện từ database nếu có, nếu không thì dùng UI Avatars dựa trên tên thật
        const avatar = review.userAvatar || 
                       (review.user && review.user.avatarUrl) || 
                       `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f26f21&color=fff`;

        const rating = Number(review.rating) || 5;
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : 'Vừa qua';
        const commentText = review.comment || review.content || 'Khách hàng không để lại nhận xét.';

        // Hiển thị nút Sửa/Xóa nếu là chủ sở hữu
        const reviewUserId = review.user ? (review.user.userId || review.user.id) : review.userId;
        const isOwner = currentUserId && String(reviewUserId) === String(currentUserId);
        
        let actionsHtml = '';
        if (isOwner) {
            // Encode nội dung review để tránh lỗi dấu nháy
            const safeComment = commentText.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            actionsHtml = `
                <div class="flex items-center gap-3">
                    <button type="button" onclick="editReview(${review.reviewId || review.id}, ${rating}, '${safeComment}')" class="text-xs font-semibold text-brand-purple hover:text-purple-700 transition">
                        <i class="fas fa-edit mr-1"></i> Sửa
                    </button>
                    <button type="button" onclick="deleteReview(${review.reviewId || review.id})" class="text-xs font-semibold text-red-500 hover:text-red-700 transition">
                        <i class="fas fa-trash-alt mr-1"></i> Xóa
                    </button>
                </div>
            `;
        }

        return `
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-150 hover:border-brand-orange hover:shadow-md transition">
                <div class="flex items-start gap-3">
                    <img src="${avatar}" alt="${review.userName}" class="w-10 h-10 rounded-full object-cover" />
                    <div class="flex-1">
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <div class="flex items-center gap-2">
                                <h4 class="text-sm font-extrabold text-slate-800">${name}</h4>
                                <span class="text-[10px] text-slate-400 font-medium">${date}</span>
                            </div>
                            ${actionsHtml}
                        </div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-yellow-400 font-bold text-sm tracking-widest">${stars}</span>
                            <span class="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-sm">${rating}/5</span>
                        </div>
                        <p class="text-sm text-slate-700 leading-relaxed font-medium">${commentText}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Logic Sửa Đánh giá
let currentEditReviewId = null;

window.editReview = function(reviewId, currentRating, currentComment) {
    const form = document.getElementById('review-form');
    if (!form) return;
    
    // Đẩy thông tin lên form
    const commentInput = document.getElementById('review-content');
    if (commentInput) commentInput.value = currentComment;
    
    // Đánh dấu số sao
    const stars = document.querySelectorAll('#star-rating button');
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-rating'));
        if (val <= currentRating) {
            star.classList.remove('text-gray-300');
            star.classList.add('text-yellow-400');
        } else {
            star.classList.remove('text-yellow-400');
            star.classList.add('text-gray-300');
        }
    });
    
    const ratingInput = document.getElementById('review-rating');
    if (ratingInput) ratingInput.value = currentRating;
    
    // Đổi chữ nút Submit và lưu ID đang sửa
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Cập nhật đánh giá';
    }
    
    currentEditReviewId = reviewId;
    
    // Cuộn lên form
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// Logic Xóa Đánh giá
window.deleteReview = async function(reviewId) {
    if (!confirm('Bạn có chắc chắn muốn xóa đánh giá này không?')) return;

    try {
        await window.apiClient.delete(`/api/vtd/member/reviews/${reviewId}`);
        removeCachedReview(reviewId);
        alert('Đã xóa đánh giá thành công!');

        // Reload reviews
        const eventId = new URLSearchParams(window.location.search).get('id');
        if (eventId) {
            await loadReviews(eventId);
        }
    } catch (error) {
        console.error('Lỗi khi xóa đánh giá:', error);
        alert('Không thể xóa đánh giá. ' + (error.message || 'Vui lòng thử lại.'));
    }
};
