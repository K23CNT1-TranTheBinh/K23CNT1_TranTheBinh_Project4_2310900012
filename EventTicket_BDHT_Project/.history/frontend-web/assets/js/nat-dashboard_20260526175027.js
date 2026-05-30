/**
 * =========================================================================
 * DỰ ÁN HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT - PHÂN HỆ KHÁCH HÀNG (MEMBER)
 * FILE: dashboard.js
 * CHỨC NĂNG: Điều khiển bảng thống kê cá nhân, lịch sử đặt vé thành công và tùy chỉnh ban tổ chức
 * =========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- CHỐT CHẶN BẢO VỆ ROUTE GUARD ---
    // Kiểm tra token đăng nhập trước khi cho phép thực thi giao diện điều khiển
    const token = localStorage.getItem('token'); 
    if (!token) {
        alert("⚠️ Bạn chưa đăng nhập hệ thống hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!");
        // Chuyển hướng về trang đăng nhập nat-login.html
        window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('pages/user/nat-login.html') : './nat-login.html'; 
        return; // Dừng việc thực thi các tiến trình bên dưới để bảo mật
    }

    // 1. Khởi tạo chức năng chuyển các Tab chính ở thanh Sidebar bên trái
    setupMainTabNavigation();
    
    // 2. Khởi tạo tính năng đổi Sub-Tab giữa 'Vé sắp diễn ra' và 'Vé đã qua'
    setupSubTabNavigation();
    
    // 3. Khởi tạo giao diện xem danh sách và Form tạo mới Nhà Tổ Chức ở Tab Tùy Chỉnh
    setupCustomizationViews();
    
    // 4. Đồng bộ hóa số liệu thống kê thực tế từ Backend API (Doanh thu, Sự kiện, Vé)
    loadDashboardMetrics();
    
    // 5. Khởi tạo Widget Profile Menu thả xuống (Dropdown) ở góc trên bên phải
    setupUserDropdown();
});

/**
 * =========================================================================
 * 1. ĐIỀU HƯỚNG CÁC TAB CHÍNH (SIDEBAR NAVIGATION)
 * =========================================================================
 */
function setupMainTabNavigation() {
    // Bản đồ ánh xạ giữa các nút bấm ở Sidebar
    const menuButtons = {
        dashboard: document.getElementById('menu-btn-dashboard'),
        tickets: document.getElementById('menu-btn-tickets'),
        customization: document.getElementById('menu-btn-customization'),
        reports: document.getElementById('menu-btn-reports'),
        sell: document.getElementById('menu-btn-sell')
    };

    // Bản đồ ánh xạ tới các phần chứa nội dung tương ứng bên tay phải
    const tabs = {
        dashboard: document.getElementById('tab-dashboard'),
        tickets: document.getElementById('tab-tickets'),
        customization: document.getElementById('tab-customization'),
        reports: document.getElementById('tab-reports'),
        sell: document.getElementById('tab-sell')
    };

    /**
     * Hàm nội bộ xử lý hoán đổi trạng thái kích hoạt giữa các tab
     * @param {string} activeKey - Từ khóa định danh Tab muốn mở rộng
     */
    const switchMainTab = (activeKey) => {
        // Cập nhật giao diện của các nút Sidebar
        Object.keys(menuButtons).forEach(key => {
            const btn = menuButtons[key];
            if (!btn) return;

            if (key === activeKey) {
                // Áp dụng màu nền hoạt động (Sidebar Active Color)
                btn.className = "dashboard-menu-btn w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-bold transition duration-200 bg-theme-sidebarActive text-white";
            } else {
                // Trả lại trạng thái màu nhạt bình thường
                btn.className = "dashboard-menu-btn w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-bold transition duration-200 text-slate-400 hover:bg-white/5 hover:text-white";
            }
        });

        // Ẩn/Hiện nội dung phân khu bên tay phải
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

    // Lắng nghe sự kiện click chuột trên từng nút điều hướng Sidebar
    Object.keys(menuButtons).forEach(key => {
        const btn = menuButtons[key];
        if (btn) {
            btn.addEventListener('click', () => switchMainTab(key));
        }
    });
}

/**
 * =========================================================================
 * 2. ĐIỀU HƯỚNG CÁC PHÂN TAB PHỤ (SUB-TAB VÉ ĐÃ ĐẶT)
 * =========================================================================
 */
function setupSubTabNavigation() {
    const activeBtn = document.getElementById('sub-tab-active-btn');
    const pastBtn = document.getElementById('sub-tab-past-btn');
    const activeContent = document.getElementById('sub-tab-active-content');
    const pastContent = document.getElementById('sub-tab-past-content');

    if (!activeBtn || !pastBtn || !activeContent || !pastContent) return;

    // Sự kiện khi click chọn xem "Sự kiện sắp diễn ra"
    activeBtn.addEventListener('click', () => {
        activeBtn.className = "px-5 py-3 text-xs font-bold bg-theme-brandBlue text-white rounded-t-xl transition-all duration-200 border border-b-0 border-theme-brandBlue";
        pastBtn.className = "px-5 py-3 text-xs font-bold bg-white text-slate-700 rounded-t-xl hover:bg-slate-50 transition-all duration-200 border-t border-r border-gray-200";
        
        activeContent.classList.remove('hidden');
        pastContent.classList.add('hidden');
    });

    // Sự kiện khi click chọn xem "Sự kiện đã qua"
    pastBtn.addEventListener('click', () => {
        pastBtn.className = "px-5 py-3 text-xs font-bold bg-theme-brandBlue text-white rounded-t-xl transition-all duration-200 border border-b-0 border-theme-brandBlue";
        activeBtn.className = "px-5 py-3 text-xs font-bold bg-white text-slate-700 rounded-t-xl hover:bg-slate-50 transition-all duration-200 border-t border-r border-gray-200";
        
        pastContent.classList.remove('hidden');
        activeContent.classList.add('hidden');
    });
}

/**
 * =========================================================================
 * 3. QUẢN LÝ GIAO DIỆN TÙY CHỈNH BAN TỔ CHỨC (BẢNG DANH SÁCH & FORM NHẬP)
 * =========================================================================
 */
function setupCustomizationViews() {
    const openFormBtn = document.getElementById('open-form-btn');
    const closeFormBtn = document.getElementById('close-form-btn');
    const listView = document.getElementById('customization-list');
    const formView = document.getElementById('customization-form');
    const orgForm = document.getElementById('organizer-form');
    const logoInput = document.getElementById('organizer-logo-file');
    const logoFileName = document.getElementById('logo-file-name');

    if (!listView || !formView) return;

    // Sự kiện bấm nút "Thêm mới nhà tổ chức sự kiện" -> Hiện form
    if (openFormBtn) {
        openFormBtn.addEventListener('click', () => {
            listView.classList.add('hidden');
            formView.classList.remove('hidden');
        });
    }

    // Hàm nội bộ dọn dẹp form và quay lại chế độ danh sách
    const closeForm = () => {
        formView.classList.add('hidden');
        listView.classList.remove('hidden');
        if (orgForm) orgForm.reset();
        if (logoFileName) logoFileName.innerText = 'Chưa chọn ảnh';
    };

    // Sự kiện hủy bỏ thao tác nhập form
    if (closeFormBtn) {
        closeFormBtn.addEventListener('click', closeForm);
    }

    // Đọc tên file ảnh cục bộ khi người dùng lựa chọn
    if (logoInput && logoFileName) {
        logoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                logoFileName.innerText = e.target.files[0].name;
            } else {
                logoFileName.innerText = 'Chưa chọn ảnh';
            }
        });
    }
}

/**
 * =========================================================================
 * 4. ĐỒNG BỘ DỮ LIỆU THỐNG KÊ DOANH THU & VÉ ĐÃ ĐẶT TỪ BACKEND
 * =========================================================================
 */
async function loadDashboardMetrics() {
    try {
        // 1. Lấy danh sách toàn bộ hóa đơn đơn hàng & danh sách vé điện tử thực tế của thành viên
        const [ordersResponse, ticketsResponse] = await Promise.all([
            window.apiClient.get('/api/vtd/member/orders'),
            window.apiClient.get('/api/vtd/member/my-tickets')
        ]);

        const orders = Array.isArray(ordersResponse) ? ordersResponse : (ordersResponse?.content || []);
        let tickets = Array.isArray(ticketsResponse) ? ticketsResponse : (ticketsResponse?.content || []);

        // 2. Tra cứu động danh sách các vé Resale đã được bán lại thành công để ẩn đi và hiện thông báo
        const uniqueEventIds = [...new Set(tickets.map(t => t.ticketType?.event?.eventId).filter(Boolean))];
        const ticketTypesByEventId = {};
        
        if (uniqueEventIds.length > 0) {
            const ticketTypesResults = await Promise.allSettled(
                uniqueEventIds.map(eventId =>
                    fetch(`http://localhost:8080/api/lpth/admin/ticket-types/event/${eventId}`)
                        .then(r => r.ok ? r.json() : [])
                )
            );
            uniqueEventIds.forEach((eventId, idx) => {
                const res = ticketTypesResults[idx];
                ticketTypesByEventId[eventId] = res.status === 'fulfilled' ? res.value : [];
            });
        }

        // Lọc các vé đã bán lại thành công và gom dữ liệu báo cáo
        const resoldTicketsDetails = [];
        tickets = tickets.filter(ticket => {
            const eventId = ticket.ticketType?.event?.eventId;
            if (!eventId) return true;

            const eventTypes = ticketTypesByEventId[eventId] || [];
            const expectedName = `[Resale] ${ticket.ticketType.typeName} (#${ticket.ticketId})`;
            const resaleType = eventTypes.find(tt => tt.typeName === expectedName);

            if (resaleType && (resaleType.soldQuantity || 0) >= 1) {
                // Vé đã bán lại thành công! Lưu lại thông tin báo cáo
                resoldTicketsDetails.push({
                    eventName: ticket.ticketType.event.title,
                    typeName: ticket.ticketType.typeName,
                    price: resaleType.price
                });
                return false; // Lọc bỏ (vé biến mất khỏi danh sách của người bán!)
            }
            return true; // Giữ lại vé chưa bán
        });

        // Hiển thị Banner thông báo bán thành công động nếu có vé vừa bán
        const successAlert = document.getElementById('resale-success-alert');
        const alertMsg = document.getElementById('resale-alert-msg');
        if (successAlert && alertMsg) {
            if (resoldTicketsDetails.length > 0) {
                const detailsStr = resoldTicketsDetails.map(d => 
                    `Vé ${d.typeName} của sự kiện "${d.eventName}" đã được bán thành công với giá ${Number(d.price).toLocaleString('vi-VN')} đ.`
                ).join('<br/>');
                alertMsg.innerHTML = `Chúc mừng! Bạn có giao dịch bán lại thành công:<br/>${detailsStr}`;
                successAlert.classList.remove('hidden');
                successAlert.classList.add('flex');
            } else {
                successAlert.classList.add('hidden');
            }
        }

        let totalEvents = 0;
        let totalTickets = 0;
        let totalRevenue = 0;

        // Chỉ thống kê dựa trên các đơn hàng đã thanh toán thành công (COMPLETED hoặc CONFIRMED)
        const validOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'CONFIRMED');
        
        // Map để gom vé theo orderId
        const ticketsByOrderId = {};
        const eventIds = new Set(); // Đếm tổng số sự kiện tham gia độc bản

        tickets.forEach(ticket => {
            if (ticket.order && ticket.order.orderId) {
                const orderId = ticket.order.orderId;
                if (!ticketsByOrderId[orderId]) {
                    ticketsByOrderId[orderId] = [];
                }
                ticketsByOrderId[orderId].push(ticket);
            }

            if (ticket.ticketType?.event?.eventId) {
                eventIds.add(ticket.ticketType.event.eventId);
            }
        });

        // Tính toán tổng số lượng
        validOrders.forEach(order => {
            totalRevenue += Number(order.totalAmount || order.finalAmount || 0);
            
            // Số lượng vé thực tế từ DB hoặc fallback
            const orderTickets = ticketsByOrderId[order.orderId] || [];
            totalTickets += orderTickets.length > 0 ? orderTickets.length : 1;
        });

        totalEvents = eventIds.size;

        // Cập nhật số liệu lên các ô chỉ báo (Metric Cards)
        const totalEventsEl = document.getElementById('stat-total-events');
        const totalTicketsEl = document.getElementById('stat-total-tickets');
        const totalRevenueEl = document.getElementById('stat-total-revenue');

        if (totalEventsEl) totalEventsEl.innerText = totalEvents.toString();
        if (totalTicketsEl) totalTicketsEl.innerText = totalTickets.toString();
        if (totalRevenueEl) totalRevenueEl.innerText = totalRevenue.toLocaleString('vi-VN') + " đ";

        // Phân loại các đơn hàng thành "Sắp diễn ra" và "Đã qua" dựa trên thời gian kết thúc sự kiện
        const activeOrders = [];
        const pastOrders = [];
        const now = new Date();

        validOrders.forEach(order => {
            const orderTickets = ticketsByOrderId[order.orderId] || [];
            let isPast = false;

            if (orderTickets.length > 0) {
                // Lấy ngày kết thúc của vé đầu tiên trong đơn hàng làm mốc so sánh
                const event = orderTickets[0].ticketType?.event;
                if (event && event.endTime) {
                    isPast = new Date(event.endTime) < now;
                }
            }

            if (isPast) {
                pastOrders.push(order);
            } else {
                activeOrders.push(order);
            }
        });

        // Hàm render dòng cho bảng vé
        const renderOrderRow = (order) => {
            const dateStr = new Date(order.createdAt || order.orderDate).toLocaleDateString('vi-VN');
            const orderTickets = ticketsByOrderId[order.orderId] || [];
            
            // Lấy tên sự kiện từ vé
            let eventName = "Đơn hàng soát vé điện tử";
            if (orderTickets.length > 0 && orderTickets[0].ticketType?.event?.title) {
                eventName = orderTickets[0].ticketType.event.title;
            }

            const ticketCount = orderTickets.length > 0 ? orderTickets.length : 1;

            return `
                <tr class="border-b border-gray-150 hover:bg-slate-50 transition text-slate-700">
                    <td class="p-4">
                        <div class="flex flex-col gap-0.5 max-w-xs sm:max-w-md">
                            <span class="font-extrabold text-slate-900 truncate" title="${eventName}">${eventName}</span>
                            <span class="text-[10px] text-slate-400 font-semibold">📅 Ngày lập đơn: ${dateStr}</span>
                        </div>
                    </td>
                    <td class="p-4 text-slate-900 font-mono">BDHT${order.orderId}</td>
                    <td class="p-4 text-center">
                        <span class="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                            Đã thanh toán
                        </span>
                    </td>
                    <td class="p-4 text-center text-slate-900 font-bold">${ticketCount}</td>
                    <td class="p-4 text-right text-slate-950 font-extrabold">${Number(order.totalAmount || order.finalAmount || 0).toLocaleString('vi-VN')} đ</td>
                    <td class="p-4 text-center">
                        <button type="button" 
                            class="btn-view-qr bg-theme-brandOrange hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition hover:scale-105 active:scale-95 flex items-center gap-1.5 mx-auto"
                            data-order-id="${order.orderId}">
                            <i class="fas fa-qrcode text-xs"></i> Xem QR
                        </button>
                    </td>
                </tr>
            `;
        };

        // Render bảng Sự kiện sắp diễn ra
        const activeTableBody = document.getElementById('tickets-active-tbody');
        if (activeTableBody) {
            if (activeOrders.length === 0) {
                activeTableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 font-bold">Bạn chưa sở hữu chiếc vé sự kiện sắp tới nào.</td></tr>`;
            } else {
                activeTableBody.innerHTML = activeOrders.map(renderOrderRow).join('');
            }
        }

        // Render bảng Sự kiện đã qua
        const pastTableBody = document.getElementById('tickets-past-tbody');
        if (pastTableBody) {
            if (pastOrders.length === 0) {
                pastTableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 font-bold">Chưa có vé lịch sử nào đã diễn ra.</td></tr>`;
            } else {
                pastTableBody.innerHTML = pastOrders.map(renderOrderRow).join('');
            }
        }

        // Cập nhật bảng thống kê báo cáo doanh thu hóa đơn ở Tab 4
        const reportsTableBody = document.querySelector('#tab-reports tbody');
        if (reportsTableBody) {
            if (validOrders.length === 0) {
                reportsTableBody.innerHTML = `<tr><td colspan="7" class="p-5 text-center text-slate-400 font-bold">Chưa có dữ liệu giao dịch hóa đơn báo cáo.</td></tr>`;
            } else {
                reportsTableBody.innerHTML = validOrders.map(order => {
                    const orderTickets = ticketsByOrderId[order.orderId] || [];
                    const ticketCount = orderTickets.length > 0 ? orderTickets.length : 1;
                    return `
                        <tr class="border-b border-gray-150 hover:bg-slate-50 transition text-slate-700">
                            <td class="p-4 font-extrabold text-slate-900 max-w-xs truncate">
                                Hóa đơn mua vé điện tử #BDHT${order.orderId}
                            </td>
                            <td class="p-4 text-center">-</td>
                            <td class="p-4 text-center text-emerald-600">${ticketCount}</td>
                            <td class="p-4 text-center text-amber-500">0</td>
                            <td class="p-4 text-center">0</td>
                            <td class="p-4 text-right text-slate-900 font-extrabold">${Number(order.totalAmount || order.finalAmount || 0).toLocaleString('vi-VN')} đ</td>
                            <td class="p-4 text-center">
                                <button type="button" class="text-theme-brandBlue hover:text-indigo-650 transition" title="Xem chi tiết báo cáo">
                                    <i class="far fa-eye text-base"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('') + `
                    <tr class="bg-slate-50 border-t border-gray-200 font-extrabold text-xs">
                        <td class="p-4 text-theme-brandOrange uppercase text-sm">TỔNG DOANH THU THỰC TẾ</td>
                        <td class="p-4 text-center text-slate-400">-</td>
                        <td class="p-4 text-center text-slate-400">-</td>
                        <td class="p-4 text-center text-slate-400">-</td>
                        <td class="p-4 text-center text-slate-400">-</td>
                        <td class="p-4 text-right text-theme-brandOrange text-sm">${totalRevenue.toLocaleString('vi-VN')} đ</td>
                        <td class="p-4 text-center text-slate-400">-</td>
                    </tr>
                `;
            }
        }

    } catch (e) {
        console.error("Lỗi trong quá trình đồng bộ hóa số liệu thống kê Dashboard:", e);
    }
}

/**
 * =========================================================================
 * 5. QUẢN LÝ WIDGET PROFILE DROPDOWN MENU Ở HEADER TOP
 * =========================================================================
 */
function setupUserDropdown() {
    const trigger = document.getElementById('dashboard-user-trigger');
    const menu = document.getElementById('dashboard-user-menu');
    const logoutBtn = document.getElementById('dashboard-logout-btn');
    const displayName = document.getElementById('dashboard-user-display-name');
    const avatarChar = document.getElementById('dashboard-user-avatar-char');

    // Đồng bộ tên hiển thị của tài khoản đang đăng nhập
    const storedUser = localStorage.getItem('currentUser');
    let userObj = null;
    if (storedUser) {
        try { userObj = JSON.parse(storedUser); } catch(e) {}
    }
    
    // Nếu rỗng, thử khôi phục từ checkoutData trước đó
    if (!userObj) {
        const checkoutDataStr = localStorage.getItem('checkoutData');
        if (checkoutDataStr) {
            try {
                const checkoutData = JSON.parse(checkoutDataStr);
                if (checkoutData.customer) {
                    userObj = { fullName: checkoutData.customer.name };
                }
            } catch(e) {}
        }
    }

    // Hiển thị ký tự viết tắt đầu tiên làm Avatar tròn đại diện
    if (userObj && userObj.fullName) {
        if (displayName) displayName.innerText = userObj.fullName;
        if (avatarChar) avatarChar.innerText = userObj.fullName.charAt(0).toUpperCase();
    }

    // Sự kiện đóng mở menu khi click chuột
    if (trigger && menu) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });

        // Click chuột ra bất kỳ vùng ngoài nào thì đóng menu lại
        window.addEventListener('click', () => {
            if (!menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
            }
        });

        // Tránh đóng menu khi bấm vào trong bản thân menu
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Xử lý sự kiện nút bấm "Thoát / Đăng xuất"
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Xóa sạch các credentials khỏi localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            
            // Đưa người dùng trở về màn hình trang chủ
            window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('index.html') : '../index.html';
        });
    }
}