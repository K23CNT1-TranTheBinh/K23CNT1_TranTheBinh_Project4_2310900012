document.addEventListener('DOMContentLoaded', async () => {
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }
    if (window.pageUtils && typeof window.pageUtils.loadFooter === 'function') {
        window.pageUtils.loadFooter();
    }
    attachModalEvents();
    await renderReviews();
});

const REVIEW_CACHE_KEY = 'bdht_review_cache';

const reviewState = {
    data: [],
    editingId: null,
};

function getCurrentUser() {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
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

function getCachedReviewsForCurrentUser() {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];

    const userId = String(currentUser.userId || currentUser.id || '');
    if (!userId) return [];

    return getReviewCache()
        .filter(item => String(item.userId || '') === userId)
        .map(item => ({
            reviewId: String(item.reviewId || item.id || ''),
            eventId: String(item.eventId || ''),
            eventTitle: item.eventTitle || 'Sự kiện',
            rating: Number(item.rating || 0),
            comment: item.comment || item.content || '',
            updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
            userId,
            userName: item.userName || currentUser.fullName || 'Bạn'
        }))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function buildReviewDetailUrl(eventId) {
    if (!eventId) return '#';
    if (window.pageUtils && typeof window.pageUtils.resolveUrl === 'function') {
        return window.pageUtils.resolveUrl(`pages/user/event-detail.html?id=${encodeURIComponent(eventId)}`);
    }
    return `event-detail.html?id=${encodeURIComponent(eventId)}`;
}

async function renderReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state">Vui lòng đăng nhập để xem đánh giá của bạn.</div>';
        return;
    }

    reviewState.data = getCachedReviewsForCurrentUser();
    reviewState.editingId = null;

    if (!reviewState.data.length) {
        container.innerHTML = '<div class="empty-state">Bạn chưa gửi đánh giá nào. Hãy vào trang chi tiết sự kiện để thêm đánh giá đầu tiên.</div>';
        return;
    }

    renderReviewItems();
}

function renderReviewItems() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    if (!reviewState.data || reviewState.data.length === 0) {
        container.innerHTML = '<div class="empty-state">Bạn chưa gửi đánh giá nào.</div>';
        return;
    }

    container.innerHTML = reviewState.data
        .map(review => renderReviewCard(review, reviewState.editingId === getReviewId(review)))
        .join('');

    container.onclick = handleReviewContainerClick;
}

function handleReviewContainerClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const reviewId = button.dataset.reviewId;
    if (!reviewId) return;

    const action = button.dataset.action;
    switch (action) {
        case 'edit':
            openReviewEditor(reviewId);
            break;
        case 'cancel':
            cancelReviewEdit();
            break;
        case 'save':
            saveReviewEdit(reviewId);
            break;
        case 'delete':
            openConfirmModal({
                title: 'Xác nhận xóa đánh giá',
                message: 'Bạn có chắc muốn xóa đánh giá này không?',
                confirmText: 'Xóa',
                onConfirm: () => deleteReview(reviewId)
            });
            break;
        case 'view-event':
            openEventDetailModal(reviewId);
            break;
    }
}

function renderReviewCard(review, isEditing) {
    return isEditing ? renderReviewEditCard(review) : renderReviewDisplayCard(review);
}

function renderReviewDisplayCard(review) {
    const reviewId = getReviewId(review);
    const rating = review.rating || 0;
    const eventName = review.eventTitle || 'Sự kiện chưa xác định';
    const comment = review.comment || 'Không có nhận xét.';
    const updatedAt = review.updatedAt ? new Date(review.updatedAt).toLocaleString('vi-VN') : 'Không rõ';

    return `
        <div class="review-card">
            <h3>${escapeHtml(eventName)}</h3>
            <p class="review-meta"><strong>Mã đánh giá:</strong> ${escapeHtml(reviewId)}</p>
            <p class="review-meta"><strong>Đánh giá:</strong> ${renderStars(rating)} <span>(${rating}/5)</span></p>
            <p class="review-comment"><strong>Bình luận:</strong> ${escapeHtml(comment)}</p>
            <p class="review-meta"><strong>Cập nhật gần nhất:</strong> ${updatedAt}</p>
            <div class="review-actions">
                <button type="button" class="btn" data-action="edit" data-review-id="${escapeHtml(reviewId)}">Chỉnh sửa</button>
                <button type="button" class="btn btn-secondary" data-action="view-event" data-review-id="${escapeHtml(reviewId)}">Xem chi tiết sự kiện</button>
                <button type="button" class="btn btn-danger" data-action="delete" data-review-id="${escapeHtml(reviewId)}">Xóa</button>
            </div>
        </div>
    `;
}

function renderReviewEditCard(review) {
    const reviewId = getReviewId(review);
    const reviewKey = sanitizeId(reviewId);
    const rating = review.rating || 0;
    const comment = review.comment || '';
    const eventName = review.eventTitle || 'Sự kiện chưa xác định';

    return `
        <div class="review-card">
            <h3>${escapeHtml(eventName)}</h3>
            <div class="review-rating">
                <label for="review-rating-${reviewKey}">Đánh giá</label>
                <select id="review-rating-${reviewKey}">
                    ${[1, 2, 3, 4, 5].map(value => `<option value="${value}" ${value === rating ? 'selected' : ''}>${value} sao</option>`).join('')}
                </select>
            </div>
            <label for="review-comment-${reviewKey}">Bình luận</label>
            <textarea id="review-comment-${reviewKey}" class="review-input">${escapeHtml(comment)}</textarea>
            <div class="review-actions">
                <button type="button" class="btn" data-action="save" data-review-id="${escapeHtml(reviewId)}">Lưu</button>
                <button type="button" class="btn btn-secondary" data-action="cancel" data-review-id="${escapeHtml(reviewId)}">Hủy</button>
                <button type="button" class="btn btn-danger" data-action="delete" data-review-id="${escapeHtml(reviewId)}">Xóa</button>
            </div>
        </div>
    `;
}

function getReviewId(review) {
    return String(review.reviewId || review.id || review.reviewID || review._id || '');
}

async function openReviewEditor(reviewId) {
    reviewState.editingId = reviewId;
    renderReviewItems();
}

function cancelReviewEdit() {
    reviewState.editingId = null;
    renderReviewItems();
}

async function saveReviewEdit(reviewId) {
    const reviewKey = sanitizeId(reviewId);
    const ratingField = document.getElementById(`review-rating-${reviewKey}`);
    const commentField = document.getElementById(`review-comment-${reviewKey}`);

    if (!ratingField || !commentField) return;

    const rating = Number(ratingField.value);
    const comment = commentField.value.trim();

    try {
        await window.apiClient.put(`/api/vtd/member/reviews/${encodeURIComponent(reviewId)}`, {
            rating,
            comment,
        });

        const items = getReviewCache().map(item => String(item.reviewId || item.id || '') === String(reviewId)
            ? { ...item, rating, comment, updatedAt: new Date().toISOString() }
            : item
        );
        saveReviewCache(items);
        await renderReviews();
    } catch (error) {
        console.error('Lỗi lưu đánh giá:', error);
        alert(getReviewErrorMessage(error));
    }
}

function openEventDetailModal(reviewId) {
    const review = reviewState.data.find(item => getReviewId(item) === reviewId);
    if (!review) return;

    const body = `
        <h3>${escapeHtml(review.eventTitle || 'Sự kiện chưa xác định')}</h3>
        <p>${escapeHtml(review.comment || 'Không có nhận xét.')}</p>
    `;

    const actions = [
        {
            text: 'Chỉnh sửa ngay',
            action: () => {
                closeModal();
                openReviewEditor(reviewId);
            },
            className: 'btn'
        },
        {
            text: 'Mở trang chi tiết',
            action: () => window.open(buildReviewDetailUrl(review.eventId), '_blank')
        },
        { text: 'Đóng', action: closeModal, className: 'btn-secondary' }
    ];

    showModal('Chi tiết sự kiện', body, actions);
}

function openConfirmModal({ title, message, confirmText, onConfirm }) {
    const body = `<p>${escapeHtml(message)}</p>`;
    const actions = [
        { text: confirmText, action: () => { onConfirm(); closeModal(); }, className: 'btn btn-danger' },
        { text: 'Hủy', action: closeModal, className: 'btn-secondary' }
    ];
    showModal(title, body, actions);
}

function showModal(title, bodyHtml, actions = []) {
    const overlay = document.getElementById('modal-overlay');
    const modalBody = document.getElementById('modal-body');
    const modalActions = document.getElementById('modal-actions');

    if (!overlay || !modalBody || !modalActions) return;

    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    modalBody.innerHTML = `<h2>${escapeHtml(title)}</h2>${bodyHtml}`;
    modalActions.innerHTML = actions.map((button, index) => `
        <button type="button" class="${button.className || 'btn'}" data-modal-action="${index}">${escapeHtml(button.text)}</button>
    `).join('');

    const modalButtons = modalActions.querySelectorAll('button[data-modal-action]');
    modalButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            actions[index].action();
        });
    });
}

function attachModalEvents() {
    const overlay = document.getElementById('modal-overlay');
    const closeButton = document.getElementById('modal-close');

    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    if (overlay) {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeModal();
            }
        });
    }
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
}

async function deleteReview(reviewId) {
    try {
        await window.apiClient.delete(`/api/vtd/member/reviews/${encodeURIComponent(reviewId)}`);
        saveReviewCache(getReviewCache().filter(item => String(item.reviewId || item.id || '') !== String(reviewId)));
        await renderReviews();
    } catch (error) {
        console.error('Lỗi xóa đánh giá:', error);
        alert(getReviewErrorMessage(error));
    }
}

function renderStars(count) {
    const stars = Array.from({ length: 5 }, (_, index) => (index < count ? '★' : '☆'));
    return `<span style="color:#f39c12;">${stars.join('')}</span>`;
}

function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/[&<>"']/g, (char) => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char];
    });
}

function sanitizeId(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getReviewErrorMessage(error) {
    if (!error || !error.message) {
        return 'Không thể kết nối đến API đánh giá.';
    }
    if (/404|Not Found/i.test(error.message)) {
        return 'API đánh giá chưa được backend cung cấp. Vui lòng thử lại sau khi backend cập nhật.';
    }
    if (/405|Method Not Allowed/i.test(error.message)) {
        return 'Backend chưa hỗ trợ chỉnh sửa/xóa đánh giá. Vui lòng cập nhật backend để sử dụng tính năng này.';
    }
    if (/401|Unauthorized/i.test(error.message)) {
        return 'Bạn cần đăng nhập để xem đánh giá.';
    }
    return `Không thể xử lý yêu cầu: ${error.message}`;
}