let allReviews = [];
let currentPage = 1;
const pageSize = 10;
let reviewsToDisplay = [];

document.addEventListener('DOMContentLoaded', () => {

    const currentUserStr = localStorage.getItem('currentUser');

    if (currentUserStr) {

        try {

            const user = JSON.parse(currentUserStr);

            document.getElementById('admin-display-name').innerText =
                user.fullName || 'Admin';

            document.getElementById('admin-avatar-char').innerText =
                (user.fullName || 'A').charAt(0).toUpperCase();

        } catch (e) { }
    }

    loadReviews();

    document
        .getElementById('hiddenFilter')
        .addEventListener('change', loadFilteredReviews);
});

async function loadReviews() {

    const tableBody =
        document.getElementById('reviewsTableBody');

    try {

        const reviews =
            await window.apiClient.get('/api/lpth/admin/reviews');

        allReviews = reviews || [];

        renderReviewsTable(allReviews);

    } catch (err) {

        console.error(err);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6"
                    class="px-6 py-10 text-center text-rose-500 font-bold">

                    <i class="fa-solid fa-circle-exclamation text-2xl mb-2 block"></i>

                    Không thể tải danh sách đánh giá.
                </td>
            </tr>
        `;
    }
}

async function loadFilteredReviews() {
    currentPage = 1;
    const hidden =
        document.getElementById('hiddenFilter').value;

    let query = '';

    if (hidden !== '') {
        query = `?isHidden=${hidden}`;
    }

    try {

        const reviews =
            await window.apiClient.get(
                `/api/lpth/admin/reviews${query}`
            );

        renderReviewsTable(reviews);

    } catch (err) {

        console.error(err);
    }
}

function renderReviewsTable(reviews) {
    reviewsToDisplay = reviews || [];

    const totalPages = Math.ceil(reviewsToDisplay.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * pageSize;
    const paginatedReviews = reviewsToDisplay.slice(startIdx, startIdx + pageSize);

    const tableBody =
        document.getElementById('reviewsTableBody');

    const reviewCountText =
        document.getElementById('reviewCountText');

    if (!tableBody) return;

    reviewCountText.textContent = reviewsToDisplay.length;

    if (!reviewsToDisplay || reviewsToDisplay.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6"
                    class="px-6 py-12 text-center text-gray-400">
                    <i class="fa-solid fa-comments text-3xl mb-2 block"></i>
                    Không có đánh giá nào.
                </td>
            </tr>
        `;
        const paginationContainer = document.getElementById('adminPaginationBar');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    tableBody.innerHTML = '';
    paginatedReviews.forEach(r => {
        let statusBadge = '';
        if (r.isHidden) {
            statusBadge = `
                <span class="bg-rose-50 text-rose-600 px-2 py-1 rounded-lg text-xs font-bold border border-rose-100">
                    Đã ẩn
                </span>
            `;
        } else {
            statusBadge = `
                <span class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-xs font-bold border border-emerald-100">
                    Hiển thị
                </span>
            `;
        }

        let toggleBtn = '';
        if (r.isHidden) {
            toggleBtn = `
                <button
                    onclick="showReview(${r.reviewId})"
                    class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100 transition flex items-center gap-1">
                    <i class="fa-solid fa-eye"></i>
                    Hiện
                </button>
            `;
        } else {
            toggleBtn = `
                <button
                    onclick="hideReview(${r.reviewId})"
                    class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs font-bold border border-amber-100 transition flex items-center gap-1">
                    <i class="fa-solid fa-eye-slash"></i>
                    Ẩn
                </button>
            `;
        }

        const tr = document.createElement('tr');
        tr.className =
            'hover:bg-gray-50/50 transition duration-150 font-semibold';

        tr.innerHTML = `
            <td class="px-6 py-4 text-gray-400 font-bold">
                #${r.reviewId}
            </td>
            <td class="px-6 py-4 text-gray-900 font-bold">
                ${r.user?.fullName || 'Ẩn danh'}
            </td>
            <td class="px-6 py-4 text-amber-500 font-bold">
                ⭐ ${r.rating}/5
            </td>
            <td class="px-6 py-4 text-gray-500 max-w-[300px] truncate">
                ${r.comment || 'Không có nội dung'}
            </td>
            <td class="px-6 py-4">
                ${statusBadge}
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                    ${toggleBtn}
                    <button
                        onclick="deleteReview(${r.reviewId})"
                        class="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-gray-400 hover:text-rose-600 transition">
                        <i class="fa-solid fa-trash-can text-sm"></i>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(tr);
    });

    renderPaginationControls(reviewsToDisplay.length, () => renderReviewsTable(reviewsToDisplay));
}

function renderPaginationControls(totalItems, onPageChange) {
    const table = document.querySelector('table');
    if (!table) return;

    let paginationContainer = document.getElementById('adminPaginationBar');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'adminPaginationBar';
        paginationContainer.className = 'bg-white border-t border-gray-250 px-6 py-4 flex items-center justify-between mt-0';
        
        const tableContainer = table.parentElement;
        tableContainer.appendChild(paginationContainer);
    }

    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, totalItems);

    paginationContainer.innerHTML = `
        <div class="text-xs text-gray-500 font-semibold">
            Hiển thị từ <span class="text-slate-800 font-extrabold">${startIdx}</span> đến <span class="text-slate-800 font-extrabold">${endIdx}</span> trong tổng số <span class="text-indigo-600 font-extrabold">${totalItems}</span> mục
        </div>
        <div class="flex items-center gap-2">
            <button type="button" id="adminBtnPrev" ${currentPage === 1 ? 'disabled' : ''} class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg text-xs font-bold border border-gray-200 transition">
                <i class="fa-solid fa-chevron-left mr-1"></i> Trước
            </button>
            <span class="text-xs font-bold text-gray-700 mx-2">Trang ${currentPage} / ${totalPages}</span>
            <button type="button" id="adminBtnNext" ${currentPage === totalPages ? 'disabled' : ''} class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg text-xs font-bold border border-gray-200 transition">
                Sau <i class="fa-solid fa-chevron-right ml-1"></i>
            </button>
        </div>
    `;

    document.getElementById('adminBtnPrev')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            onPageChange();
        }
    });

    document.getElementById('adminBtnNext')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            onPageChange();
        }
    });
}

async function hideReview(id) {

    if (!confirm('Bạn có chắc muốn ẨN đánh giá này?')) {
        return;
    }

    try {

        await window.apiClient.put(
            `/api/lpth/admin/reviews/${id}/hide`
        );

        alert('Đã ẩn đánh giá!');

        loadFilteredReviews();

    } catch (err) {

        console.error(err);

        alert('Không thể ẩn đánh giá!');
    }
}

async function showReview(id) {

    try {

        await window.apiClient.put(
            `/api/lpth/admin/reviews/${id}/show`
        );

        alert('Đã hiển thị lại đánh giá!');

        loadFilteredReviews();

    } catch (err) {

        console.error(err);

        alert('Không thể hiển thị đánh giá!');
    }
}

async function deleteReview(id) {

    if (!confirm(
        'Bạn có chắc muốn XÓA VĨNH VIỄN đánh giá này?'
    )) {
        return;
    }

    try {

        await window.apiClient.delete(
            `/api/lpth/admin/reviews/${id}`
        );

        alert('Đã xóa đánh giá!');

        loadFilteredReviews();

    } catch (err) {

        console.error(err);

        alert('Không thể xóa đánh giá!');
    }
}