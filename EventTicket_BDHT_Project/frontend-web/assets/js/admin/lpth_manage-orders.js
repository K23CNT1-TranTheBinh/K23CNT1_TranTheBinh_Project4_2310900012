/**
 * JavaScript logic for Orders Management
 * BDHT Admin Portal
 */

let allOrders = [];
let activeOrderId = null;
let currentPage = 1;
const pageSize = 10;
let ordersToDisplay = [];

document.addEventListener('DOMContentLoaded', () => {
    // Tải thông tin người dùng từ LocalStorage lên Header
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
        try {
            const user = JSON.parse(currentUserStr);
            document.getElementById('admin-display-name').innerText = user.fullName || 'Admin BDHT';
            document.getElementById('admin-avatar-char').innerText = (user.fullName || 'A').charAt(0).toUpperCase();
        } catch (e) { }
    }

    // Tải tài nguyên đơn hàng
    loadOrders();

    // Lắng nghe sự kiện ô tìm kiếm nhanh email
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    }
});

// ==========================================
// 1. TẢI TOÀN BỘ ĐƠN HÀNG (ORDERS)
// ==========================================
async function loadOrders() {
    const tableBody = document.getElementById('ordersTableBody');
    try {
        const orders = await window.apiClient.get('/api/ttb/admin/orders');
        if (orders) {
            allOrders = orders;
            renderOrdersTable(orders);
        }
    } catch (err) {
        console.error('Lỗi tải danh sách đơn đặt vé:', err);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-8 text-center text-rose-500 font-bold">
                        <i class="fa-solid fa-circle-exclamation text-xl mb-2 block"></i>
                        Không thể kết nối đến máy chủ để lấy thông tin đơn hàng. Vui lòng kiểm tra backend!
                    </td>
                </tr>
            `;
        }
    }
}

function renderOrdersTable(orders) {
    ordersToDisplay = orders || [];
    
    const totalPages = Math.ceil(ordersToDisplay.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * pageSize;
    const paginatedOrders = ordersToDisplay.slice(startIdx, startIdx + pageSize);

    const tableBody = document.getElementById('ordersTableBody');
    const orderCountText = document.getElementById('orderCountText');
    if (!tableBody) return;

    if (orderCountText) {
        orderCountText.textContent = ordersToDisplay.length;
    }

    if (!ordersToDisplay || ordersToDisplay.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-12 text-center text-gray-400">
                    <i class="fa-solid fa-receipt text-3xl mb-2 block"></i>
                    Không tìm thấy hóa đơn nào phù hợp với bộ lọc hiện hành.
                </td>
            </tr>
        `;
        const paginationContainer = document.getElementById('adminPaginationBar');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    tableBody.innerHTML = '';
    paginatedOrders.forEach(o => {
        const orderId = o.orderId;
        const customerName = o.user ? o.user.fullName : 'N/A';
        const customerEmail = o.user ? o.user.email : 'N/A';

        // Format tiền tệ
        const totalAmountStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.totalAmount || 0);
        const finalAmountStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.finalAmount || 0);

        // Badge trạng thái
        let statusBadge = '';
        if (o.status === 'COMPLETED') {
            statusBadge = '<span class="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md text-xs font-bold border border-emerald-100 flex items-center gap-1 w-fit"><i class="fa-solid fa-circle-check"></i> COMPLETED</span>';
        } else if (o.status === 'PENDING') {
            statusBadge = '<span class="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md text-xs font-bold border border-amber-100 flex items-center gap-1 w-fit"><i class="fa-solid fa-clock"></i> PENDING</span>';
        } else if (o.status === 'REFUNDED') {
            statusBadge = '<span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-xs font-bold border border-blue-100 flex items-center gap-1 w-fit"><i class="fa-solid fa-undo"></i> REFUNDED</span>';
        } else if (o.status === 'REFUND_REQUESTED') {
            statusBadge = '<span class="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md text-xs font-bold border border-amber-100 flex items-center gap-1 w-fit"><i class="fa-solid fa-hourglass-half"></i> REFUND_REQ</span>';
        } else {
            statusBadge = '<span class="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md text-xs font-bold border border-rose-100 flex items-center gap-1 w-fit"><i class="fa-solid fa-ban"></i> CANCELLED</span>';
        }

        // Format thời gian
        const dateOpt = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        const createdAtStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN', dateOpt) : 'N/A';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition duration-150 font-semibold';
        tr.innerHTML = `
            <td class="px-6 py-4 text-gray-400 font-bold">#${orderId}</td>
            <td class="px-6 py-4 text-gray-900 font-bold">${customerName}</td>
            <td class="px-6 py-4 text-gray-500 font-medium">${customerEmail}</td>
            <td class="px-6 py-4 text-gray-500 font-semibold">${totalAmountStr}</td>
            <td class="px-6 py-4 text-indigo-600 font-extrabold">${finalAmountStr}</td>
            <td class="px-6 py-4">${statusBadge}</td>
            <td class="px-6 py-4 text-xs font-semibold text-gray-500">${createdAtStr}</td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="openDetailsModal(${orderId})" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 transition flex items-center gap-1">
                        <i class="fa-solid fa-eye"></i> Xem chi tiết
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    renderPaginationControls(ordersToDisplay.length, () => renderOrdersTable(ordersToDisplay));
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

// ==========================================
// 2. BỘ LỌC DỮ LIỆU ĐƠN HÀNG (FILTERS)
// ==========================================
async function handleSearchInput(e) {
    currentPage = 1;
    const email = e.target.value.trim();
    if (!email) {
        loadFilteredOrders();
        return;
    }

    try {
        // Gọi API tìm kiếm theo email
        const results = await window.apiClient.get(`/api/ttb/admin/orders`);
        if (results) {
            const filtered = results.filter(o =>
                o.user && o.user.email.toLowerCase().includes(email.toLowerCase())
            );
            renderOrdersTable(filtered);
        }
    } catch (err) {
        console.error('Lỗi tìm kiếm đơn hàng:', err);
    }
}

async function loadFilteredOrders() {
    currentPage = 1;
    const status = document.getElementById('statusFilter').value;
    const startDateStr = document.getElementById('startDateFilter').value;
    const endDateStr = document.getElementById('endDateFilter').value;

    let query = [];
    if (status) {
        query.push(`status=${status}`);
    }

    // Xử lý khoảng ngày
    if (startDateStr && endDateStr) {
        // Chuyển về định dạng ISO LocalTime (yyyy-MM-ddT00:00:00 / yyyy-MM-ddT23:59:59)
        const startDate = `${startDateStr}T00:00:00`;
        const endDate = `${endDateStr}T23:59:59`;
        query.push(`startDate=${startDate}`);
        query.push(`endDate=${endDate}`);
    }

    const queryString = query.length > 0 ? `?${query.join('&')}` : '';

    try {
        const filtered = await window.apiClient.get(`/api/ttb/admin/orders${queryString}`);
        if (filtered) {
            renderOrdersTable(filtered);
        }
    } catch (err) {
        console.error('Lỗi lọc đơn hàng:', err);
    }
}

function resetFilters() {
    currentPage = 1;
    document.getElementById('statusFilter').value = '';
    document.getElementById('startDateFilter').value = '';
    document.getElementById('endDateFilter').value = '';
    document.getElementById('searchInput').value = '';
    loadOrders();
}

// ==========================================
// 3. XEM CHI TIẾT & CẬP NHẬT TRẠNG THÁI
// ==========================================
async function openDetailsModal(orderId) {
    activeOrderId = orderId;
    document.getElementById('detailModalTitle').innerText = `Chi Tiết Hóa Đơn #${orderId}`;

    // Tải dữ liệu tổng quan đơn hàng
    try {
        const o = await window.apiClient.get(`/api/ttb/admin/orders/${orderId}`);
        if (o) {
            // Định dạng ngày tạo
            const dateOpt = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN', dateOpt) : 'N/A';
            document.getElementById('detailOrderDate').innerText = `Thời gian tạo: ${dateStr}`;

            // Nạp thông tin khách hàng
            document.getElementById('detailCustomerName').innerText = o.user ? o.user.fullName : 'N/A';
            document.getElementById('detailCustomerEmail').innerText = o.user ? o.user.email : 'N/A';
            document.getElementById('detailCustomerPhone').innerText = `SĐT: ${o.user && o.user.phoneNumber ? o.user.phoneNumber : 'Chưa cung cấp'}`;

            // Nạp thông tin thanh toán
            const totalStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.totalAmount || 0);
            const finalStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.finalAmount || 0);
            document.getElementById('detailTotalAmount').innerText = totalStr;
            document.getElementById('detailFinalAmount').innerText = finalStr;

            // Mã giảm giá
            if (o.promotion) {
                const val = o.promotion.discountValue;
                const type = o.promotion.discountType === 'PERCENT' ? '%' : 'đ';
                document.getElementById('detailDiscountCode').innerHTML = `<span class="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs font-bold">${o.promotion.code}</span> (Giảm ${val}${type})`;
            } else {
                document.getElementById('detailDiscountCode').innerText = 'Không áp dụng';
            }

            // Đồng bộ select trạng thái
            // Đồng bộ select trạng thái
            document.getElementById('detailStatusSelect').value = o.status || 'PENDING';

            // --- THÊM MỚI: Xử lý ẩn/hiện nút Duyệt Hoàn Tiền ---
            const btnApproveRefund = document.getElementById('btnApproveRefund');
            if (o.status === 'REFUND_REQUESTED') {
                btnApproveRefund.classList.remove('hidden');
                btnApproveRefund.classList.add('flex'); // Dùng flex để icon và text căn giữa
            } else {
                btnApproveRefund.classList.add('hidden');
                btnApproveRefund.classList.remove('flex');
            }
        }
    } catch (err) {
        console.error('Lỗi khi tải chi tiết đơn hàng:', err);
    }

    // Tải danh sách chi tiết các vé (Order Items)
    const itemsTbody = document.getElementById('detailItemsTableBody');
    if (itemsTbody) {
        itemsTbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-4 text-center text-slate-400">
                    <i class="fa-solid fa-spinner animate-spin mr-1"></i> Đang nạp danh sách vé...
                </td>
            </tr>
        `;

        try {
            // Gọi API lấy các mục trong đơn hàng từ Admin API (tránh lỗi 403 khi dùng member endpoint)
            const items = await window.apiClient.get(`/api/ttb/admin/orders/${orderId}/items`);
            if (items && items.length > 0) {
                itemsTbody.innerHTML = '';
                items.forEach(item => {
                    const ticketType = item.ticketType;
                    const eventTitle = ticketType && ticketType.event ? ticketType.event.title : 'Sự kiện đã xóa';
                    const typeName = ticketType ? ticketType.typeName : 'Hạng vé';
                    const unitPrice = item.priceAtTime || (ticketType ? ticketType.price : 0);

                    const unitPriceStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(unitPrice);
                    const subtotalStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(unitPrice * item.quantity);

                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-50/50 transition';
                    tr.innerHTML = `
                        <td class="px-4 py-3 font-bold text-slate-900">${eventTitle}</td>
                        <td class="px-4 py-3"><span class="bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-600">${typeName}</span></td>
                        <td class="px-4 py-3 text-right text-slate-500">${unitPriceStr}</td>
                        <td class="px-4 py-3 text-center text-slate-900 font-bold">${item.quantity} vé</td>
                        <td class="px-4 py-3 text-right text-indigo-600 font-extrabold">${subtotalStr}</td>
                    `;
                    itemsTbody.appendChild(tr);
                });
            } else {
                itemsTbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-4 py-6 text-center text-slate-400">
                            Không tìm thấy danh sách vé mua trong hóa đơn này.
                        </td>
                    </tr>
                `;
            }
        } catch (err) {
            console.error('Lỗi khi tải các vé của đơn hàng:', err);
            itemsTbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 py-6 text-center text-rose-500 font-semibold">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                        Không thể kết nối lấy chi tiết vé (Lỗi máy chủ/Đơn hàng nháp)
                    </td>
                </tr>
            `;
        }
    }

    document.getElementById('orderDetailsModal').classList.remove('hidden');
}

function closeDetailsModal() {
    document.getElementById('orderDetailsModal').classList.add('hidden');
    activeOrderId = null;
}

// Cập nhật trạng thái
async function updateStatusSubmit() {
    const status = document.getElementById('detailStatusSelect').value;
    try {
        await window.apiClient.put(`/api/ttb/admin/orders/update-status/${activeOrderId}?status=${status}`);
        alert('🎉 Cập nhật trạng thái đơn hàng thành công!');
        closeDetailsModal();
        loadOrders(); // Tải lại danh sách bảng
    } catch (err) {
        console.error('Lỗi cập nhật trạng thái đơn:', err);
        alert(`❌ Lỗi cập nhật: ${err.message || 'Không thể đổi trạng thái.'}`);
    }
}

// Xóa hóa đơn
async function deleteOrderSubmit() {
    if (confirm('⚠️ CẢNH BÁO CỰC KỲ QUAN TRỌNG: Bạn thực sự muốn XÓA VĨNH VIỄN đơn hàng này khỏi cơ sở dữ liệu? Hành động này sẽ loại bỏ hóa đơn và thông tin đặt chỗ của khách hàng.')) {
        try {
            await window.apiClient.delete(`/api/ttb/admin/orders/delete/${activeOrderId}`);
            alert('🗑️ Đã xóa hóa đơn đặt vé thành công!');
            closeDetailsModal();
            loadOrders();
        } catch (err) {
            console.error('Lỗi xóa đơn hàng:', err);
            alert(`❌ Lỗi khi xóa đơn hàng: ${err.message}`);
        }
    }
}
// ==========================================
// 4. DUYỆT YÊU CẦU HOÀN TIỀN
// ==========================================
// Đặt là window.approveRefundSubmit để file HTML (onclick) gọi được chắc chắn 100%
window.approveRefundSubmit = async function () {
    if (!activeOrderId) return;

    if (confirm('✅ BẠN XÁC NHẬN ĐÃ CHUYỂN KHOẢN HOÀN TIỀN CHO KHÁCH?\n\nHành động này sẽ đóng đơn hàng, đánh dấu là đã hoàn tiền và vô hiệu hóa vé của khách.')) {

        // Disable nút để tránh click đúp
        const btn = document.getElementById('btnApproveRefund');
        const oldHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

        try {
            // Gọi API duyệt hoàn tiền mới thêm ở Controller
            await window.apiClient.put(`/api/ttb/admin/orders/${activeOrderId}/approve-refund`);

            alert('🎉 Đã duyệt hoàn tiền thành công!');
            closeDetailsModal();
            loadOrders(); // Tải lại danh sách bảng để cập nhật badge trạng thái

        } catch (err) {
            console.error('Lỗi khi duyệt hoàn tiền:', err);
            alert(`❌ Không thể duyệt hoàn tiền: ${err.message || 'Lỗi hệ thống'}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = oldHtml;
        }
    }
};

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================
// Debounce helper (Hàm hỗ trợ tìm kiếm delay)
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}