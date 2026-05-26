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
        reports: document.getElementById('menu-btn-reports')
    };

    // Bản đồ ánh xạ tới các phần chứa nội dung tương ứng bên tay phải
    const tabs = {
        dashboard: document.getElementById('tab-dashboard'),
        tickets: document.getElementById('tab-tickets'),
        customization: document.getElementById('tab-customization'),
        reports: document.getElementById('tab-reports')
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

    // Submit lưu thông tin Nhà Tổ Chức (Dành cho bản vẽ Demo Mock-up)
    if (orgForm) {
        orgForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('🎉 Chúc mừng! Đã đăng ký thêm mới Nhà tổ chức sự kiện thành công lên hệ thống quản lý.');
            closeForm();
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
        // Lấy danh sách toàn bộ hóa đơn đơn hàng của thành viên hiện tại
        const ordersResponse = await window.apiClient.get('/api/vtd/member/orders');
        const orders = Array.isArray(ordersResponse) ? ordersResponse : (ordersResponse?.content || []);
        
        let totalEvents = 0;
        let totalTickets = 0;
        let totalRevenue = 0;
        
        // Chỉ thống kê dựa trên các đơn hàng đã thanh toán thành công (COMPLETED hoặc CONFIRMED)
        const validOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'CONFIRMED');
        const eventIds = new Set(); // Dùng Set để tránh trùng lặp sự kiện khi tính tổng số sự kiện tham gia

        validOrders.forEach(order => {
            totalRevenue += Number(order.totalAmount || 0);
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    totalTickets += item.quantity || 1;
                    if (item.eventId) eventIds.add(item.eventId);
                });
            } else {
                totalTickets += 1;
                eventIds.add(`mock-event-${order.orderId}`);
            }
        });
        
        totalEvents = eventIds.size;

        // Cập nhật số liệu lên các ô chỉ báo (Metric Cards) bằng việc sử dụng ID trực tiếp
        // Đảm bảo tường minh, tránh lỗi CSS kế thừa so với dùng querySelector chung
        const totalEventsEl = document.getElementById('stat-total-events');
        const totalTicketsEl = document.getElementById('stat-total-tickets');
        const totalRevenueEl = document.getElementById('stat-total-revenue');

        if (totalEventsEl) totalEventsEl.innerText = totalEvents.toString();
        if (totalTicketsEl) totalTicketsEl.innerText = totalTickets.toString();
        if (totalRevenueEl) totalRevenueEl.innerText = totalRevenue.toLocaleString('vi-VN') + " đ";

        // Cập nhật bảng kê lịch sử đơn hàng ở Sub-tab "Sự kiện sắp diễn ra"
        const activeTableBody = document.querySelector('#sub-tab-active-content tbody');
        if (activeTableBody) {
            if (validOrders.length === 0) {
                activeTableBody.innerHTML = `<tr><td colspan="6" class="p-5 text-center text-slate-400 font-bold">Bạn chưa sở hữu chiếc vé sự kiện nào thanh toán thành công.</td></tr>`;
            } else {
                activeTableBody.innerHTML = validOrders.map(order => {
                    const dateStr = new Date(order.orderDate || order.createdAt).toLocaleDateString('vi-VN');
                    return `
                        <tr class="border-b border-gray-150 hover:bg-slate-50 transition text-slate-700">
                            <td class="p-4">
                                <div class="flex flex-col gap-0.5">
                                    <span class="font-extrabold text-slate-900">Đơn hàng soát vé điện tử</span>
                                    <span class="text-[10px] text-slate-400">📅 Ngày lập: ${dateStr}</span>
                                </div>
                            </td>
                            <td class="p-4 text-slate-900 font-mono">BDHT${order.orderId}</td>
                            <td class="p-4 text-center"><span class="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Đã thanh toán</span></td>
                            <td class="p-4 text-center">${order.items ? order.items.length : 1}</td>
                            <td class="p-4 text-right">${Number(order.totalAmount || 0).toLocaleString('vi-VN')} đ</td>
                            <td class="p-4 text-right text-slate-900 font-bold">${Number(order.totalAmount || 0).toLocaleString('vi-VN')} đ</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Cập nhật bảng thống kê báo cáo doanh thu hóa đơn ở Tab 4
        const reportsTableBody = document.querySelector('#tab-reports tbody');
        if (reportsTableBody) {
            if (validOrders.length === 0) {
                reportsTableBody.innerHTML = `<tr><td colspan="7" class="p-5 text-center text-slate-400 font-bold">Chưa có dữ liệu giao dịch hóa đơn báo cáo.</td></tr>`;
            } else {
                reportsTableBody.innerHTML = validOrders.map(order => {
                    return `
                        <tr class="border-b border-gray-150 hover:bg-slate-50 transition text-slate-700">
                            <td class="p-4 font-extrabold text-slate-900 max-w-xs truncate">
                                Hóa đơn mua vé điện tử #BDHT${order.orderId}
                            </td>
                            <td class="p-4 text-center">-</td>
                            <td class="p-4 text-center text-emerald-600">${order.items ? order.items.length : 1}</td>
                            <td class="p-4 text-center text-amber-500">0</td>
                            <td class="p-4 text-center">0</td>
                            <td class="p-4 text-right text-slate-900 font-extrabold">${Number(order.totalAmount || 0).toLocaleString('vi-VN')} đ</td>
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
