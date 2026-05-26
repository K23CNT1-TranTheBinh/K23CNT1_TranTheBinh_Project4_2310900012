document.addEventListener('DOMContentLoaded', () => {
    setupMainTabNavigation();
    setupSubTabNavigation();
    setupCustomizationViews();
    loadDashboardMetrics();
    setupUserDropdown();
});

// ==========================================
// 1. CHUYỂN TAB CHÍNH (SIDEBAR NAVIGATION)
// ==========================================
function setupMainTabNavigation() {
    const menuButtons = {
        dashboard: document.getElementById('menu-btn-dashboard'),
        tickets: document.getElementById('menu-btn-tickets'),
        customization: document.getElementById('menu-btn-customization'),
        reports: document.getElementById('menu-btn-reports')
    };

    const tabs = {
        dashboard: document.getElementById('tab-dashboard'),
        tickets: document.getElementById('tab-tickets'),
        customization: document.getElementById('tab-customization'),
        reports: document.getElementById('tab-reports')
    };

    const switchMainTab = (activeKey) => {
        // Cập nhật trạng thái active trên các nút Sidebar
        Object.keys(menuButtons).forEach(key => {
            const btn = menuButtons[key];
            if (!btn) return;

            if (key === activeKey) {
                btn.className = "dashboard-menu-btn w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-bold transition duration-200 bg-theme-sidebarActive text-white";
            } else {
                btn.className = "dashboard-menu-btn w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-bold transition duration-200 text-slate-400 hover:bg-white/5 hover:text-white";
            }
        });

        // Ẩn/Hiện nội dung các tab chính bên phải
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

    // Đăng ký sự kiện click cho các nút menu
    Object.keys(menuButtons).forEach(key => {
        const btn = menuButtons[key];
        if (btn) {
            btn.addEventListener('click', () => switchMainTab(key));
        }
    });
}

// ==========================================
// 2. CHUYỂN SUB-TAB (VÉ ĐÃ ĐẶT - ACTIVE VS PAST)
// ==========================================
function setupSubTabNavigation() {
    const activeBtn = document.getElementById('sub-tab-active-btn');
    const pastBtn = document.getElementById('sub-tab-past-btn');
    const activeContent = document.getElementById('sub-tab-active-content');
    const pastContent = document.getElementById('sub-tab-past-content');

    if (!activeBtn || !pastBtn || !activeContent || !pastContent) return;

    activeBtn.addEventListener('click', () => {
        // Nút 'Sắp diễn ra' active
        activeBtn.className = "px-5 py-3 text-xs font-bold bg-theme-brandBlue text-white rounded-t-xl transition-all duration-200 border border-b-0 border-theme-brandBlue";
        pastBtn.className = "px-5 py-3 text-xs font-bold bg-white text-slate-700 rounded-t-xl hover:bg-slate-50 transition-all duration-200 border-t border-r border-gray-200";
        
        activeContent.classList.remove('hidden');
        pastContent.classList.add('hidden');
    });

    pastBtn.addEventListener('click', () => {
        // Nút 'Đã qua' active
        pastBtn.className = "px-5 py-3 text-xs font-bold bg-theme-brandBlue text-white rounded-t-xl transition-all duration-200 border border-b-0 border-theme-brandBlue";
        activeBtn.className = "px-5 py-3 text-xs font-bold bg-white text-slate-700 rounded-t-xl hover:bg-slate-50 transition-all duration-200 border-t border-r border-gray-200";
        
        pastContent.classList.remove('hidden');
        activeContent.classList.add('hidden');
    });
}

// ==========================================
// 3. CHUYỂN VIEW DANH SÁCH / FORM (TAB TÙY CHỈNH)
// ==========================================
function setupCustomizationViews() {
    const openFormBtn = document.getElementById('open-form-btn');
    const closeFormBtn = document.getElementById('close-form-btn');
    const listView = document.getElementById('customization-list');
    const formView = document.getElementById('customization-form');
    const orgForm = document.getElementById('organizer-form');
    const logoInput = document.getElementById('organizer-logo-file');
    const logoFileName = document.getElementById('logo-file-name');

    if (!listView || !formView) return;

    // Mở Form
    if (openFormBtn) {
        openFormBtn.addEventListener('click', () => {
            listView.classList.add('hidden');
            formView.classList.remove('hidden');
        });
    }

    // Đóng Form / Hủy
    const closeForm = () => {
        formView.classList.add('hidden');
        listView.classList.remove('hidden');
        if (orgForm) orgForm.reset();
        if (logoFileName) logoFileName.innerText = 'Chưa chọn ảnh';
    };

    if (closeFormBtn) {
        closeFormBtn.addEventListener('click', closeForm);
    }

    // Hiển thị tên tệp ảnh khi chọn
    if (logoInput && logoFileName) {
        logoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                logoFileName.innerText = e.target.files[0].name;
            } else {
                logoFileName.innerText = 'Chưa chọn ảnh';
            }
        });
    }

    // Submit Form tạo mới nhà tổ chức
    if (orgForm) {
        orgForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('🎉 Thêm mới nhà tổ chức sự kiện thành công!');
            closeForm();
        });
    }
}

// ==========================================
// 4. ĐỒNG BỘ DỮ LIỆU THỐNG KÊ DOANH THU & VÉ ĐÃ BÁN
// ==========================================
async function loadDashboardMetrics() {
    try {
        const ordersResponse = await window.apiClient.get('/api/vtd/member/orders');
        const orders = Array.isArray(ordersResponse) ? ordersResponse : (ordersResponse?.content || []);
        
        let totalEvents = 0;
        let totalTickets = 0;
        let totalRevenue = 0;
        
        const validOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'CONFIRMED');
        const eventIds = new Set();

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

        // Cập nhật Tab 1 Dashboard Metrics
        const metricCards = document.querySelectorAll('#tab-dashboard .text-3xl, #tab-dashboard .text-2xl');
        if (metricCards.length >= 3) {
            metricCards[0].innerText = totalEvents.toString();
            metricCards[1].innerText = totalTickets.toString();
            metricCards[2].innerText = totalRevenue.toLocaleString('vi-VN') + " VNĐ";
        }

        // Cập nhật bảng Tab 2 Vé đã đặt
        const activeTableBody = document.querySelector('#sub-tab-active-content tbody');
        if (activeTableBody) {
            if (validOrders.length === 0) {
                activeTableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500 font-bold">Chưa có giao dịch thành công nào.</td></tr>`;
            } else {
                activeTableBody.innerHTML = validOrders.map(order => {
                    const dateStr = new Date(order.orderDate).toLocaleDateString('vi-VN');
                    return `
                        <tr class="border-b border-gray-150 hover:bg-slate-50 transition text-slate-700">
                            <td class="p-4">
                                <div class="flex flex-col gap-0.5">
                                    <span class="font-extrabold text-slate-900">Đơn hàng #BDHT${order.orderId}</span>
                                    <span class="text-[10px] text-slate-400">📅 ${dateStr}</span>
                                </div>
                            </td>
                            <td class="p-4 text-slate-900 font-mono">BDHT${order.orderId}</td>
                            <td class="p-4 text-center"><span class="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px]">Đã thanh toán</span></td>
                            <td class="p-4 text-center">${order.items ? order.items.length : 1}</td>
                            <td class="p-4 text-right">${Number(order.totalAmount || 0).toLocaleString('vi-VN')}</td>
                            <td class="p-4 text-right text-slate-900">${Number(order.totalAmount || 0).toLocaleString('vi-VN')} đ</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Cập nhật bảng Tab 4 Thống kê hóa đơn
        const reportsTableBody = document.querySelector('#tab-reports tbody');
        if (reportsTableBody) {
            if (validOrders.length === 0) {
                reportsTableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500 font-bold">Chưa có dữ liệu báo cáo doanh thu.</td></tr>`;
            } else {
                reportsTableBody.innerHTML = validOrders.map(order => {
                    return `
                        <tr class="border-b border-gray-150 hover:bg-slate-50 transition text-slate-700">
                            <td class="p-4 font-extrabold text-slate-900 max-w-xs truncate">
                                Đơn hàng #BDHT${order.orderId}
                            </td>
                            <td class="p-4 text-center">-</td>
                            <td class="p-4 text-center text-emerald-600">1</td>
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
                        <td class="p-4 text-theme-brandOrange uppercase text-sm">Tổng doanh thu</td>
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
        console.error("Lỗi đồng bộ hóa dữ liệu thống kê:", e);
    }
}

// ==========================================
// 5. USER DROPDOWN WIDGET IN TOP HEADER
// ==========================================
function setupUserDropdown() {
    const trigger = document.getElementById('dashboard-user-trigger');
    const menu = document.getElementById('dashboard-user-menu');
    const logoutBtn = document.getElementById('dashboard-logout-btn');
    const displayName = document.getElementById('dashboard-user-display-name');
    const avatarChar = document.getElementById('dashboard-user-avatar-char');

    // Đồng bộ tên user từ localStorage nếu có đăng nhập
    const storedUser = localStorage.getItem('currentUser');
    let userObj = null;
    if (storedUser) {
        try { userObj = JSON.parse(storedUser); } catch(e) {}
    }
    // Fallback sang checkoutData
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
    if (userObj && userObj.fullName) {
        if (displayName) displayName.innerText = userObj.fullName;
        if (avatarChar) avatarChar.innerText = userObj.fullName.charAt(0).toUpperCase();
    }

    if (trigger && menu) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });

        // Click outside closes it
        window.addEventListener('click', () => {
            if (!menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
            }
        });

        // Prevent closing on clicking inside the menu container
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Xóa credentials
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            // Trả về trang chủ
            window.location.href = '../../index.html';
        });
    }
}
