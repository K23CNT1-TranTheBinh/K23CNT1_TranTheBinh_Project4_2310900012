document.addEventListener('DOMContentLoaded', () => {
    // --- CHỐT CHẶN 1: ROUTE GUARD (Kiểm tra quyền truy cập) ---
    const token = localStorage.getItem('token'); 
    if (!token) {
        alert("⚠️ Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục!");
        window.location.href = './login.html'; // Tùy chỉnh đường dẫn tương đối tới trang login
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
        const user = await window.apiClient.get('/api/nat/member/profile');
        
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
        showToast("❌ Không thể kết nối tới máy chủ! Đang dùng chế độ tải tạm...", "danger");
        
        // Trạng thái dự phòng (Mock/Fallback) khi Backend không sẵn sàng
        let userDetails = {
            fullName: "Tuấn Nguyễn Anh",
            phoneNumber: "0987654321",
            email: "nguyenanhtuan@example.com"
        };

        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                userDetails = JSON.parse(storedUser);
            } catch (err) {}
        }

        if (fullNameInput) fullNameInput.value = userDetails.fullName;
        if (phoneInput) phoneInput.value = userDetails.phoneNumber;
        if (emailInput) emailInput.value = userDetails.email;
        if (nameSidebar) nameSidebar.innerText = userDetails.fullName;
        if (avatarChar && userDetails.fullName) {
            avatarChar.innerText = userDetails.fullName.charAt(0).toUpperCase();
        }
    }
}

// ==========================================
// 3. TẢI LỊCH SỬ GIAO DỊCH TỪ BACKEND
// ==========================================
async function loadTransactionHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-8 text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
            <i class="fas fa-spinner animate-spin text-lg text-brand-orange"></i>
            <span>Đang tải lịch sử giao dịch...</span>
        </div>
    `;

    try {
        // Lấy danh sách đơn hàng thực tế của thành viên
        const orders = await window.apiClient.get('/api/nat/member/orders');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10 bg-slate-50 border border-gray-150 rounded-2xl p-6 flex flex-col items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-450"><i class="fas fa-history text-lg"></i></div>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-xs font-black text-slate-800 uppercase tracking-wider">Không tìm thấy giao dịch</span>
                        <span class="text-[10px] text-slate-400 font-bold">Bạn chưa đặt mua chiếc vé sự kiện nào.</span>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => {
            const dateStr = new Date(order.orderDate).toLocaleDateString('vi-VN', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const totalStr = Number(order.totalAmount).toLocaleString('vi-VN') + " VND";
            
            // Phân loại trạng thái đơn hàng
            let statusText = "Chờ thanh toán";
            let statusClass = "text-brand-orange bg-orange-50 border-orange-100";
            if (order.status === 'CONFIRMED') {
                statusText = "Đã hoàn thành";
                statusClass = "text-emerald-500 bg-emerald-50 border-emerald-100";
            } else if (order.status === 'CANCELLED') {
                statusText = "Đã hủy";
                statusClass = "text-red-500 bg-red-50 border-red-100";
            }

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
                            <span class="inline-block text-[9px] font-extrabold uppercase px-3 py-1 rounded-full border ${statusClass}">
                                ${statusText}
                            </span>
                            ${order.status === 'CONFIRMED' ? `<button type="button" onclick="openRefundModal(${order.orderId})" class="text-[10px] font-bold text-slate-500 hover:text-brand-orange transition underline">Yêu cầu hoàn tiền</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Lỗi khi tải lịch sử đơn hàng từ API:", e);
        container.innerHTML = `
            <div class="text-center py-8 bg-red-50 border border-red-100 text-red-650 rounded-2xl p-4 text-xs font-bold">
                <i class="fas fa-exclamation-triangle mr-1"></i> Không thể tải lịch sử đơn hàng của bạn. Vui lòng đăng nhập lại!
            </div>
        `;
    }
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
        const tickets = await window.apiClient.get('/api/nat/member/my-tickets');

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
            const statusClass = ticket.status === 'USED' 
                ? "text-slate-400 bg-slate-50 border-slate-200" 
                : "text-emerald-500 bg-emerald-50 border-emerald-100";

            return `
                <div class="border border-gray-150 rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-4 w-full md:w-auto">
                        <div class="w-12 h-12 rounded-xl bg-purple-50 text-brand-purple flex items-center justify-center text-lg shadow-inner flex-shrink-0">
                            <i class="fas fa-qrcode"></i>
                        </div>
                        <div class="flex flex-col gap-0.5 truncate">
                            <h4 class="text-xs sm:text-sm font-extrabold text-slate-800">Mã vé: ${ticket.ticketCode}</h4>
                            <span class="text-[10px] text-slate-400 font-semibold">Hạng vé: ${ticket.ticketType?.typeName || 'Vé phổ thông'}</span>
                            <span class="inline-block self-start text-[9px] font-black uppercase px-2 py-0.5 rounded border mt-1 ${statusClass}">
                                ${ticket.status === 'USED' ? 'Đã soát vé' : 'Hợp lệ'}
                            </span>
                        </div>
                    </div>
                    <div class="w-full md:w-auto flex justify-end">
                        <button type="button" onclick="showTicketQrModal(${ticket.ticketId}, '${ticket.ticketCode}')" class="bg-orange-500 hover:bg-orange-650 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition duration-200 shadow-sm w-full md:w-auto">
                            Hiển Thị QR Vé
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
window.showTicketQrModal = async function(ticketId, ticketCode) {
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

    // Call API lấy chi tiết vé
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Chưa đăng nhập");

        const response = await fetch(`http://localhost:8080/api/nat/member/tickets/${ticketId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error("Không thể lấy chi tiết vé");
        
        const ticketData = await response.json();
        
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
            formattedTime = d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) + ' - ' + d.toLocaleDateString('vi-VN');
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

window.closeTicketQrModal = function() {
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
                const updatedUser = await window.apiClient.put('/api/nat/member/profile', {
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
                await window.apiClient.post('/api/nat/member/change-password', {
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

window.openRefundModal = function(paymentId) {
    currentRefundPaymentId = paymentId;
    document.getElementById('refund-payment-id').innerText = paymentId;
    
    const modal = document.getElementById('refund-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.bg-white').classList.remove('scale-95');
    }, 10);
};

window.closeRefundModal = function() {
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
    const token = localStorage.getItem('token');
    
    // Loading State
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang xử lý...';
    btnSubmit.classList.add('opacity-70');

    try {
        const response = await fetch(`http://localhost:8080/api/nat/member/payments/${currentRefundPaymentId}/refund`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: reason })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Không thể gửi yêu cầu hoàn tiền');
        }

        alert('Gửi yêu cầu hoàn tiền thành công! Chúng tôi sẽ phản hồi qua email.');
        closeRefundModal();
    } catch (error) {
        console.error("Refund Error:", error);
        alert('Lỗi: ' + error.message);
    } finally {
        // Reset Button State
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Gửi Yêu Cầu';
        btnSubmit.classList.remove('opacity-70');
    }
});
