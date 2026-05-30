document.addEventListener('DOMContentLoaded', () => {
    // --- CHỐT CHẶN 1: ROUTE GUARD (Kiểm tra quyền truy cập) ---
    const token = localStorage.getItem('token');
    if (!token) {
        alert("⚠️ Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục!");
        window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('pages/user/nat-login.html') : './nat-login.html';
        return; // Dừng ngay việc thực thi các hàm bên dưới
    }
    // -----------------------------------------------------------

    // Tải Header dynamic nếu có tiện ích
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }

    setupTabNavigation();
    loadProfileDetails();
    loadTransactionHistory();
    loadMyTickets();
    setupFormSubmissions();
    setupOrderFilterTabs();
});

// ==========================================
// 1. DYNAMIC TAB SWITCHING LOGIC
// ==========================================
function setupTabNavigation() {
    const menuButtons = {
        account: document.getElementById('menu-btn-account'),
        history: document.getElementById('menu-btn-history'),
        password: document.getElementById('menu-btn-password'),
        tickets: document.getElementById('menu-btn-tickets')
    };

    const tabs = {
        account: document.getElementById('tab-account'),
        history: document.getElementById('tab-history'),
        password: document.getElementById('tab-password'),
        tickets: document.getElementById('tab-tickets')
    };

    // Hàm chuyển đổi tab active
    const switchTab = (activeKey) => {
        // Cập nhật class menu buttons
        Object.keys(menuButtons).forEach(key => {
            const btn = menuButtons[key];
            if (!btn) return;

            if (key === activeKey) {
                btn.className = "profile-menu-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-brand-orange bg-orange-50/50 transition-all duration-200";
            } else {
                btn.className = "profile-menu-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-brand-orange transition-all duration-200";
            }
        });

        // Cập nhật ẩn/hiện nội dung tab bên phải
        Object.keys(tabs).forEach(key => {
            const tab = tabs[key];
            if (!tab) return;

            if (key === activeKey) {
                tab.classList.remove('hidden');
            } else {
                tab.classList.add('hidden');
            }
        });
    };

    // Gắn sự kiện click
    Object.keys(menuButtons).forEach(key => {
        const btn = menuButtons[key];
        if (btn) {
            btn.addEventListener('click', () => switchTab(key));
        }
    });

    // Mặc định kích hoạt tab account đầu tiên
    switchTab('account');
}

// ==========================================
// 2. TẢI THÔNG TIN HỒ SƠ TÀI KHOẢN TỪ BACKEND
// ==========================================
async function loadProfileDetails() {
    const fullNameInput = document.getElementById('acc-fullname');
    const phoneInput = document.getElementById('acc-phone');
    const emailInput = document.getElementById('acc-email');
    const nameSidebar = document.getElementById('sidebar-user-name');
    const avatarChar = document.getElementById('sidebar-avatar-char');

    try {
        // Gọi API lấy hồ sơ từ Backend (JWT đính kèm tự động từ window.apiClient)
        const user = await window.apiClient.get('/api/vtd/member/profile');

        if (user) {
            // Cập nhật thông tin vào input fields
            if (fullNameInput) fullNameInput.value = user.fullName || "";
            if (phoneInput) phoneInput.value = user.phoneNumber || "";
            if (emailInput) emailInput.value = user.email || "";

            // Cập nhật giao diện bên trái (Sidebar)
            if (nameSidebar) nameSidebar.innerText = user.fullName || "User";
            if (avatarChar && user.fullName) {
                avatarChar.innerText = user.fullName.charAt(0).toUpperCase();
            }

            // Đồng bộ dữ liệu người dùng hiện tại vào LocalStorage
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    } catch (e) {
        console.error("Lỗi khi tải thông tin hồ sơ từ API:", e);
        showToast("❌ Không thể kết nối tới máy chủ hoặc bạn chưa đăng nhập!", "danger");

        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                let userDetails = JSON.parse(storedUser);
                if (fullNameInput) fullNameInput.value = userDetails.fullName || "";
                if (phoneInput) phoneInput.value = userDetails.phoneNumber || "";
                if (emailInput) emailInput.value = userDetails.email || "";
                if (nameSidebar) nameSidebar.innerText = userDetails.fullName || "User";
                if (avatarChar && userDetails.fullName) {
                    avatarChar.innerText = userDetails.fullName.charAt(0).toUpperCase();
                }
            } catch (err) { }
        }
    }
}

// ==========================================
// 3. TẢI LỊCH SỬ GIAO DỊCH TỪ BACKEND
// ==========================================
// Biến theo dõi bộ lọc hiện tại
let currentOrderFilter = 'ALL';

async function loadTransactionHistory(statusFilter) {
    const container = document.getElementById('history-list');
    if (!container) return;

    // Cập nhật filter state
    const filter = (statusFilter || currentOrderFilter || 'ALL').toUpperCase();
    currentOrderFilter = filter;

    // Loading state với fade
    container.style.transition = 'opacity 0.15s ease';
    container.style.opacity = '0.4';

    container.innerHTML = `
        <div class="text-center py-8 text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
            <i class="fas fa-spinner animate-spin text-lg text-brand-orange"></i>
            <span>Đang tải lịch sử giao dịch...</span>
        </div>
    `;
    container.style.opacity = '1';

    try {
        // Gọi API khác nhau tùy bộ lọc
        const orders = await window.apiClient.get('/api/vtd/member/orders');

        // Xử lý response (hỗ trợ cả Array và Page object)
        const allOrders = Array.isArray(orders) ? orders : (orders?.content || []);
        const orderList = filterOrdersByUiStatus(allOrders, filter);

        if (!orderList || orderList.length === 0) {
            const filterLabels = { 'ALL': '', 'PENDING': ' đang chờ thanh toán', 'PAID': ' đã thanh toán', 'CANCELLED': ' đã hủy', 'REFUNDED': ' đã hoàn tiền' };
            container.style.opacity = '0';
            setTimeout(() => {
                container.innerHTML = `
                    <div class="text-center py-10 bg-slate-50 border border-gray-150 rounded-2xl p-6 flex flex-col items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-450"><i class="fas fa-inbox text-lg"></i></div>
                        <div class="flex flex-col gap-0.5">
                            <span class="text-xs font-black text-slate-800 uppercase tracking-wider">Không tìm thấy giao dịch${filterLabels[filter] || ''}</span>
                            <span class="text-[10px] text-slate-400 font-bold">${filter === 'ALL' ? 'Bạn chưa đặt mua chiếc vé sự kiện nào.' : 'Không có đơn hàng nào ở trạng thái này.'}</span>
                        </div>
                    </div>
                `;
                container.style.opacity = '1';
            }, 150);
            return;
        }

        // Render với hiệu ứng fade-in
        container.style.opacity = '0';
        setTimeout(() => {
            container.innerHTML = orderList.map(order => renderOrderCard(order)).join('');
            container.style.opacity = '1';
        }, 150);

    } catch (e) {
        console.error("Lỗi khi tải lịch sử đơn hàng từ API:", e);
        container.style.opacity = '0';
        setTimeout(() => {
            container.innerHTML = `
                <div class="text-center py-8 bg-red-50 border border-red-100 text-red-650 rounded-2xl p-4 text-xs font-bold">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Không thể tải lịch sử đơn hàng của bạn. Vui lòng đăng nhập lại!
                </div>
            `;
            container.style.opacity = '1';
        }, 150);
    }
}

/**
 * Render 1 card đơn hàng (tách riêng để tái sử dụng)
 */
function renderOrderCard(order) {
    const dateStr = new Date(order.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const amount = order.finalAmount ?? order.totalAmount ?? 0;
    const totalStr = Number(amount).toLocaleString('vi-VN') + " VND";

    // Phân loại trạng thái đơn hàng
    const statusInfo = getOrderStatusInfo(order.status);
    const statusText = statusInfo.label;
    const statusClass = statusInfo.className;

    // Lấy paymentId từ localStorage (nếu có)
    const savedPaymentId = localStorage.getItem(`payment_for_order_${order.orderId}`);

    return `
        <div class="flex items-center gap-4 p-4 border border-gray-150 rounded-2xl shadow-sm hover:shadow-md transition bg-white">
            <div class="w-12 h-12 rounded-xl bg-purple-50 text-brand-purple flex items-center justify-center text-sm shadow-inner flex-shrink-0">
                <i class="fas fa-receipt text-base"></i>
            </div>
            <div class="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div class="flex flex-col gap-0.5">
                    <h4 class="text-xs sm:text-sm font-extrabold text-slate-800">Đơn hàng #BDHT${order.orderId}</h4>
                    <span class="text-[9px] text-slate-400 font-semibold">${dateStr}</span>
                    <span class="text-xs font-black text-brand-orange mt-1 block">${totalStr}</span>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <span id="order-status-${order.orderId}" class="inline-block text-[9px] font-extrabold uppercase px-3 py-1 rounded-full border ${statusClass}">
                        ${statusText}
                    </span>
                    ${order.status === 'COMPLETED' ? `<button type="button" onclick="openRefundModalForOrder(${order.orderId})" class="text-[10px] font-bold text-slate-500 hover:text-brand-orange transition underline">Yêu cầu hoàn tiền</button>` : ''}
                    ${isWaitingPaymentStatus(order.status) ? `
                        <button type="button" onclick="continuePayment(${order.orderId})"
                            class="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-orange hover:text-orange-600 transition-colors mr-2">
                            <i class="fas fa-credit-card text-[9px]"></i> Tiếp tục thanh toán
                        </button>
                    ` : ''}
                    ${order.status === 'PENDING' ? `
                        <button type="button" id="btn-cancel-order-${order.orderId}" onclick="openCancelOrderModal(${order.orderId})"
                            class="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors group">
                            <i class="fas fa-ban text-[9px] group-hover:animate-pulse"></i> Hủy đơn hàng
                        </button>
                    ` : ''}
                    ${order.paymentId ? `
                        <button type="button" onclick="checkPaymentStatus(${order.paymentId}, ${order.orderId})"
                            class="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors">
                            <i class="fas fa-search-dollar text-[9px]"></i> Kiểm tra TT
                        </button>
                    ` : ''}
                    <button type="button" onclick="openOrderDetailModal(${order.orderId})"
                        class="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-brand-orange transition-colors">
                        <i class="fas fa-list-ul text-[9px]"></i> Chi tiết
                    </button>
                </div>
            </div>
        </div>
    `;
}

function normalizeOrderStatus(status) {
    return String(status || 'PENDING').toUpperCase();
}

function isWaitingPaymentStatus(status) {
    const normalized = normalizeOrderStatus(status);
    return normalized === 'PENDING';
}

function isPaidStatus(status) {
    return normalizeOrderStatus(status) === 'COMPLETED';
}

function filterOrdersByUiStatus(orders, filter) {
    const data = Array.isArray(orders) ? orders : [];
    if (filter === 'ALL') return data;
    if (filter === 'PENDING') return data.filter(order => isWaitingPaymentStatus(order.status));
    if (filter === 'PAID') return data.filter(order => isPaidStatus(order.status));
    if (filter === 'CANCELLED') return data.filter(order => normalizeOrderStatus(order.status) === 'CANCELLED');
    if (filter === 'REFUNDED') return data.filter(order => normalizeOrderStatus(order.status) === 'REFUNDED' || normalizeOrderStatus(order.status) === 'REFUND_REQUESTED');
    return data;
}

function getOrderStatusInfo(status) {
    const normalized = normalizeOrderStatus(status);
    if (normalized === 'COMPLETED') {
        return {
            label: 'Đã thanh toán',
            className: 'text-emerald-500 bg-emerald-50 border-emerald-100'
        };
    }
    if (normalized === 'CANCELLED') {
        return {
            label: 'Đã hủy',
            className: 'text-red-500 bg-red-50 border-red-100'
        };
    }
    if (normalized === 'REFUNDED') {
        return {
            label: 'Đã hoàn tiền',
            className: 'text-blue-500 bg-blue-50 border-blue-100'
        };
    }
    if (normalized === 'REFUND_REQUESTED') {
        return {
            label: 'Chờ hoàn tiền',
            className: 'text-amber-500 bg-amber-50 border-amber-100'
        };
    }
    return {
        label: 'Chờ thanh toán',
        className: 'text-brand-orange bg-orange-50 border-orange-100'
    };
}

// ====== BỘ LỌC TRẠNG THÁI ĐƠN HÀNG ======

/**
 * Khởi tạo sự kiện cho các tab bộ lọc
 */
function setupOrderFilterTabs() {
    const filterBar = document.getElementById('order-filter-bar');
    if (!filterBar) return;

    filterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.order-filter-btn');
        if (!btn) return;

        const filter = btn.dataset.filter;
        if (!filter || filter === currentOrderFilter) return;

        // Cập nhật trạng thái active cho các nút
        updateFilterActiveState(btn);

        // Gọi load lại với filter mới
        loadTransactionHistory(filter);
    });
}

/**
 * Cập nhật style active cho nút bộ lọc được chọn
 */
function updateFilterActiveState(activeBtn) {
    const allBtns = document.querySelectorAll('.order-filter-btn');

    // Reset tất cả về trạng thái inactive
    const inactiveClasses = 'bg-white text-slate-500 border-gray-200';
    const activeClasses = 'bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/20';

    allBtns.forEach(btn => {
        btn.classList.remove('active-filter', ...activeClasses.split(' '));
        // Xóa các hover color classes có thể bị stuck
        btn.classList.remove('border-amber-400', 'text-amber-600', 'border-emerald-400', 'text-emerald-600', 'border-red-400', 'text-red-600', 'border-blue-400', 'text-blue-600');
        inactiveClasses.split(' ').forEach(cls => btn.classList.add(cls));
    });

    // Đánh dấu nút active
    activeBtn.classList.add('active-filter');
    inactiveClasses.split(' ').forEach(cls => activeBtn.classList.remove(cls));
    activeClasses.split(' ').forEach(cls => activeBtn.classList.add(cls));

    // Hiệu ứng scale nhẹ
    activeBtn.style.transform = 'scale(1.05)';
    setTimeout(() => { activeBtn.style.transform = ''; }, 200);
}

// ==========================================
// 4. TẢI DANH SÁCH VÉ ĐIỆN TỬ CỦA TÀI KHOẢN
// ==========================================
async function loadMyTickets() {
    const container = document.getElementById('my-tickets-list');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-8 text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
            <i class="fas fa-spinner animate-spin text-lg text-brand-orange"></i>
            <span>Đang tải kho vé điện tử...</span>
        </div>
    `;

    try {
        // Lấy danh sách vé đã mua thành công từ Backend
        const tickets = await window.apiClient.get('/api/vtd/member/my-tickets');

        if (!tickets || tickets.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10 bg-slate-50 border border-gray-150 rounded-2xl p-6 flex flex-col items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-450"><i class="fas fa-qrcode text-lg"></i></div>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-xs font-black text-slate-800 uppercase tracking-wider">Kho vé rỗng</span>
                        <span class="text-[10px] text-slate-400 font-bold">Bạn chưa sở hữu tấm vé điện tử nào.</span>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = tickets.map(ticket => {
            const statusClass = ticket.checkInStatus
                ? "text-slate-400 bg-slate-50 border-slate-200"
                : "text-emerald-500 bg-emerald-50 border-emerald-100";

            const statusText = ticket.checkInStatus ? 'Đã soát vé' : 'Hợp lệ (Chưa soát)';

            // Lấy thông tin sự kiện từ ticketType
            const event = ticket.ticketType?.event || {};
            const eventTitle = event.title || 'Sự kiện không xác định';
            const eventImage = event.bannerImageUrl || '../../assets/images/placeholder-event.jpg';
            const venueName = event.venue?.name || 'Địa điểm tổ chức';

            let formattedTime = 'Không rõ thời gian';
            if (event.startTime) {
                const d = new Date(event.startTime);
                formattedTime = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('vi-VN');
            }

            const ticketTypeName = ticket.ticketType?.typeName || 'Vé phổ thông';

            return `
                <div class="border border-gray-150 rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition flex flex-col md:flex-row items-center gap-4 relative overflow-hidden group">
                    <!-- Left: Event Image Banner -->
                    <div class="w-full md:w-32 h-24 rounded-xl overflow-hidden flex-shrink-0 relative shadow-inner bg-slate-100 border border-gray-100">
                        <img src="${eventImage}" alt="${eventTitle}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='../../assets/images/placeholder-event.jpg'" />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"></div>
                    </div>

                    <!-- Center: Ticket & Event details -->
                    <div class="flex-1 flex flex-col gap-1 w-full truncate text-left">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border border-brand-purple/20 text-brand-purple bg-purple-50/50">
                                ${ticketTypeName}
                            </span>
                            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded border ${statusClass}">
                                ${statusText}
                            </span>
                        </div>
                        
                        <h4 class="text-sm sm:text-base font-extrabold text-slate-800 truncate mt-1 group-hover:text-brand-orange transition-colors" title="${eventTitle}">
                            ${eventTitle}
                        </h4>
                        
                        <div class="flex flex-col gap-1 text-[11px] font-medium text-slate-500 mt-1">
                            <div class="flex items-center gap-1.5 truncate">
                                <i class="far fa-calendar-alt text-brand-orange text-xs w-3.5"></i>
                                <span>Thời gian: ${formattedTime}</span>
                            </div>
                            <div class="flex items-center gap-1.5 truncate">
                                <i class="fas fa-map-marker-alt text-slate-400 text-xs w-3.5"></i>
                                <span class="truncate">Địa điểm: ${venueName}</span>
                            </div>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <i class="fas fa-barcode text-slate-400 text-xs w-3.5"></i>
                                <span class="font-mono font-bold text-slate-600">Mã vé: ${ticket.qrCode}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Action Button -->
                    <div class="w-full md:w-auto flex justify-end flex-shrink-0 pt-2 md:pt-0 border-t border-dashed border-gray-100 md:border-t-0 w-full md:w-auto">
                        <button type="button" onclick="showTicketQrModal(${ticket.ticketId}, '${String(ticket.qrCode).replace(/'/g, "\\'")}')" class="bg-brand-orange hover:bg-brand-orangeHover hover:-translate-y-0.5 text-white font-extrabold px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-brand-orange/15 w-full md:w-auto flex items-center justify-center gap-2">
                            <i class="fas fa-qrcode"></i> Hiển Thị QR Vé
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Lỗi khi tải kho vé điện tử từ API:", e);
        container.innerHTML = `
            <div class="text-center py-8 bg-red-50 border border-red-100 text-red-650 rounded-2xl p-4 text-xs font-bold">
                <i class="fas fa-exclamation-triangle mr-1"></i> Không thể tải kho vé của bạn lúc này.
            </div>
        `;
    }
}

// ==========================================
// 5. HIỂN THỊ POPUP MODAL QR CODE VÉ ĐỂ SOÁT CỬA
// ==========================================
window.showTicketQrModal = async function (ticketId, ticketCode) {
    const modal = document.getElementById('ticket-qr-modal');
    const qrImg = document.getElementById('ticket-qr-img');
    const content = modal.querySelector('.ticket-modal-content');

    // UI Elements
    const elEventName = document.getElementById('ticket-modal-event-name');
    const elVenue = document.getElementById('ticket-modal-venue');
    const elTime = document.getElementById('ticket-modal-time');
    const elZone = document.getElementById('ticket-modal-zone');
    const elGate = document.getElementById('ticket-modal-gate');
    const elSeat = document.getElementById('ticket-modal-seat');
    const elQrCodeText = document.getElementById('ticket-qr-code-text');

    const qrLoading = document.getElementById('ticket-qr-loading');
    const qrWrapper = document.getElementById('ticket-qr-wrapper');

    if (!modal) return;

    // Reset old data & show loading
    elEventName.innerText = 'Đang tải thông tin...';
    elVenue.innerHTML = '<i class="fas fa-map-marker-alt mr-1"></i> -';
    elTime.innerText = '-';
    elZone.innerText = '-';
    elGate.innerText = '-';
    elSeat.innerText = '-';
    elQrCodeText.innerText = ticketCode || '-';

    qrLoading.classList.remove('hidden');
    qrWrapper.classList.add('hidden');
    qrImg.src = '';

    // Mở popup (Hiệu ứng fade-in & scale-up)
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    // Đợi 1 frame để trình duyệt áp dụng class hidden -> block, sau đó thêm opacity
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 10);

    try {
        // Call API lấy chi tiết vé
        const ticketData = await window.apiClient.get(`/api/vtd/member/tickets/${ticketId}`);

        // Cập nhật giao diện với dữ liệu thực tế
        // Nếu API trả về cấu trúc lồng nhau (e.g. ticketData.orderItem.order.event...) thì truy xuất tương ứng
        // Do chưa rõ cấu trúc DTO chính xác, ta sẽ thử phân tích các trường phổ biến
        const eventName = ticketData.event?.name || ticketData.eventName || 'Sự Kiện Đã Đặt';
        const venueName = ticketData.event?.venue?.name || ticketData.venueName || 'Địa điểm tổ chức';
        const startTime = ticketData.event?.startTime || ticketData.startTime || '19:00 - 01/01/2026';
        const typeName = ticketData.ticketType?.typeName || ticketData.typeName || 'Vé phổ thông';

        // Format time
        let formattedTime = startTime;
        if (startTime && startTime.includes('T')) {
            const d = new Date(startTime);
            formattedTime = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('vi-VN');
        }

        elEventName.innerText = eventName;
        elVenue.innerHTML = `<i class="fas fa-map-marker-alt mr-1"></i> ${venueName}`;
        elTime.innerText = formattedTime;
        elZone.innerText = typeName;
        elGate.innerText = ticketData.gate || 'Cửa chính';
        elSeat.innerText = ticketData.seatNumber || 'Ghế tự do';
    } catch (error) {
        console.error("Lỗi lấy chi tiết vé:", error);
        elEventName.innerText = 'Lỗi tải dữ liệu';
    } finally {
        // Render QR Code sau khi lấy xong dữ liệu
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketCode)}`;
        qrImg.onload = () => {
            qrLoading.classList.add('hidden');
            qrWrapper.classList.remove('hidden');
        };
    }
};

window.closeTicketQrModal = function () {
    const modal = document.getElementById('ticket-qr-modal');
    if (!modal) return;

    const content = modal.querySelector('.ticket-modal-content');

    // Hiệu ứng fade-out
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }, 300); // Khớp với duration-300 trong HTML
};

// ==========================================
// 6. XỬ LÝ GỬI FORM VÀ PHẢN HỒI GIAO DIỆN (SUBMISSION & FEEDBACK)
// ==========================================
function setupFormSubmissions() {
    const accForm = document.getElementById('account-form');
    const passForm = document.getElementById('password-form');

    // Submit cập nhật hồ sơ cá nhân
    if (accForm) {
        accForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = accForm.querySelector('button[type="submit"]');
            const fullName = document.getElementById('acc-fullname').value.trim();
            const phone = document.getElementById('acc-phone').value.trim();

            if (!fullName || !phone) {
                showToast("❌ Vui lòng nhập đầy đủ họ tên và số điện thoại!", "danger");
                return;
            }

            // Trạng thái LOADING: Vô hiệu hóa nút bấm
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fas fa-spinner animate-spin text-sm"></i> Đang lưu...`;
            }

            try {
                // Gọi API PUT cập nhật thông tin thật
                const updatedUser = await window.apiClient.put('/api/vtd/member/profile', {
                    fullName: fullName,
                    phoneNumber: phone
                });

                showToast("🎉 Cập nhật thông tin hồ sơ lên hệ thống thành công!", "success");

                // Đồng bộ ngược lại giao diện và LocalStorage
                if (updatedUser) {
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    loadProfileDetails();
                }
            } catch (err) {
                console.error("Lỗi khi cập nhật hồ sơ:", err);
                showToast("❌ Lỗi: " + err.message, "danger");
            } finally {
                // Khôi phục nút bấm
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fas fa-check text-sm"></i> Lưu hồ sơ`;
                }
            }
        });
    }

    // Submit đổi mật khẩu tài khoản
    if (passForm) {
        passForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = passForm.querySelector('button[type="submit"]');
            const oldPass = document.getElementById('pass-old').value;
            const newPass = document.getElementById('pass-new').value;
            const confirmPass = document.getElementById('pass-confirm').value;

            if (newPass !== confirmPass) {
                showToast("❌ Mật khẩu mới và xác nhận mật khẩu không khớp!", "danger");
                return;
            }

            if (newPass.length < 6) {
                showToast("❌ Mật khẩu mới phải tối thiểu từ 6 ký tự!", "danger");
                return;
            }

            // Trạng thái LOADING: Vô hiệu hóa nút bấm
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fas fa-spinner animate-spin text-sm"></i> Đang đổi...`;
            }

            try {
                // Gọi API đổi mật khẩu thật
                await window.apiClient.post('/api/vtd/member/change-password', {
                    oldPassword: oldPass,
                    newPassword: newPass
                });

                showToast("🎉 Đổi mật khẩu thành công! Hãy lưu giữ thông tin bảo mật.", "success");

                // Reset inputs
                document.getElementById('pass-old').value = '';
                document.getElementById('pass-new').value = '';
                document.getElementById('pass-confirm').value = '';
            } catch (err) {
                console.error("Lỗi khi đổi mật khẩu:", err);
                showToast("❌ Đổi mật khẩu thất bại: " + err.message, "danger");
            } finally {
                // Khôi phục nút bấm
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fas fa-check text-sm"></i> Thay đổi`;
                }
            }
        });
    }
}

// Hàm hiển thị Toast thông báo đẹp mắt
function showToast(message, type) {
    const toast = document.getElementById('profile-toast');
    if (!toast) return;

    toast.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'bg-red-50', 'text-red-700', 'border-red-200');

    if (type === 'success') {
        toast.className = "mb-6 p-4 rounded-xl text-xs font-extrabold text-center border bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm";
    } else {
        toast.className = "mb-6 p-4 rounded-xl text-xs font-extrabold text-center border bg-red-50 text-red-700 border-red-200 shadow-sm";
    }

    toast.innerText = message;

    // Cuộn mượt lên trên cùng nội dung để xem toast
    toast.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Tự ẩn sau 4 giây
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// ==========================================
// 7. LOGIC GỌI API HOÀN TIỀN (REFUND)
// ==========================================
let currentRefundPaymentId = null;

/**
 * Tiếp tục thanh toán đơn hàng PENDING
 */
window.continuePayment = async function (orderId) {
    if (!orderId) return;

    try {
        // Tải thông tin chi tiết đơn hàng và danh sách vé của đơn hàng này
        const [order, items] = await Promise.all([
            window.apiClient.get(`/api/vtd/member/orders/${orderId}`),
            window.apiClient.get(`/api/vtd/member/orders/${orderId}/items`)
        ]);

        if (!items || items.length === 0) {
            alert("⚠️ Đơn hàng không hợp lệ hoặc không chứa hạng vé nào.");
            return;
        }

        // Lấy thông tin sự kiện từ hạng vé đầu tiên
        const firstItem = items[0];
        const event = firstItem.ticketType?.event;
        if (!event) {
            alert("⚠️ Không tìm thấy thông tin sự kiện liên quan tới đơn hàng này.");
            return;
        }

        // Lấy thông tin tài khoản hiện tại từ LocalStorage để dự phòng
        let currentUser = null;
        try {
            currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch (e) { }

        // Dựng lại dữ liệu checkoutData đầy đủ
        const checkoutDataRaw = {
            eventId: Number(event.eventId),
            eventName: event.title,
            bannerImageUrl: event.bannerImageUrl || '../../assets/images/placeholder-event.jpg',
            items: items.map(item => ({
                ticketTypeId: Number(item.ticketType.ticketTypeId),
                typeName: item.ticketType.typeName,
                price: Number(item.priceAtTime || item.ticketType.price || 0),
                quantity: Number(item.quantity || 1),
                subtotal: Number(item.priceAtTime || item.ticketType.price || 0) * Number(item.quantity || 1)
            })),
            orderId: String(orderId),
            selectedPayment: 'BANK_TRANSFER', // Mặc định chuyển khoản, người dùng có thể đổi ở checkout
            customer: {
                name: order.user?.fullName || currentUser?.fullName || currentUser?.name || "",
                phone: order.user?.phoneNumber || currentUser?.phoneNumber || currentUser?.phone || "",
                email: order.user?.email || currentUser?.email || "",
                idcard: "",
                address: order.user?.address || currentUser?.address || ""
            },
            promotionCode: order.promotion?.code || null,
            subtotalAmount: Number(order.totalAmount || 0),
            discountAmount: Number(order.totalAmount || 0) - Number(order.finalAmount || 0),
            totalAmount: Number(order.finalAmount || 0)
        };

        const checkoutData = window.cartSession ? window.cartSession.attachUser(checkoutDataRaw) : checkoutDataRaw;

        // Đồng bộ dữ liệu này vào bộ nhớ trình duyệt để trang nat-checkout.html đọc được
        localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
        localStorage.setItem('pendingCheckout', JSON.stringify(checkoutData));
        sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));

        if (window.cartSession) {
            window.cartSession.setOrderId(orderId);
        } else {
            localStorage.setItem('currentOrderId', String(orderId));
        }

        // Chuyển hướng sang trang checkout
        const cartUrl = window.pageUtils ? window.pageUtils.resolveUrl('pages/user/nat-checkout.html') : 'nat-checkout.html';
        window.location.href = cartUrl;

    } catch (error) {
        console.error("Lỗi khi đồng bộ đơn hàng tiếp tục thanh toán:", error);
        alert("❌ Không thể tiếp tục thanh toán đơn hàng này. Chi tiết: " + (error.message || error));
    }
};

window.openOrderDetailModal = async function (orderId) {
    if (!orderId) return;

    const modal = document.getElementById('order-detail-modal');
    const body = document.getElementById('od-modal-body');
    const title = document.getElementById('od-modal-order-id');
    if (!modal || !body) return;

    if (title) title.textContent = `#BDHT${orderId}`;
    body.innerHTML = `
        <div class="flex flex-col items-center gap-3 py-8 text-slate-400">
            <i class="fas fa-spinner fa-spin text-2xl text-brand-orange"></i>
            <span class="text-xs font-bold">Đang tải chi tiết đơn hàng...</span>
        </div>
    `;

    openOrderDetailModalShell();

    try {
        const [order, items] = await Promise.all([
            window.apiClient.get(`/api/vtd/member/orders/${orderId}`),
            window.apiClient.get(`/api/vtd/member/orders/${orderId}/items`)
        ]);
        renderOrderDetailContent(order, Array.isArray(items) ? items : []);
    } catch (error) {
        console.error('Lỗi tải chi tiết đơn hàng:', error);
        body.innerHTML = `
            <div class="text-center py-8 bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-bold">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                Không thể tải chi tiết đơn hàng: ${error.message || 'Vui lòng thử lại.'}
            </div>
        `;
    }
};

function renderOrderDetailContent(order, items) {
    const body = document.getElementById('od-modal-body');
    if (!body) return;

    const statusInfo = getOrderStatusInfo(order?.status);
    const createdAt = order?.createdAt
        ? new Date(order.createdAt).toLocaleString('vi-VN', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
        : 'Không rõ';
    const totalAmount = Number(order?.totalAmount || 0);
    const finalAmount = Number(order?.finalAmount ?? order?.totalAmount ?? 0);
    const discount = Math.max(totalAmount - finalAmount, 0);

    // Thông tin khách hàng
    const customerName = order.user?.fullName || 'Không rõ';
    const customerEmail = order.user?.email || 'Không rõ';
    const customerPhone = order.user?.phoneNumber || 'Không rõ';

    // Mã giảm giá
    const promoCode = order.promotion?.code || null;
    const promoText = promoCode
        ? `<span class="bg-orange-50 text-brand-orange border border-orange-200 px-2 py-0.5 rounded text-[10px] font-black font-mono">${promoCode}</span>`
        : '<span class="text-slate-400 font-medium">Không áp dụng</span>';

    const rows = items.length ? items.map(item => {
        const ticketType = item.ticketType || {};
        const event = ticketType.event || {};
        const typeName = ticketType.typeName || item.ticketTypeName || item.typeName || 'Vé';
        const eventName = event.title || event.eventName || event.name || order?.eventName || 'Sự kiện';
        const unitPrice = Number(item.priceAtTime || ticketType.price || item.price || 0);
        const quantity = Number(item.quantity || 0);
        const subtotal = unitPrice * quantity;
        const eventImage = event.bannerImageUrl || '../../assets/images/placeholder-event.jpg';

        return `
            <tr class="border-b border-gray-100 last:border-b-0 hover:bg-slate-50/50 transition">
                <td class="py-3.5 pr-3 max-w-[300px]">
                    <div class="flex items-center gap-3">
                        <img src="${eventImage}" alt="${eventName}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100 shadow-sm" onerror="this.src='../../assets/images/placeholder-event.jpg'" />
                        <div class="truncate text-left">
                            <div class="font-extrabold text-slate-800 text-xs sm:text-sm truncate" title="${eventName}">${eventName}</div>
                            <div class="inline-block mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border border-brand-purple/10 text-brand-purple bg-purple-50/50">${typeName}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-3 text-center font-bold text-slate-650">${quantity}</td>
                <td class="py-3.5 px-3 text-right font-bold text-slate-650 font-mono">${unitPrice.toLocaleString('vi-VN')} VND</td>
                <td class="py-3.5 pl-3 text-right font-black text-brand-orange font-mono">${subtotal.toLocaleString('vi-VN')} VND</td>
            </tr>
        `;
    }).join('') : `
        <tr>
            <td colspan="4" class="py-8 text-center text-xs font-bold text-slate-400">
                <div class="flex flex-col items-center gap-2">
                    <i class="fas fa-inbox text-lg"></i>
                    <span>Không có chi tiết vé trong đơn hàng này.</span>
                </div>
            </td>
        </tr>
    `;

    body.innerHTML = `
        <!-- 1. Trạng thái tổng quát -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-left">
            <div class="bg-slate-50 border border-gray-150 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trạng thái đơn hàng</span>
                <span class="inline-block mt-1.5 self-start text-[10px] font-black uppercase px-3 py-1 rounded-full border ${statusInfo.className}">
                    ${statusInfo.label}
                </span>
            </div>
            <div class="bg-slate-50 border border-gray-150 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thời gian đặt mua</span>
                <span class="text-xs font-bold text-slate-800 mt-2 flex items-center gap-1.5">
                    <i class="far fa-clock text-slate-400"></i> ${createdAt}
                </span>
            </div>
            <div class="bg-slate-50 border border-gray-150 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng tiền thanh toán</span>
                <span class="text-sm font-black text-brand-orange mt-1.5 font-mono">
                    ${finalAmount.toLocaleString('vi-VN')} VND
                </span>
            </div>
        </div>

        <!-- 2. Thông tin khách hàng & Mã giảm giá -->
        <div class="border border-gray-150 rounded-2xl p-5 mb-6 bg-white shadow-sm flex flex-col gap-4 text-left">
            <h4 class="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-gray-100 pb-2 flex items-center gap-2">
                <i class="fas fa-user-tag text-brand-purple"></i> Thông tin khách hàng & Ưu đãi
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs font-bold text-slate-650">
                <div class="flex items-center gap-2">
                    <i class="far fa-user text-slate-400 text-sm w-4 flex-shrink-0"></i>
                    <span class="text-slate-400 font-semibold mr-1">Họ tên:</span>
                    <span class="text-slate-800 font-extrabold">${customerName}</span>
                </div>
                <div class="flex items-center gap-2">
                    <i class="far fa-envelope text-slate-400 text-sm w-4 flex-shrink-0"></i>
                    <span class="text-slate-400 font-semibold mr-1">Email:</span>
                    <span class="text-slate-800 font-extrabold truncate" title="${customerEmail}">${customerEmail}</span>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fas fa-mobile-alt text-slate-400 text-sm w-4 flex-shrink-0"></i>
                    <span class="text-slate-400 font-semibold mr-1">SĐT:</span>
                    <span class="text-slate-800 font-extrabold">${customerPhone}</span>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fas fa-ticket-alt text-slate-400 text-sm w-4 flex-shrink-0"></i>
                    <span class="text-slate-400 font-semibold mr-1">Mã giảm giá:</span>
                    ${promoText}
                </div>
            </div>
        </div>

        <!-- 3. Danh sách vé đặt mua -->
        <div class="border border-gray-150 rounded-2xl overflow-hidden shadow-sm bg-white mb-6 text-left">
            <div class="bg-gray-50 border-b border-gray-150 p-4">
                <h4 class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <i class="fas fa-ticket-alt text-brand-orange"></i> Danh sách vé sự kiện đã chọn
                </h4>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-xs">
                    <thead class="bg-slate-50/50 text-slate-400 uppercase tracking-widest text-[9px] font-black border-b border-gray-100">
                        <tr>
                            <th class="py-3 px-4 text-left">Sự kiện / Loại vé</th>
                            <th class="py-3 px-3 text-center w-14">SL</th>
                            <th class="py-3 px-3 text-right">Đơn giá</th>
                            <th class="py-3 px-4 text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 4. Chi tiết tính toán chi phí -->
        <div class="bg-gray-50 border border-gray-150 rounded-2xl p-5 flex flex-col gap-2.5 text-xs font-bold shadow-inner text-left">
            <div class="flex justify-between text-slate-500">
                <span class="font-semibold">Tổng giá trị đơn hàng</span>
                <span class="font-mono font-bold text-slate-700">${totalAmount.toLocaleString('vi-VN')} VND</span>
            </div>
            <div class="flex justify-between text-emerald-600">
                <span class="font-semibold">Khuyến mãi & Giảm giá</span>
                <span class="font-mono font-bold">-${discount.toLocaleString('vi-VN')} VND</span>
            </div>
            <div class="flex justify-between text-slate-900 border-t border-gray-200 pt-3 mt-1.5">
                <span class="text-sm font-extrabold text-slate-850 uppercase tracking-wider">Tổng tiền thanh toán</span>
                <span class="text-base font-black text-brand-orange font-mono">${finalAmount.toLocaleString('vi-VN')} VND</span>
            </div>
        </div>
    `;
}

function openOrderDetailModalShell() {
    const modal = document.getElementById('order-detail-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        const content = modal.querySelector('.order-detail-modal-content');
        if (content) {
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }
    });
}

function closeOrderDetailModal() {
    const modal = document.getElementById('order-detail-modal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    const content = modal.querySelector('.order-detail-modal-content');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.openRefundModal = function (paymentId) {
    currentRefundPaymentId = paymentId;
    document.getElementById('refund-payment-id').innerText = paymentId;

    const modal = document.getElementById('refund-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.bg-white').classList.remove('scale-95');
    }, 10);
};

window.closeRefundModal = function () {
    const modal = document.getElementById('refund-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('.bg-white').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('refund-form').reset();
    }, 300);
};

document.getElementById('refund-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentRefundPaymentId) return;

    const btnSubmit = document.getElementById('btn-submit-refund');
    const reason = document.getElementById('refund-reason').value;

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang xử lý...';
        btnSubmit.classList.add('opacity-70');
    }

    try {
        // Gọi API backend (cũ) để xử lý hoàn tiền theo Payment ID
        await window.apiClient.post(`/api/vtd/member/payments/${currentRefundPaymentId}/refund`, { reason: reason });

        alert('Gửi yêu cầu hoàn tiền thành công! hãy chờ Đội ngũ ADMIN của chúng tôi duyệt nhé!.');
        closeRefundModal();
    } catch (error) {
        console.error("Refund Error:", error);
        alert('Lỗi: ' + error.message + '   Sự kiện đã bắt đầu hoặc kết thúc');
    } finally {
        // Reset Button State
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Gửi Yêu Cầu';
        btnSubmit.classList.remove('opacity-70');
    }
});

// ==========================================================
// HỦY ĐƠN HÀNG PENDING - CANCEL ORDER SYSTEM
// ==========================================================

let currentCancelOrderId = null;

/**
 * Mở popup xác nhận hủy đơn hàng
 */
function openCancelOrderModal(orderId) {
    currentCancelOrderId = orderId;

    const modal = document.getElementById('cancel-order-modal');
    const orderIdDisplay = document.getElementById('cancel-order-id-display');
    if (!modal) return;

    // Cập nhật mã đơn hàng trong modal
    if (orderIdDisplay) orderIdDisplay.textContent = `#BDHT${orderId}`;

    // Hiện modal với animation
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        const content = modal.querySelector('.cancel-modal-content');
        if (content) {
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }
    });
}

/**
 * Đóng popup xác nhận hủy đơn hàng
 */
function closeCancelOrderModal() {
    const modal = document.getElementById('cancel-order-modal');
    if (!modal) return;

    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    const content = modal.querySelector('.cancel-modal-content');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }

    setTimeout(() => {
        modal.classList.add('hidden');
        currentCancelOrderId = null;
    }, 300);
}

/**
 * Thực hiện hủy đơn hàng
 * Gọi DELETE /api/vtd/member/orders/{orderId}/cancel
 * Cập nhật UI inline không reload trang
 */
async function executeCancelOrder() {
    if (!currentCancelOrderId) return;

    const confirmBtn = document.getElementById('btn-cancel-confirm');
    const orderId = currentCancelOrderId;

    // Trạng thái loading
    const oldBtnHtml = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

    try {
        await window.apiClient.delete(`/api/vtd/member/orders/${orderId}/cancel`);

        // === CẬP NHẬT UI INLINE (KHÔNG RELOAD TRANG) ===

        // 1. Cập nhật badge trạng thái: PENDING → CANCELLED
        const statusBadge = document.getElementById(`order-status-${orderId}`);
        if (statusBadge) {
            statusBadge.className = 'inline-block text-[9px] font-extrabold uppercase px-3 py-1 rounded-full border text-red-500 bg-red-50 border-red-100';
            statusBadge.textContent = 'Đã hủy';

            // Hiệu ứng nhấp nháy khi thay đổi
            statusBadge.style.transition = 'all 0.3s ease';
            statusBadge.style.transform = 'scale(1.15)';
            setTimeout(() => { statusBadge.style.transform = 'scale(1)'; }, 300);
        }

        // 2. Ẩn/disable nút Hủy đơn hàng
        const cancelBtn = document.getElementById(`btn-cancel-order-${orderId}`);
        if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.classList.add('opacity-30', 'pointer-events-none');
            cancelBtn.innerHTML = '<i class="fas fa-check-circle text-[9px]"></i> Đã hủy';
        }

        // 3. Đóng modal
        closeCancelOrderModal();

        // 4. Hiển thị toast thành công
        showProfileToast('success', `Đơn hàng #BDHT${orderId} đã được hủy thành công.`);

    } catch (error) {
        console.error('Lỗi hủy đơn hàng:', error);
        closeCancelOrderModal();
        showProfileToast('error', error.message || 'Không thể hủy đơn hàng. Vui lòng thử lại.');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = oldBtnHtml;
    }
}

/**
 * Hiển thị toast thông báo trong trang profile
 */
function showProfileToast(type, message) {
    const toast = document.getElementById('profile-toast');
    if (!toast) return;

    const isSuccess = type === 'success';
    toast.className = `mb-6 p-4 rounded-xl text-xs font-extrabold text-center border flex items-center justify-center gap-2 ${isSuccess
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-red-50 border-red-200 text-red-600'
        }`;

    const icon = isSuccess ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    toast.innerHTML = `<i class="${icon}"></i> ${message}`;

    // Cuộn lên để thấy toast
    toast.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Tự ẩn sau 5 giây
    setTimeout(() => {
        toast.style.transition = 'opacity 0.4s ease';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.className = 'hidden mb-6 p-4 rounded-xl text-xs font-extrabold text-center border';
            toast.style.opacity = '';
            toast.style.transition = '';
        }, 400);
    }, 5000);
}

// ====== KẾT NỐI SỰ KIỆN CHO CANCEL MODAL ======
document.addEventListener('DOMContentLoaded', () => {
    const dismissBtn = document.getElementById('btn-cancel-dismiss');
    const confirmBtn = document.getElementById('btn-cancel-confirm');
    const cancelModal = document.getElementById('cancel-order-modal');
    const orderDetailCloseBtn = document.getElementById('btn-close-order-detail');
    const orderDetailModal = document.getElementById('order-detail-modal');

    if (dismissBtn) dismissBtn.addEventListener('click', closeCancelOrderModal);
    if (confirmBtn) confirmBtn.addEventListener('click', executeCancelOrder);
    if (orderDetailCloseBtn) orderDetailCloseBtn.addEventListener('click', closeOrderDetailModal);

    // Đóng modal khi click bên ngoài
    if (cancelModal) {
        cancelModal.addEventListener('click', (e) => {
            if (e.target === cancelModal) closeCancelOrderModal();
        });
    }
    if (orderDetailModal) {
        orderDetailModal.addEventListener('click', (e) => {
            if (e.target === orderDetailModal) closeOrderDetailModal();
        });
    }
});

// ==========================================================
// KẾT NỐI LUỒNG YÊU CẦU HOÀN TIỀN (TỪ ORDER ID -> PAYMENT ID)
// ==========================================================

/**
 * Mở modal yêu cầu hoàn tiền từ danh sách đơn hàng
 * Hàm này sẽ map Order ID sang Payment ID bằng cách gọi API, sau đó mới mở Modal.
 */
window.openRefundModalForOrder = async function (orderId) {
    // Có thể vô hiệu hóa tạm thời UI hoặc hiển thị Loading nhẹ nếu cần
    const statusBadge = document.getElementById(`order-status-${orderId}`);
    const originalText = statusBadge ? statusBadge.innerText : '';

    if (statusBadge) statusBadge.innerText = 'Đang kiểm tra...';

    try {
        // 1. Gọi API lấy thông tin thanh toán của đơn hàng (Đã có sẵn trong VtdPaymentController)
        const payment = await window.apiClient.get(`/api/vtd/member/payments/order/${orderId}`);

        if (!payment || !payment.paymentId) {
            showToast("⚠️ Không tìm thấy giao dịch thanh toán hợp lệ để hoàn tiền.", "danger");
            return;
        }

        // 2. Mở Modal hoàn tiền với paymentId vừa lấy được
        openRefundModal(payment.paymentId);

    } catch (error) {
        console.error("Lỗi khi lấy thông tin thanh toán để hoàn tiền:", error);

        // Bắt lỗi cụ thể (Ví dụ: Đơn hàng không tồn tại, hoặc không có quyền truy cập)
        showToast("❌ Không thể xử lý yêu cầu: " + (error.message || "Vui lòng thử lại sau."), "danger");
    } finally {
        // Trả lại trạng thái UI ban đầu
        if (statusBadge) statusBadge.innerText = originalText;
    }
};
// ==========================================================
// KIỂM TRA TRẠNG THÁI THANH TOÁN - PAYMENT STATUS CHECK
// ==========================================================

/**
 * Mở modal và gọi API kiểm tra trạng thái thanh toán
 * GET /api/vtd/member/payments/{paymentId}
 */
async function checkPaymentStatus(paymentId, orderId) {
    const modal = document.getElementById('payment-status-modal');
    const body = document.getElementById('ps-modal-body');
    const orderIdEl = document.getElementById('ps-modal-order-id');
    if (!modal || !body) return;

    // Hiện modal với loading
    if (orderIdEl) orderIdEl.textContent = `#BDHT${orderId}`;
    body.innerHTML = `
        <div class="flex flex-col items-center gap-3 py-6">
            <i class="fas fa-spinner fa-spin text-2xl text-brand-orange"></i>
            <span class="text-xs font-bold text-slate-400">Đang truy vấn trạng thái...</span>
        </div>
    `;
    openPaymentStatusModal();

    try {
        const payment = await window.apiClient.get(`/api/vtd/member/payments/${paymentId}`);
        renderPaymentStatusContent(payment, orderId);
    } catch (error) {
        console.error('Lỗi kiểm tra thanh toán:', error);
        body.innerHTML = `
            <div class="flex flex-col items-center gap-3 py-6">
                <div class="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <i class="fas fa-exclamation-circle text-2xl text-red-400"></i>
                </div>
                <span class="text-sm font-bold text-slate-800">Không thể truy vấn</span>
                <span class="text-xs text-slate-400 font-medium text-center">${error.message || 'Vui lòng thử lại sau.'}</span>
            </div>
        `;
    }
}

/**
 * Render nội dung chi tiết thanh toán trong modal
 */
function renderPaymentStatusContent(payment, orderId) {
    const body = document.getElementById('ps-modal-body');
    if (!body) return;

    // Mapping trạng thái thanh toán
    const statusMap = {
        'PENDING': { label: 'Đang chờ xử lý', icon: 'fas fa-hourglass-half', color: 'amber', desc: 'Giao dịch đang chờ ngân hàng hoặc cổng thanh toán xác nhận.' },
        'COMPLETED': { label: 'Thanh toán thành công', icon: 'fas fa-check-circle', color: 'emerald', desc: 'Giao dịch đã được xác nhận thành công. Vé sẽ xuất hiện trong Kho vé.' },
        'FAILED': { label: 'Thanh toán thất bại', icon: 'fas fa-times-circle', color: 'red', desc: 'Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức khác.' },
        'REFUNDED': { label: 'Đã hoàn tiền', icon: 'fas fa-undo', color: 'blue', desc: 'Giao dịch đã được hoàn tiền về tài khoản gốc.' },
        'REFUND_REQUESTED': { label: 'Đang chờ hoàn tiền', icon: 'fas fa-hourglass-half', color: 'amber', desc: 'Yêu cầu hoàn tiền đã được tiếp nhận và đang được xử lý.' },
    };

    const status = (payment.paymentStatus || payment.status || 'PENDING').toUpperCase();
    const info = statusMap[status] || statusMap['PENDING'];

    // Mapping phương thức thanh toán
    const methodLabels = {
        'CASH': 'Thanh toán tại quầy (COD)',
        'MOMO': 'Ví điện tử MoMo',
        'BANK': 'Chuyển khoản Ngân hàng',
        'VIETQR': 'VietQR',
    };
    const methodText = methodLabels[(payment.paymentMethod || '').toUpperCase()] || payment.paymentMethod || 'Không xác định';

    // Số tiền
    const amount = Number(payment.amount || payment.totalAmount || 0).toLocaleString('vi-VN') + ' VNĐ';

    // Ngày giao dịch
    const dateStr = payment.paymentDate || payment.createdAt
        ? new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('vi-VN', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
        : 'Chưa ghi nhận';

    const colorMap = {
        amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', iconBg: 'bg-amber-100' },
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
        red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-500', iconBg: 'bg-red-100' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    };
    const c = colorMap[info.color] || colorMap.amber;

    body.innerHTML = `
        <!-- Status Badge lớn -->
        <div class="${c.bg} ${c.border} border rounded-2xl p-5 flex flex-col items-center gap-3">
            <div class="w-14 h-14 rounded-full ${c.iconBg} flex items-center justify-center">
                <i class="${info.icon} text-2xl ${c.text}"></i>
            </div>
            <span class="text-sm font-extrabold ${c.text} uppercase tracking-wide">${info.label}</span>
            <p class="text-[11px] text-slate-500 font-medium text-center leading-relaxed">${info.desc}</p>
        </div>

        <!-- Chi tiết giao dịch -->
        <div class="flex flex-col gap-3 pt-1">
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã thanh toán</span>
                <span class="text-xs font-black text-slate-800 font-mono">#PAY${payment.paymentId || paymentId}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phương thức</span>
                <span class="text-xs font-bold text-slate-700">${methodText}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số tiền</span>
                <span class="text-xs font-black text-brand-orange">${amount}</span>
            </div>
            <div class="flex items-center justify-between py-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian</span>
                <span class="text-xs font-bold text-slate-700">${dateStr}</span>
            </div>
        </div>
    `;
}

function openPaymentStatusModal() {
    const modal = document.getElementById('payment-status-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        const content = modal.querySelector('.payment-modal-content');
        if (content) {
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }
    });
}

function closePaymentStatusModal() {
    const modal = document.getElementById('payment-status-modal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    const content = modal.querySelector('.payment-modal-content');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

// Kết nối sự kiện cho Payment Status Modal
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('btn-close-payment-status');
    const psModal = document.getElementById('payment-status-modal');
    if (closeBtn) closeBtn.addEventListener('click', closePaymentStatusModal);
    if (psModal) {
        psModal.addEventListener('click', (e) => {
            if (e.target === psModal) closePaymentStatusModal();
        });
    }
});
