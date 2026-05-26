/**
 * =========================================================================
 * DỰ ÁN HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT - PHÂN HỆ KHÁCH HÀNG (MEMBER)
 * FILE: profile.js
 * CHỨC NĂNG: Quản lý hồ sơ cá nhân, lịch sử hóa đơn đặt vé, đổi mật khẩu và kho vé điện tử QR soát vé
 * =========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- CHỐT CHẶN BẢO VỆ ROUTE GUARD ---
    // Kiểm tra quyền truy cập: Nếu chưa có token thì bắt buộc phải đăng nhập trước
    const token = localStorage.getItem('token'); 
    if (!token) {
        alert("⚠️ Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục!");
        window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('pages/user/nat-login.html') : './nat-login.html'; 
        return; // Dừng ngay việc thực thi các hàm bên dưới để đảm bảo an toàn thông tin
    }

    // Tải Header động nếu có file pageUtils hỗ trợ
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }

    // Kích hoạt các tính năng của trang cá nhân
    setupTabNavigation();         // Chuyển đổi tab điều hướng bên trái
    loadProfileDetails();         // Tải thông tin hồ sơ người dùng
    loadTransactionHistory();     // Tải lịch sử đơn hàng
    loadMyTickets();             // Tải kho vé điện tử của tôi
    setupFormSubmissions();       // Đăng ký sự kiện submit form (Hồ sơ & Đổi mật khẩu)
    setupOrderFilterTabs();       // Đăng ký bộ lọc trạng thái đơn hàng
});

/**
 * =========================================================================
 * 1. QUẢN LÝ CHUYỂN TAB ĐIỀU HƯỚNG BÊN TRÁI (DYNAMIC TAB SWITCHING)
 * =========================================================================
 */
function setupTabNavigation() {
    // Các nút bấm menu ở cột trái
    const menuButtons = {
        account: document.getElementById('menu-btn-account'),
        history: document.getElementById('menu-btn-history'),
        password: document.getElementById('menu-btn-password'),
        tickets: document.getElementById('menu-btn-tickets')
    };

    // Các phân vùng hiển thị nội dung bên phải tương ứng
    const tabs = {
        account: document.getElementById('tab-account'),
        history: document.getElementById('tab-history'),
        password: document.getElementById('tab-password'),
        tickets: document.getElementById('tab-tickets')
    };

    /**
     * Hàm nội bộ thực hiện chuyển tab
     * @param {string} activeKey - Từ khóa định danh Tab được kích hoạt
     */
    const switchTab = (activeKey) => {
        // Cập nhật trạng thái class kích hoạt (active/inactive) trên menu buttons
        Object.keys(menuButtons).forEach(key => {
            const btn = menuButtons[key];
            if (!btn) return;

            if (key === activeKey) {
                btn.className = "profile-menu-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-brand-orange bg-orange-50/50 transition-all duration-200";
            } else {
                btn.className = "profile-menu-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-brand-orange transition-all duration-200";
            }
        });

        // Cập nhật hiển thị/ẩn tab bên tay phải
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

    // Đăng ký sự kiện click chuột cho từng nút menu
    Object.keys(menuButtons).forEach(key => {
        const btn = menuButtons[key];
        if (btn) {
            btn.addEventListener('click', () => switchTab(key));
        }
    });

    // Mặc định kích hoạt mở tab account (Thông tin tài khoản) đầu tiên khi mở trang
    switchTab('account');
}

/**
 * =========================================================================
 * 2. TẢI VÀ ĐỒNG BỘ THÔNG TIN HỒ SƠ TÀI KHOẢN TỪ BACKEND
 * =========================================================================
 */
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
            // Điền thông tin người dùng vào các ô nhập liệu (inputs)
            if (fullNameInput) fullNameInput.value = user.fullName || "";
            if (phoneInput) phoneInput.value = user.phoneNumber || "";
            if (emailInput) emailInput.value = user.email || "";
            
            // Cập nhật thông tin hiển thị lên Sidebar (Tên & Kự tự Avatar)
            if (nameSidebar) nameSidebar.innerText = user.fullName || "Thành viên BDHT";
            if (avatarChar && user.fullName) {
                avatarChar.innerText = user.fullName.charAt(0).toUpperCase();
            }

            // Đồng bộ dữ liệu người dùng mới nhất vào LocalStorage
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    } catch (e) {
        console.error("Lỗi khi tải thông tin hồ sơ từ API thực tế:", e);
        showToast("❌ Không thể kết nối tới máy chủ hoặc phiên đăng nhập đã hết hạn!", "danger");

        // Hồi phục dữ liệu cũ từ LocalStorage làm fallback nếu gặp lỗi mất mạng
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                let userDetails = JSON.parse(storedUser);
                if (fullNameInput) fullNameInput.value = userDetails.fullName || "";
                if (phoneInput) phoneInput.value = userDetails.phoneNumber || "";
                if (emailInput) emailInput.value = userDetails.email || "";
                if (nameSidebar) nameSidebar.innerText = userDetails.fullName || "Thành viên BDHT";
                if (avatarChar && userDetails.fullName) {
                    avatarChar.innerText = userDetails.fullName.charAt(0).toUpperCase();
                }
            } catch (err) {}
        }
    }
}

/**
 * =========================================================================
 * 3. TẢI VÀ LỌC LỊCH SỬ GIAO DỊCH ĐƠN HÀNG (TRANSACTION HISTORY)
 * =========================================================================
 */
// Biến trạng thái theo dõi bộ lọc hiện tại (ALL: Tất cả, PENDING: Chờ, CONFIRMED: Thành công, CANCELLED: Đã hủy)
let currentOrderFilter = 'ALL';

/**
 * Tải danh sách lịch sử giao dịch mua vé sự kiện từ Backend
 * @param {string} statusFilter - Bộ lọc trạng thái đơn hàng
 */
async function loadTransactionHistory(statusFilter) {
    const container = document.getElementById('history-list');
    if (!container) return;

    // Cập nhật trạng thái bộ lọc hiện tại
    const filter = (statusFilter || currentOrderFilter || 'ALL').toUpperCase();
    currentOrderFilter = filter;

    // Hiệu ứng mờ dần (Fade) để tạo cảm giác chuyên nghiệp khi đang kết nối API
    container.style.transition = 'opacity 0.15s ease';
    container.style.opacity = '0.4';

    container.innerHTML = `
        <div class="text-center py-8 text-slate-405 text-xs font-bold flex flex-col items-center gap-2">
            <i class="fas fa-spinner animate-spin text-lg text-brand-orange"></i>
            <span>Đang truy vấn lịch sử giao dịch từ máy chủ...</span>
        </div>
    `;
    container.style.opacity = '1';

    try {
        let orders;
        // Gọi API tương ứng tùy theo bộ lọc đã chọn
        if (filter === 'ALL') {
            orders = await window.apiClient.get('/api/vtd/member/orders');
        } else {
            orders = await window.apiClient.get(`/api/vtd/member/orders/status?status=${filter}`);
        }

        // Xử lý dữ liệu trả về (Hỗ trợ cấu trúc mảng trơn hoặc cấu trúc Page trong Spring Boot)
        const orderList = Array.isArray(orders) ? orders : (orders?.content || []);

        // Trường hợp rỗng (không có đơn hàng nào)
        if (!orderList || orderList.length === 0) {
            const filterLabels = { 'ALL': '', 'PENDING': ' đang chờ thanh toán', 'CONFIRMED': ' đã hoàn thành', 'CANCELLED': ' đã hủy' };
            container.style.opacity = '0';
            setTimeout(() => {
                container.innerHTML = `
                    <div class="text-center py-10 bg-slate-50 border border-gray-150 rounded-2xl p-6 flex flex-col items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-450">
                            <i class="fas fa-inbox text-lg"></i>
                        </div>
                        <div class="flex flex-col gap-0.5">
                            <span class="text-xs font-black text-slate-800 uppercase tracking-wider">Không tìm thấy giao dịch${filterLabels[filter] || ''}</span>
                            <span class="text-[10px] text-slate-400 font-bold">${filter === 'ALL' ? 'Bạn chưa đặt mua chiếc vé sự kiện nào.' : 'Không có đơn hàng nào khớp với trạng thái này.'}</span>
                        </div>
                    </div>
                `;
                container.style.opacity = '1';
            }, 150);
            return;
        }

        // Vẽ danh sách hóa đơn đơn hàng lên giao diện
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
                <div class="text-center py-8 bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-bold">
                    <i class="fas fa-exclamation-triangle mr-1"></i> Có lỗi xảy ra trong quá trình kết nối dữ liệu. Vui lòng thử lại sau!
                </div>
            `;
            container.style.opacity = '1';
        }, 150);
    }
}

/**
 * Render cấu trúc mã HTML cho một thẻ đơn hàng (Order Card)
 * @param {Object} order - Dữ liệu đơn hàng chi tiết
 * @returns {string} - Chuỗi HTML đại diện cho đơn hàng
 */
function renderOrderCard(order) {
    const dateStr = new Date(order.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const totalStr = Number(order.totalAmount).toLocaleString('vi-VN') + " đ";

    // Phân loại nhãn hiển thị và màu sắc tùy trạng thái đơn hàng
    let statusText = "Chờ thanh toán";
    let statusClass = "text-brand-orange bg-orange-50 border-orange-100";
    if (order.status === 'CONFIRMED' || order.status === 'COMPLETED') {
        statusText = "Đã hoàn thành";
        statusClass = "text-emerald-500 bg-emerald-50 border-emerald-100";
    } else if (order.status === 'CANCELLED') {
        statusText = "Đã hủy";
        statusClass = "text-red-500 bg-red-50 border-red-100";
    }

    // Lấy ID giao dịch thanh toán đã lưu (nếu có)
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
                    
                    <!-- Nhóm nút bấm rẽ nhánh logic tương tác phù hợp -->
                    ${(order.status === 'CONFIRMED' || order.status === 'COMPLETED') && savedPaymentId ? `
                        <button type="button" onclick="openRefundModal(${savedPaymentId})" 
                            class="text-[10px] font-bold text-slate-500 hover:text-brand-orange transition underline">
                            Yêu cầu hoàn tiền
                        </button>` : ''}
                    
                    ${order.status === 'PENDING' ? `
                        <div class="flex items-center gap-3">
                            <button type="button" onclick="continuePayment(${order.orderId})"
                                class="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-orange hover:text-orange-650 transition-colors">
                                <i class="fas fa-credit-card text-[9px]"></i> Tiếp tục thanh toán
                            </button>
                            <button type="button" id="btn-cancel-order-${order.orderId}" onclick="openCancelOrderModal(${order.orderId})"
                                class="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors group">
                                <i class="fas fa-ban text-[9px] group-hover:animate-pulse"></i> Hủy đơn hàng
                            </button>
                        </div>
                    ` : ''}
                    
                    ${order.paymentId || savedPaymentId ? `
                        <button type="button" onclick="checkPaymentStatus(${order.paymentId || savedPaymentId}, ${order.orderId})"
                            class="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 hover:text-indigo-755 transition-colors mt-1">
                            <i class="fas fa-search-dollar text-[9px]"></i> Đối soát thanh toán
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Thiết lập lắng nghe sự kiện Click trên thanh bộ lọc trạng thái đơn hàng
 */
function setupOrderFilterTabs() {
    const filterBar = document.getElementById('order-filter-bar');
    if (!filterBar) return;

    filterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.order-filter-btn');
        if (!btn) return;

        const filter = btn.dataset.filter;
        if (!filter || filter === currentOrderFilter) return;

        // Cập nhật giao diện hoạt động của nút bấm
        updateFilterActiveState(btn);

        // Tải lại danh sách theo bộ lọc mới
        loadTransactionHistory(filter);
    });
}

/**
 * Cập nhật style CSS active cho nút bộ lọc đang được chọn
 * @param {HTMLElement} activeBtn - Phần tử nút bấm được kích hoạt
 */
function updateFilterActiveState(activeBtn) {
    const allBtns = document.querySelectorAll('.order-filter-btn');
    const inactiveClasses = 'bg-white text-slate-500 border-gray-200';
    const activeClasses = 'bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/20';

    allBtns.forEach(btn => {
        btn.classList.remove('active-filter', ...activeClasses.split(' '));
        btn.classList.remove('border-amber-400', 'text-amber-600', 'border-emerald-400', 'text-emerald-600', 'border-red-400', 'text-red-600');
        inactiveClasses.split(' ').forEach(cls => btn.classList.add(cls));
    });

    activeBtn.classList.add('active-filter');
    inactiveClasses.split(' ').forEach(cls => activeBtn.classList.remove(cls));
    activeClasses.split(' ').forEach(cls => activeBtn.classList.add(cls));

    // Hiệu ứng zoom nhẹ tạo phản hồi tương tác mượt mà
    activeBtn.style.transform = 'scale(1.05)';
    setTimeout(() => { activeBtn.style.transform = ''; }, 200);
}

/**
 * =========================================================================
 * 4. TẢI DANH SÁCH VÉ ĐIỆN TỬ CỦA TÀI KHOẢN (MY TICKETS STORE)
 * =========================================================================
 */
async function loadMyTickets() {
    const container = document.getElementById('my-tickets-list');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-8 text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
            <i class="fas fa-spinner animate-spin text-lg text-brand-orange"></i>
            <span>Đang tải kho vé điện tử an toàn...</span>
        </div>
    `;

    try {
        // Lấy danh sách vé đã mua thành công từ Backend
        const tickets = await window.apiClient.get('/api/vtd/member/my-tickets');

        if (!tickets || tickets.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10 bg-slate-50 border border-gray-150 rounded-2xl p-6 flex flex-col items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-450">
                        <i class="fas fa-qrcode text-lg"></i>
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-xs font-black text-slate-800 uppercase tracking-wider">Kho vé điện tử trống</span>
                        <span class="text-[10px] text-slate-400 font-bold">Bạn chưa sở hữu tấm vé sự kiện nào ở tài khoản này.</span>
                    </div>
                </div>
            `;
            return;
        }

        // Render kho vé điện tử dưới dạng thẻ danh sách sang trọng
        container.innerHTML = tickets.map(ticket => {
            const statusClass = ticket.checkInStatus 
                ? "text-slate-400 bg-slate-50 border-slate-200" 
                : "text-emerald-500 bg-emerald-50 border-emerald-100";

            return `
                <div class="border border-gray-150 rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-4 w-full md:w-auto">
                        <div class="w-12 h-12 rounded-xl bg-purple-50 text-brand-purple flex items-center justify-center text-lg shadow-inner flex-shrink-0">
                            <i class="fas fa-qrcode"></i>
                        </div>
                        <div class="flex flex-col gap-0.5 truncate">
                            <h4 class="text-xs sm:text-sm font-extrabold text-slate-800">Mã kiểm soát: ${ticket.qrCode}</h4>
                            <span class="text-[10px] text-slate-400 font-bold">Hạng vé: ${ticket.ticketType?.typeName || 'Vé phổ thông'}</span>
                            <span class="inline-block self-start text-[9px] font-black uppercase px-2 py-0.5 rounded border mt-1 ${statusClass}">
                                ${ticket.checkInStatus ? 'Đã soát vé' : 'Sẵn sàng sử dụng'}
                            </span>
                        </div>
                    </div>
                    <div class="w-full md:w-auto flex justify-end">
                        <button type="button" onclick="showTicketQrModal(${ticket.ticketId}, '${String(ticket.qrCode).replace(/'/g, "\\'")}')" 
                            class="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition duration-200 shadow-sm w-full md:w-auto">
                            Hiển Thị QR Vé
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Lỗi khi tải kho vé điện tử từ API:", e);
        container.innerHTML = `
            <div class="text-center py-8 bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-bold">
                <i class="fas fa-exclamation-triangle mr-1"></i> Không thể truy cập dữ liệu kho vé lúc này. Vui lòng thử lại!
            </div>
        `;
    }
}

/**
 * =========================================================================
 * 5. POPUP HIỂN THỊ MÃ SÁO VÉ QR CODE CHI TIẾT (TICKET QR CODE MODAL)
 * =========================================================================
 */
window.showTicketQrModal = async function(ticketId, ticketCode) {
    const modal = document.getElementById('ticket-qr-modal');
    const qrImg = document.getElementById('ticket-qr-img');
    const content = modal?.querySelector('.ticket-modal-content');
    
    // Các phần tử thông tin trên vé
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

    // Reset lại giao diện và hiển thị trạng thái đang tải
    elEventName.innerText = 'Đang truy vấn dữ liệu vé...';
    elVenue.innerHTML = '<i class="fas fa-map-marker-alt mr-1"></i> -';
    elTime.innerText = '-';
    elZone.innerText = '-';
    elGate.innerText = '-';
    elSeat.innerText = '-';
    elQrCodeText.innerText = ticketCode || '-';
    
    qrLoading?.classList.remove('hidden');
    qrWrapper?.classList.add('hidden');
    if (qrImg) qrImg.src = '';

    // Mở popup modal kèm hiệu ứng chuyển động mượt mà
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if (content) content.classList.remove('scale-95');
    }, 10);

    try {
        // Gọi API chi tiết vé từ Backend
        const ticketData = await window.apiClient.get(`/api/vtd/member/tickets/${ticketId}`);
        
        const eventName = ticketData.event?.name || ticketData.eventName || 'Sự Kiện Đã Đặt';
        const venueName = ticketData.event?.venue?.name || ticketData.venueName || 'Địa điểm tổ chức';
        const startTime = ticketData.event?.startTime || ticketData.startTime || 'Chưa cập nhật';
        const typeName = ticketData.ticketType?.typeName || ticketData.typeName || 'Vé phổ thông';
        
        // Định dạng thời gian hiển thị tiếng Việt
        let formattedTime = startTime;
        if (startTime && startTime.includes('T')) {
            const d = new Date(startTime);
            formattedTime = d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) + ' - ' + d.toLocaleDateString('vi-VN');
        }

        if (elEventName) elEventName.innerText = eventName;
        if (elVenue) elVenue.innerHTML = `<i class="fas fa-map-marker-alt mr-1"></i> ${venueName}`;
        if (elTime) elTime.innerText = formattedTime;
        if (elZone) elZone.innerText = typeName;
        if (elGate) elGate.innerText = ticketData.gate || 'Cổng tự do';
        if (elSeat) elSeat.innerText = ticketData.seatNumber || 'Hạng vé tự do';
    } catch (error) {
        console.error("Lỗi lấy chi tiết vé:", error);
        if (elEventName) elEventName.innerText = 'Lỗi kết nối máy chủ';
    } finally {
        // Tạo ảnh QR Code thông qua API tạo mã QR uy tín toàn cầu
        if (qrImg) {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketCode)}`;
            qrImg.onload = () => {
                qrLoading?.classList.add('hidden');
                qrWrapper?.classList.remove('hidden');
            };
        }
    }
};

/**
 * Đóng Modal QR vé điện tử soát cổng
 */
window.closeTicketQrModal = function() {
    const modal = document.getElementById('ticket-qr-modal');
    if (!modal) return;
    
    const content = modal.querySelector('.ticket-modal-content');
    
    modal.classList.add('opacity-0');
    if (content) content.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }, 300);
};

/**
 * =========================================================================
 * 6. XỬ LÝ ĐĂNG KÝ HỒ SƠ & THAY ĐỔI MẬT KHẨU (FORM SUBMISSIONS)
 * =========================================================================
 */
function setupFormSubmissions() {
    const accForm = document.getElementById('account-form');
    const passForm = document.getElementById('password-form');

    // Sự kiện lưu cập nhật thông tin hồ sơ
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

            // Trạng thái LOADING
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fas fa-spinner animate-spin text-sm"></i> Đang cập nhật...`;
            }

            try {
                // Gọi API PUT cập nhật thông tin thật
                const updatedUser = await window.apiClient.put('/api/vtd/member/profile', {
                    fullName: fullName,
                    phoneNumber: phone
                });

                showToast("🎉 Lưu thông tin cá nhân thành công!", "success");
                
                if (updatedUser) {
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    loadProfileDetails();
                }
            } catch (err) {
                console.error("Lỗi khi cập nhật hồ sơ:", err);
                showToast("❌ Lỗi: " + err.message, "danger");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fas fa-check text-sm"></i> Lưu hồ sơ`;
                }
            }
        });
    }

    // Sự kiện đổi mật khẩu tài khoản bảo mật
    if (passForm) {
        passForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = passForm.querySelector('button[type="submit"]');
            const oldPass = document.getElementById('pass-old').value;
            const newPass = document.getElementById('pass-new').value;
            const confirmPass = document.getElementById('pass-confirm').value;

            if (newPass !== confirmPass) {
                showToast("❌ Mật khẩu xác nhận không trùng khớp!", "danger");
                return;
            }

            if (newPass.length < 6) {
                showToast("❌ Mật khẩu mới cần tối thiểu từ 6 ký tự trở lên!", "danger");
                return;
            }

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

                showToast("🎉 Thay đổi mật khẩu tài khoản thành công!", "success");
                passForm.reset();
            } catch (err) {
                console.error("Lỗi khi đổi mật khẩu:", err);
                showToast("❌ Thao tác thất bại: " + err.message, "danger");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fas fa-check text-sm"></i> Thay đổi`;
                }
            }
        });
    }
}

/**
 * Hiển thị Toast thông báo trạng thái hoạt động ở phần đầu của Form
 * @param {string} message - Câu thông điệp
 * @param {string} type - Thể loại 'success' hoặc 'danger'
 */
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
    
    // Cuộn màn hình mượt mà đến vùng hiển thị Toast thông báo
    toast.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Tự động ẩn thông báo sau 4 giây
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

/**
 * =========================================================================
 * 7. LOGIC XỬ LÝ HOÀN TIỀN GIAO DỊCH (PAYMENT REFUND MODAL)
 * =========================================================================
 */
let currentRefundPaymentId = null;

/**
 * Tiếp tục tiến hành thanh toán đơn hàng đang ở trạng thái PENDING
 * @param {number} orderId - Mã đơn hàng cần tiếp tục
 */
window.continuePayment = function(orderId) {
    if (!orderId) return;
    
    // Đặt orderId vào localStorage để trang Giỏ hàng/Thanh toán nhận dạng được
    localStorage.setItem('currentOrderId', orderId);
    
    // Chuyển hướng sang giỏ hàng (Cart)
    const cartUrl = window.pageUtils ? window.pageUtils.resolveUrl('pages/user/nat-cart.html') : 'nat-cart.html';
    window.location.href = cartUrl;
};

/**
 * Mở hộp thoại xác nhận yêu cầu hoàn tiền
 * @param {number} paymentId - Mã thanh toán của giao dịch
 */
window.openRefundModal = function(paymentId) {
    currentRefundPaymentId = paymentId;
    const paymentIdEl = document.getElementById('refund-payment-id');
    if (paymentIdEl) paymentIdEl.innerText = paymentId;
    
    const modal = document.getElementById('refund-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100');
            modal.querySelector('.bg-white')?.classList.remove('scale-95');
        }, 10);
    }
};

/**
 * Đóng hộp thoại xác nhận yêu cầu hoàn tiền
 */
window.closeRefundModal = function() {
    const modal = document.getElementById('refund-modal');
    if (!modal) return;

    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    modal.querySelector('.bg-white')?.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('refund-form')?.reset();
    }, 300);
};

// Đăng ký sự kiện submit form yêu cầu hoàn tiền
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
        // Gửi yêu cầu hoàn tiền đến máy chủ
        await window.apiClient.post(`/api/vtd/member/payments/${currentRefundPaymentId}/refund`, { reason: reason });

        alert('🎉 Gửi yêu cầu hoàn tiền thành công! BDHT sẽ xem xét giải quyết và phản hồi bạn sớm nhất.');
        closeRefundModal();
        loadTransactionHistory(); // Tải lại lịch sử giao dịch
    } catch (error) {
        console.error("Lỗi khi gửi yêu cầu hoàn tiền:", error);
        alert('Lỗi: ' + error.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Gửi Yêu Cầu';
            btnSubmit.classList.remove('opacity-70');
        }
    }
});

/**
 * =========================================================================
 * 8. HỦY ĐƠN HÀNG PENDING TRỰC TIẾP (INLINE CANCEL ORDER SYSTEM)
 * =========================================================================
 */
let currentCancelOrderId = null;

/**
 * Mở popup xác nhận hủy đơn hàng đang chờ thanh toán
 * @param {number} orderId - Mã đơn hàng muốn hủy
 */
window.openCancelOrderModal = function(orderId) {
    currentCancelOrderId = orderId;

    const modal = document.getElementById('cancel-order-modal');
    const orderIdDisplay = document.getElementById('cancel-order-id-display');
    if (!modal) return;

    if (orderIdDisplay) orderIdDisplay.textContent = `#BDHT${orderId}`;

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
};

/**
 * Đóng popup xác nhận hủy đơn hàng
 */
window.closeCancelOrderModal = function() {
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
};

/**
 * Thực thi hủy đơn hàng chờ thanh toán trực tiếp qua API (Inline Update)
 */
async function executeCancelOrder() {
    if (!currentCancelOrderId) return;

    const confirmBtn = document.getElementById('btn-cancel-confirm');
    const orderId = currentCancelOrderId;

    const oldBtnHtml = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

    try {
        // Gọi API DELETE hủy đơn hàng
        await window.apiClient.delete(`/api/vtd/member/orders/${orderId}/cancel`);

        // === CẬP NHẬT UI INLINE KHÔNG CẦN TẢI LẠI TRANG ===
        
        // 1. Cập nhật Badge hiển thị trạng thái giao dịch
        const statusBadge = document.getElementById(`order-status-${orderId}`);
        if (statusBadge) {
            statusBadge.className = 'inline-block text-[9px] font-extrabold uppercase px-3 py-1 rounded-full border text-red-500 bg-red-50 border-red-100';
            statusBadge.textContent = 'Đã hủy';

            // Nhấp nháy nhẹ tạo hiệu ứng thay đổi trực quan
            statusBadge.style.transition = 'all 0.3s ease';
            statusBadge.style.transform = 'scale(1.15)';
            setTimeout(() => { statusBadge.style.transform = 'scale(1)'; }, 300);
        }

        // 2. Ẩn/Vô hiệu hóa các nút bấm tiếp tục / hủy của đơn hàng đó
        const cancelBtn = document.getElementById(`btn-cancel-order-${orderId}`);
        if (cancelBtn) {
            cancelBtn.disabled = true;
            cancelBtn.classList.add('opacity-30', 'pointer-events-none');
            cancelBtn.innerHTML = '<i class="fas fa-check-circle text-[9px]"></i> Đã hủy';
        }

        closeCancelOrderModal();
        showProfileToast('success', `Đơn hàng #BDHT${orderId} của bạn đã được hủy bỏ thành công.`);
    } catch (error) {
        console.error('Lỗi khi thực hiện hủy đơn hàng:', error);
        closeCancelOrderModal();
        showProfileToast('error', error.message || 'Không thể hủy đơn hàng lúc này. Vui lòng kiểm tra kết nối mạng!');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = oldBtnHtml;
        }
    }
}

// Lắng nghe các nút click của Cancel Modal khi tải xong trang
document.addEventListener('DOMContentLoaded', () => {
    const dismissBtn = document.getElementById('btn-cancel-dismiss');
    const confirmBtn = document.getElementById('btn-cancel-confirm');
    const cancelModal = document.getElementById('cancel-order-modal');

    if (dismissBtn) dismissBtn.addEventListener('click', closeCancelOrderModal);
    if (confirmBtn) confirmBtn.addEventListener('click', executeCancelOrder);

    if (cancelModal) {
        cancelModal.addEventListener('click', (e) => {
            if (e.target === cancelModal) closeCancelOrderModal();
        });
    }
});

/**
 * =========================================================================
 * 9. ĐỐI SOÁT KIỂM TRA TRẠNG THÁI THANH TOÁN (PAYMENT STATUS CHECK SYSTEM)
 * =========================================================================
 */

/**
 * Mở modal và truy vấn trạng thái thanh toán của hóa đơn
 * @param {number} paymentId - ID bản ghi thanh toán
 * @param {number} orderId - ID đơn hàng tương ứng
 */
window.checkPaymentStatus = async function(paymentId, orderId) {
    const modal = document.getElementById('payment-status-modal');
    const body = document.getElementById('ps-modal-body');
    const orderIdEl = document.getElementById('ps-modal-order-id');
    if (!modal || !body) return;

    if (orderIdEl) orderIdEl.textContent = `#BDHT${orderId}`;
    body.innerHTML = `
        <div class="flex flex-col items-center gap-3 py-6">
            <i class="fas fa-spinner fa-spin text-2xl text-brand-orange"></i>
            <span class="text-xs font-bold text-slate-400">Đang truy vấn trạng thái thanh toán an toàn...</span>
        </div>
    `;
    openPaymentStatusModal();

    try {
        // Truy vấn thông tin giao dịch thanh toán từ API
        const payment = await window.apiClient.get(`/api/vtd/member/payments/${paymentId}`);
        renderPaymentStatusContent(payment, orderId);
    } catch (error) {
        console.error('Lỗi khi truy vấn đối soát thanh toán:', error);
        body.innerHTML = `
            <div class="flex flex-col items-center gap-3 py-6">
                <div class="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <i class="fas fa-exclamation-circle text-2xl text-red-450"></i>
                </div>
                <span class="text-sm font-bold text-slate-800">Không thể truy vấn thông tin</span>
                <span class="text-xs text-slate-400 font-medium text-center">${error.message || 'Vui lòng kiểm tra lại kết nối mạng của bạn.'}</span>
            </div>
        `;
    }
};

/**
 * Render cấu trúc thông tin đối soát chi tiết vào modal
 * @param {Object} payment - Thông tin chi tiết giao dịch
 * @param {number} orderId - Mã đơn hàng
 */
function renderPaymentStatusContent(payment, orderId) {
    const body = document.getElementById('ps-modal-body');
    if (!body) return;

    const statusMap = {
        'PENDING':   { label: 'Đang chờ xử lý',   icon: 'fas fa-hourglass-half', color: 'amber',   desc: 'Giao dịch đang được ngân hàng hoặc hệ thống cổng VietQR xử lý.' },
        'COMPLETED': { label: 'Thanh toán thành công', icon: 'fas fa-check-circle', color: 'emerald', desc: 'Giao dịch đã được xác nhận. Tấm vé của bạn đã nằm an toàn trong Kho vé.' },
        'FAILED':    { label: 'Thanh toán thất bại',   icon: 'fas fa-times-circle',  color: 'red',     desc: 'Giao dịch chuyển khoản không thành công. Bạn vui lòng thử thanh toán lại.' },
        'REFUNDED':  { label: 'Đã hoàn tiền',      icon: 'fas fa-undo',          color: 'blue',    desc: 'Giao dịch đã được hoàn lại tiền về tài khoản ngân hàng của bạn.' },
    };

    const status = (payment.paymentStatus || payment.status || 'PENDING').toUpperCase();
    const info = statusMap[status] || statusMap['PENDING'];

    const methodLabels = {
        'CASH': 'Thanh toán tiền mặt',
        'MOMO': 'Ví điện tử MoMo',
        'BANK_TRANSFER': 'Chuyển khoản VietQR',
        'VNPAY': 'Ví điện tử VNPay',
    };
    const methodText = methodLabels[(payment.paymentMethod || '').toUpperCase()] || payment.paymentMethod || 'Không xác định';

    const amount = Number(payment.amount || payment.totalAmount || 0).toLocaleString('vi-VN') + ' đ';

    const dateStr = payment.paymentDate || payment.createdAt
        ? new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('vi-VN', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
        : 'Chưa ghi nhận';

    const colorMap = {
        amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-600',   iconBg: 'bg-amber-100' },
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
        red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-500',     iconBg: 'bg-red-100' },
        blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-600',    iconBg: 'bg-blue-100' },
    };
    const c = colorMap[info.color] || colorMap.amber;

    body.innerHTML = `
        <div class="${c.bg} ${c.border} border rounded-2xl p-5 flex flex-col items-center gap-3">
            <div class="w-14 h-14 rounded-full ${c.iconBg} flex items-center justify-center">
                <i class="${info.icon} text-2xl ${c.text}"></i>
            </div>
            <span class="text-sm font-extrabold ${c.text} uppercase tracking-wide">${info.label}</span>
            <p class="text-[11px] text-slate-500 font-medium text-center leading-relaxed">${info.desc}</p>
        </div>

        <div class="flex flex-col gap-3 pt-1">
            <div class="flex items-center justify-between py-2 border-b border-gray-100">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã đối soát</span>
                <span class="text-xs font-black text-slate-800 font-mono">#PAY${payment.paymentId}</span>
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
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian ghi nhận</span>
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

// Đăng ký sự kiện đóng mở cho Payment Status Modal
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
