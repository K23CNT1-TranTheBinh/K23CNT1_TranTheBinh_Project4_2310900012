/**
 * ----------------------------------------------------------------------------
 *  HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT
 * Tệp tin: reviews.js
 * Chức năng: Quản lý lịch sử và biểu mẫu Đánh giá/Nhận xét sự kiện của người dùng
 * Người thực hiện: Sinh viên Nguyễn Anh Tuấn
 * Vai trò: Nạp danh sách nhận xét, kiểm tra quyền chỉnh sửa, gửi yêu cầu chỉnh sửa/xóa đánh giá
 * ----------------------------------------------------------------------------
 */

// Lắng nghe sự kiện trang web tải xong toàn bộ cấu trúc giao diện DOM
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Tải Header dùng chung bằng cơ chế nạp động
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }
    // 2. Tải Footer dùng chung bằng cơ chế nạp động
    if (window.pageUtils && typeof window.pageUtils.loadFooter === 'function') {
        window.pageUtils.loadFooter();
    }

    // 3. Liên kết sự kiện cho các hộp thoại Popup Modal
    attachModalEvents();

    // 4. Lấy dữ liệu và hiển thị danh sách đánh giá của tài khoản lên màn hình
    await renderReviews();
});

// Khóa lưu trữ cache đánh giá cục bộ
const REVIEW_CACHE_KEY = 'bdht_review_cache';

// Đối tượng quản lý trạng thái của trang đánh giá
const reviewState = {
    data: [],       // Mảng chứa danh sách các đánh giá của người dùng
    editingId: null // Lưu ID của đánh giá đang được mở ở chế độ chỉnh sửa (Inline Edit)
};

/**
 * Hàm Helper trích xuất thông tin người dùng đang đăng nhập từ LocalStorage.
 */
function getCurrentUser() {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn('Lỗi phân giải chuỗi JSON người dùng hiện tại:', error);
        return null;
    }
}

/**
 * Đọc dữ liệu cache đánh giá cục bộ từ LocalStorage để giảm tải request.
 */
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

/**
 * Lưu dữ liệu danh sách đánh giá vào cache LocalStorage.
 */
function saveReviewCache(items) {
    try {
        localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Không thể lưu cache đánh giá:', error);
    }
}

/**
 * Lọc danh sách các đánh giá được lưu trong cache thuộc về tài khoản hiện tại.
 */
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
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); // Sắp xếp đánh giá mới nhất lên trên
}

/**
 * Phân giải đường dẫn chuyển hướng xem chi tiết sự kiện an toàn.
 */
function buildReviewDetailUrl(eventId) {
    if (!eventId) return '#';
    if (window.pageUtils && typeof window.pageUtils.resolveUrl === 'function') {
        return window.pageUtils.resolveUrl(`pages/user/nat-event-detail.html?id=${encodeURIComponent(eventId)}`);
    }
    return `nat-event-detail.html?id=${encodeURIComponent(eventId)}`;
}

/**
 * Tiến trình chính hiển thị danh sách đánh giá lên giao diện.
 */
async function renderReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state">Vui lòng đăng nhập để xem đánh giá của bạn.</div>';
        return;
    }

    // Đọc danh sách từ cache cục bộ
    reviewState.data = getCachedReviewsForCurrentUser();
    reviewState.editingId = null;

    if (!reviewState.data.length) {
        container.innerHTML = '<div class="empty-state">Bạn chưa gửi đánh giá nào. Hãy vào trang chi tiết sự kiện để thêm đánh giá đầu tiên.</div>';
        return;
    }

    // Vẽ danh sách chi tiết các Card đánh giá
    renderReviewItems();
}

/**
 * Duyệt mảng và gọi hàm render từng Card đánh giá dựa vào trạng thái chỉnh sửa.
 */
function renderReviewItems() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    if (!reviewState.data || reviewState.data.length === 0) {
        container.innerHTML = '<div class="empty-state">Bạn chưa gửi đánh giá nào.</div>';
        return;
    }

    // Đồng bộ hóa trạng thái Card hiển thị thông thường hoặc ở chế độ input sửa đổi
    container.innerHTML = reviewState.data
        .map(review => renderReviewCard(review, reviewState.editingId === getReviewId(review)))
        .join('');

    // Đăng ký bộ nghe click tập trung (Event Delegation) tối ưu hiệu năng
    container.onclick = handleReviewContainerClick;
}

/**
 * Xử lý click tập trung vào các nút hành động trên lưới danh sách đánh giá.
 */
function handleReviewContainerClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const reviewId = button.dataset.reviewId;
    if (!reviewId) return;

    const action = button.dataset.action;
    switch (action) {
        case 'edit':
            openReviewEditor(reviewId); // Kích hoạt biểu mẫu chỉnh sửa
            break;
        case 'cancel':
            cancelReviewEdit();         // Hủy bỏ việc chỉnh sửa
            break;
        case 'save':
            saveReviewEdit(reviewId);   // Gọi API lưu lại chỉnh sửa
            break;
        case 'delete':
            openConfirmModal({          // Mở modal xác nhận xóa đánh giá
                title: 'Xác nhận xóa đánh giá',
                message: 'Bạn có chắc chắn muốn xóa vĩnh viễn đánh giá này không?',
                confirmText: 'Xóa',
                onConfirm: () => deleteReview(reviewId)
            });
            break;
        case 'view-event':
            openEventDetailModal(reviewId); // Xem nội dung tóm tắt sự kiện
            break;
    }
}

/**
 * Quyết định dựng Card hiển thị thường hay Card chỉnh sửa.
 */
function renderReviewCard(review, isEditing) {
    return isEditing ? renderReviewEditCard(review) : renderReviewDisplayCard(review);
}

/**
 * Dựng cấu trúc HTML cho Card hiển thị đánh giá ở chế độ đọc thông thường.
 */
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

/**
 * Dựng cấu trúc HTML cho Card chỉnh sửa khi người dùng chuyển sang chế độ sửa đổi.
 */
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
                <label for="review-rating-${reviewKey}">Đánh giá mới</label>
                <select id="review-rating-${reviewKey}">
                    ${[1, 2, 3, 4, 5].map(value => `<option value="${value}" ${value === rating ? 'selected' : ''}>${value} sao</option>`).join('')}
                </select>
            </div>
            <label for="review-comment-${reviewKey}">Bình luận mới</label>
            <textarea id="review-comment-${reviewKey}" class="review-input">${escapeHtml(comment)}</textarea>
            <div class="review-actions">
                <button type="button" class="btn" data-action="save" data-review-id="${escapeHtml(reviewId)}">Lưu</button>
                <button type="button" class="btn btn-secondary" data-action="cancel" data-review-id="${escapeHtml(reviewId)}">Hủy</button>
                <button type="button" class="btn btn-danger" data-action="delete" data-review-id="${escapeHtml(reviewId)}">Xóa</button>
            </div>
        </div>
    `;
}

/**
 * Trích xuất thuộc tính ID của đánh giá an toàn tương thích đa cấu trúc.
 */
function getReviewId(review) {
    return String(review.reviewId || review.id || review.reviewID || review._id || '');
}

/**
 * Kích hoạt mở giao diện chỉnh sửa cho đánh giá chỉ định.
 */
async function openReviewEditor(reviewId) {
    reviewState.editingId = reviewId;
    renderReviewItems();
}

/**
 * Tắt giao diện chỉnh sửa, quay lại chế độ đọc thông thường.
 */
function cancelReviewEdit() {
    reviewState.editingId = null;
    renderReviewItems();
}

/**
 * Gửi yêu cầu cập nhật đánh giá (PUT) lên Backend API và đồng bộ lại LocalStorage.
 */
async function saveReviewEdit(reviewId) {
    const reviewKey = sanitizeId(reviewId);
    const ratingField = document.getElementById(`review-rating-${reviewKey}`);
    const commentField = document.getElementById(`review-comment-${reviewKey}`);

    if (!ratingField || !commentField) return;

    const rating = Number(ratingField.value);
    const comment = commentField.value.trim();

    try {
        // Gọi API PUT cập nhật thông tin
        await window.apiClient.put(`/api/vtd/member/reviews/${encodeURIComponent(reviewId)}`, {
            rating,
            comment,
        });

        // Cập nhật lại trong mảng cache LocalStorage
        const items = getReviewCache().map(item => String(item.reviewId || item.id || '') === String(reviewId)
            ? { ...item, rating, comment, updatedAt: new Date().toISOString() }
            : item
        );
        saveReviewCache(items);
        await renderReviews();
    } catch (error) {
        console.error('Lỗi khi thực hiện lưu chỉnh sửa đánh giá:', error);
        alert(getReviewErrorMessage(error));
    }
}

/**
 * Mở hộp thoại Popup Modal hiển thị nội dung tóm tắt của sự kiện được nhận xét.
 */
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

/**
 * Mở hộp thoại xác nhận đồng ý / hủy bỏ một thao tác nguy hiểm (ví dụ: Xóa).
 */
function openConfirmModal({ title, message, confirmText, onConfirm }) {
    const body = `<p>${escapeHtml(message)}</p>`;
    const actions = [
        { text: confirmText, action: () => { onConfirm(); closeModal(); }, className: 'btn btn-danger' },
        { text: 'Hủy', action: closeModal, className: 'btn-secondary' }
    ];
    showModal(title, body, actions);
}

/**
 * Dựng cấu trúc động và bật hiển thị hộp thoại Popup Modal toàn cục.
 */
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

/**
 * Liên kết các sự kiện bấm đóng, click ngoài vùng để tự động tắt Modal.
 */
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

/**
 * Hàm ẩn hộp thoại Modal an toàn.
 */
function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
}

/**
 * Gửi yêu cầu DELETE lên Backend API xóa vĩnh viễn đánh giá và đồng bộ LocalStorage.
 */
async function deleteReview(reviewId) {
    try {
        await window.apiClient.delete(`/api/vtd/member/reviews/${encodeURIComponent(reviewId)}`);
        saveReviewCache(getReviewCache().filter(item => String(item.reviewId || item.id || '') !== String(reviewId)));
        await renderReviews();
    } catch (error) {
        console.error('Lỗi khi thực hiện xóa đánh giá:', error);
        alert(getReviewErrorMessage(error));
    }
}

/**
 * Hàm vẽ số sao đánh giá màu vàng đẹp mắt đại diện cho thang điểm đánh giá (1-5).
 */
function renderStars(count) {
    const stars = Array.from({ length: 5 }, (_, index) => (index < count ? '★' : '☆'));
    return `<span style="color:#f39c12;">${stars.join('')}</span>`;
}

/**
 * Hàm Helper chuyển đổi chuỗi an toàn chống tấn công mã độc chèn script XSS.
 */
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

/**
 * Khử các ký tự đặc biệt khỏi ID để gắn vào thẻ id HTML tránh lỗi cú pháp.
 */
function sanitizeId(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Dịch các mã lỗi kỹ thuật từ HTTP Status sang câu thông báo tiếng Việt trực quan, thân thiện cho người xem.
 */
function getReviewErrorMessage(error) {
    if (!error || !error.message) {
        return 'Không thể kết nối đến máy chủ API đánh giá.';
    }
    if (/404|Not Found/i.test(error.message)) {
        return 'API đánh giá chưa được Backend hỗ trợ hoặc đường dẫn sai. Vui lòng kiểm tra lại.';
    }
    if (/405|Method Not Allowed/i.test(error.message)) {
        return 'Phương thức hành động không được Backend cho phép. Hãy kiểm tra phân quyền tài khoản.';
    }
    if (/401|Unauthorized/i.test(error.message)) {
        return 'Phiên xác thực đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.';
    }
    return `Gặp sự cố xử lý yêu cầu: ${error.message}`;
}
