/**
 * JavaScript logic for Orders Management
 * BDHT Admin Portal
 */

let allOrders = [];
let activeOrderId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Tải thông tin người dùng từ LocalStorage lên Header
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
        try {
            const user = JSON.parse(currentUserStr);
            document.getElementById('admin-display-name').innerText = user.fullName || 'Admin BDHT';
            document.getElementById('admin-avatar-char').innerText = (user.fullName || 'A').charAt(0).toUpperCase();
        } catch(e) {}
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
        const orders = await window.apiClient.get('/api/lpth/admin/orders');
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
    const tableBody = document.getElementById('ordersTableBody');
    const orderCountText = document.getElementById('orderCountText');
    if (!tableBody) return;

    if (orderCountText) {
        orderCountText.textContent = orders.length;
    }

    if (!orders || orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-12 text-center text-gray-400">
                    <i class="fa-solid fa-receipt text-3xl mb-2 block"></i>
                    Không tìm thấy hóa đơn nào phù hợp với bộ lọc hiện hành.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = '';
    orders.forEach(o => {
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
}

// ==========================================
// 2. BỘ LỌC DỮ LIỆU ĐƠN HÀNG (FILTERS)
// ==========================================
async function handleSearchInput(e) {
    const email = e.target.value.trim();
    if (!email) {
        loadFilteredOrders();
        return;
    }

    try {
        // Gọi API tìm kiếm theo email
        const results = await window.apiClient.get(`/api/lpth/admin/orders`);
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
        const filtered = await window.apiClient.get(`/api/lpth/admin/orders${queryString}`);
        if (filtered) {
            renderOrdersTable(filtered);
        }
    } catch (err) {
        console.error('Lỗi lọc đơn hàng:', err);
    }
}

function resetFilters() {
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
        const o = await window.apiClient.get(`/api/lpth/admin/orders/${orderId}`);
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
            document.getElementById('detailStatusSelect').value = o.status || 'PENDING';
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
            // Gọi API lấy các mục trong đơn hàng
            const items = await window.apiClient.get(`/api/ttb/member/orders/${orderId}/items`);
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
        await window.apiClient.put(`/api/lpth/admin/orders/update-status/${activeOrderId}?status=${status}`);
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
            await window.apiClient.delete(`/api/lpth/admin/orders/delete/${activeOrderId}`);
            alert('🗑️ Đã xóa hóa đơn đặt vé thành công!');
            closeDetailsModal();
            loadOrders();
        } catch (err) {
            console.error('Lỗi xóa đơn hàng:', err);
            alert(`❌ Lỗi khi xóa đơn hàng: ${err.message}`);
        }
    }
}

// Debounce helper
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
