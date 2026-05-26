document.addEventListener('DOMContentLoaded', () => {
    window.pageUtils.loadHeader();
    loadEventDetails();
    setupBookingForm();
    setupReviewForm();
});

let currentEventId = null;

async function loadEventDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id') || urlParams.get('eventId');
    currentEventId = eventId;

    const loadingMsg = document.getElementById('loading-msg');
    const errorMsg = document.getElementById('error-msg');
    const eventContent = document.getElementById('event-content');
    const ticketTypesContainer = document.getElementById('ticket-types');
    const eventImagesContainer = document.getElementById('detail-images');
    const venueInfo = document.getElementById('detail-venue-info');

    if (!eventId) {
        loadingMsg.style.display = 'none';
        errorMsg.innerText = 'Khong tim thay ma su kien.';
        errorMsg.style.display = 'block';
        return;
    }

    try {
        const event = await window.apiClient.get(`/api/vtd/public/events/${eventId}`);
        loadingMsg.style.display = 'none';
        eventContent.style.display = 'flex';

        setText('detail-title', event.title || 'Su kien khong ten');
        setText('detail-venue', event.venue?.venueName || event.venueName || 'Chua cap nhat');
        setText('detail-desc', event.description || 'Chua co thong tin mo ta chi tiet.');
        setText('detail-date', formatDateTime(event.startTime));

        const imgUrl = resolveImageUrl(event.bannerImageUrl);
        const imgEl = document.getElementById('detail-image');
        if (imgEl) imgEl.src = imgUrl;

        setText('detail-price', event.minPrice ? formatCurrency(event.minPrice) : 'Xem hang ve');

        if (venueInfo) venueInfo.innerHTML = renderVenueInfo(event.venue || {});

        const ticketApi = window.apiClient.getToken()
            ? `/api/vtd/member/ticket-types/${eventId}/available`
            : `/api/vtd/public/ticket-types/${eventId}`;
        const ticketTypes = await window.apiClient.get(ticketApi);
        if (ticketTypesContainer) renderTicketTypes(ticketTypes, ticketTypesContainer);

        if (eventImagesContainer) {
            const images = await loadEventImages(eventId);
            renderEventImages(images, eventImagesContainer, imgUrl);
        }

        await loadReviews(eventId);
    } catch (error) {
        console.error('Loi lay chi tiet su kien:', error);
        loadingMsg.style.display = 'none';
        errorMsg.innerText = `Khong the tai du lieu: ${error.message}`;
        errorMsg.style.display = 'block';
    }
}

async function loadEventImages(eventId) {
    try {
        const images = await window.apiClient.get(`/api/vtd/public/events/${eventId}/images`);
        return Array.isArray(images) ? images : [];
    } catch (error) {
        console.warn('Khong lay duoc anh su kien:', error);
        return [];
    }
}

function renderEventImages(images, container, fallbackImage) {
    if (!container) return;
    if (!images || images.length === 0) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = images.map(image => {
        const src = resolveImageUrl(image.imageUrl || image.url || fallbackImage);
        return `<img src="${src}" alt="Event Image" style="width:100%; border-radius:8px; margin-bottom:18px; object-fit:cover; max-height:320px;">`;
    }).join('');
}

function renderVenueInfo(venue) {
    const name = venue.venueName || venue.name || 'Chua cap nhat';
    const address = venue.address || venue.addressLine || 'Dia chi chua ro';
    const capacity = venue.capacity ? `${venue.capacity} nguoi` : 'Chua cap nhat';
    return `
        <div style="margin-bottom:18px; padding:14px; background:#fff; border-radius:8px; border:1px solid #ddd;">
            <h4 style="margin:0 0 8px;">Thong tin dia diem</h4>
            <p style="margin:0 0 5px;"><strong>${escapeHtml(name)}</strong></p>
            <p style="margin:0 0 5px; color:#555;">${escapeHtml(address)}</p>
            <p style="margin:0; color:#555;">Suc chua: ${escapeHtml(capacity)}</p>
        </div>
    `;
}

function renderTicketTypes(ticketTypes, container) {
    if (!ticketTypes || ticketTypes.length === 0) {
        container.innerHTML = '<p>Khong co hang ve nao dang mo ban.</p>';
        return;
    }

    container.innerHTML = ticketTypes.map((type, index) => {
        const remaining = Number(type.totalQuantity || 0) - Number(type.soldQuantity || 0);
        return `
            <label class="ticket-type-option" style="display:block; border:1px solid #ddd; padding:12px; border-radius:8px; margin-bottom:12px; cursor:pointer;">
                <input type="radio" name="ticketType" value="${type.ticketTypeId}" style="margin-right:10px;" ${index === 0 ? 'checked' : ''}>
                <strong>${escapeHtml(type.typeName || 'Ve chung')}</strong> - ${formatCurrency(type.price)} - Con lai: ${remaining}
            </label>
        `;
    }).join('');
}

function setupBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    if (!bookingForm) return;

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgBox = document.getElementById('booking-msg');
        const isLoggedIn = Boolean(window.apiClient?.getToken() || localStorage.getItem('currentUser'));

        if (!isLoggedIn) {
            msgBox.innerHTML = '<span style="color:red;">Ban can dang nhap truoc khi dat ve.</span>';
            setTimeout(() => window.location.href = window.pageUtils.resolveUrl('/pages/user/login.html'), 1200);
            return;
        }

        const qty = Math.max(1, Number(document.getElementById('ticket-qty')?.value || 1));
        const selectedTicketType = document.querySelector('input[name="ticketType"]:checked');
        if (!selectedTicketType) {
            msgBox.innerHTML = '<span style="color:red;">Vui long chon loai ve.</span>';
            return;
        }

        try {
            msgBox.innerHTML = '<span style="color:blue;">Dang them vao gio hang...</span>';
            const orderId = await getOrCreateOrder();
            await window.apiClient.post(`/api/vtd/member/orders/${orderId}/items`, {
                ticketTypeId: Number(selectedTicketType.value),
                quantity: qty
            });
            msgBox.innerHTML = `<span style="color:green;">Da them ${qty} ve vao gio hang. <a href="${window.pageUtils.resolveUrl('/pages/user/cart.html')}" style="color:#007bff;">Xem gio hang</a></span>`;
        } catch (error) {
            msgBox.innerHTML = `<span style="color:red;">Loi khi dat ve: ${error.message}</span>`;
        }
    });
}

async function getOrCreateOrder() {
    let orderId = localStorage.getItem('currentOrderId');
    if (orderId) return orderId;

    const data = await window.apiClient.post('/api/vtd/member/orders', {});
    if (!data?.orderId) throw new Error('Khong the tao don hang.');
    orderId = data.orderId;
    localStorage.setItem('currentOrderId', orderId);
    return orderId;
}

function setupReviewForm() {
    const form = document.getElementById('review-form');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const msg = document.getElementById('review-form-msg');
        try {
            msg.style.color = 'blue';
            msg.textContent = 'Dang gui danh gia...';
            await window.apiClient.post(`/api/vtd/member/events/${currentEventId}/reviews`, {
                rating: Number(document.getElementById('review-rating').value),
                comment: document.getElementById('review-comment').value.trim()
            });
            msg.style.color = 'green';
            msg.textContent = 'Da gui danh gia.';
            form.reset();
            await loadReviews(currentEventId);
        } catch (error) {
            msg.style.color = 'red';
            msg.textContent = error.message;
        }
    });
}

async function loadReviews(eventId) {
    const section = document.getElementById('event-reviews-section');
    const list = document.getElementById('reviews-list');
    const form = document.getElementById('review-form');
    if (!section || !list) return;

    section.style.display = 'flex';
    if (form && window.apiClient.getToken()) form.style.display = 'block';

    try {
        const [reviews, avg] = await Promise.all([
            window.apiClient.get(`/api/vtd/public/events/${eventId}/reviews`),
            window.apiClient.get(`/api/vtd/public/events/${eventId}/reviews/average`)
        ]);
        setText('review-average', `Diem trung binh: ${Number(avg.averageRating || 0).toFixed(1)}/5`);
        renderReviews(reviews || []);
    } catch (error) {
        list.innerHTML = `<div style="color:red;">Khong the tai danh gia: ${escapeHtml(error.message)}</div>`;
    }
}

function renderReviews(reviews) {
    const list = document.getElementById('reviews-list');
    const currentUser = getCurrentUser();
    if (!reviews.length) {
        list.innerHTML = '<div style="padding:16px; color:#666;">Chua co danh gia nao.</div>';
        return;
    }

    list.innerHTML = reviews.map(review => {
        const ownerId = review.user?.userId;
        const canEdit = currentUser?.userId && ownerId === currentUser.userId;
        return `
            <div style="background:#fff; border:1px solid #ddd; border-radius:8px; padding:14px; margin-bottom:12px;">
                <div><strong>${renderStars(review.rating || 0)}</strong></div>
                <p style="margin:8px 0;">${escapeHtml(review.comment || 'Khong co binh luan')}</p>
                <small style="color:#666;">${escapeHtml(review.user?.fullName || 'Thanh vien')} - ${formatDateTime(review.createdAt)}</small>
                ${canEdit ? `
                    <div style="margin-top:10px; display:flex; gap:8px;">
                        <button type="button" onclick="editReview(${review.reviewId}, ${review.rating || 5}, '${escapeJs(review.comment || '')}')" class="btn-book" style="width:auto; font-size:13px; padding:8px 12px;">Sua</button>
                        <button type="button" onclick="deleteReview(${review.reviewId})" class="btn-book" style="width:auto; font-size:13px; padding:8px 12px; background:#dc3545;">Xoa</button>
                    </div>` : ''}
            </div>
        `;
    }).join('');
}

async function editReview(reviewId, rating, comment) {
    const newComment = prompt('Cap nhat binh luan:', comment);
    if (newComment === null) return;
    const newRating = Number(prompt('So sao (1-5):', rating));
    if (!newRating || newRating < 1 || newRating > 5) return alert('Rating khong hop le.');
    await window.apiClient.put(`/api/vtd/member/reviews/${reviewId}`, { rating: newRating, comment: newComment });
    await loadReviews(currentEventId);
}

async function deleteReview(reviewId) {
    if (!confirm('Xoa danh gia nay?')) return;
    await window.apiClient.delete(`/api/vtd/member/reviews/${reviewId}`);
    await loadReviews(currentEventId);
}

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function resolveImageUrl(value) {
    if (!value) return 'https://via.placeholder.com/800x450?text=Event';
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;
    return window.pageUtils.resolveUrl(`/assets/images/${value}`);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount || 0));
}

function formatDateTime(value) {
    if (!value) return 'Dang cap nhat';
    return new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderStars(count) {
    return '<span style="color:#f39c12;">' + Array.from({ length: 5 }, (_, i) => i < count ? '★' : '☆').join('') + '</span>';
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeJs(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
