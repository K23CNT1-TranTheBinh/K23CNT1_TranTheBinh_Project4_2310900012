/**
 * =========================================================================
 * DỰ ÁN HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT - PHÂN HỆ KHÁCH HÀNG (MEMBER/GUEST)
 * FILE: payment.js
 * CHỨC NĂNG: Xử lý quy trình thanh toán đơn hàng (Chuyển khoản qua QR hoặc Tiền mặt/Ví điện tử)
 * =========================================================================
 */

// Biến toàn cục để quản lý tiến trình thăm dò trạng thái (polling) và đếm ngược thời gian (countdown)
let pollInterval = null;
let timerInterval = null;

// Chờ toàn bộ giao diện HTML tải xong thì mới bắt đầu xử lý logic
document.addEventListener('DOMContentLoaded', () => {
    // Tải Header động nếu có file pageUtils hỗ trợ
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }

    // Đăng ký sự kiện click cho nút xác nhận thanh toán
    const submitButton = document.getElementById('btn-submit');
    if (submitButton) {
        submitButton.addEventListener('click', submitPayment);
    }

    // Tải thông tin đơn hàng cần thanh toán từ LocalStorage/SessionStorage
    loadPaymentData();
});

/**
 * Hàm hỗ trợ xử lý đường dẫn tương đối hoặc tuyệt đối tùy môi trường chạy
 * @param {string} path - Đường dẫn gốc trong dự án
 * @returns {string} - Đường dẫn đã được xử lý chuẩn hóa
 */
function appUrl(path) {
    return window.pageUtils && typeof window.pageUtils.resolveUrl === 'function'
        ? window.pageUtils.resolveUrl(path)
        : `../../${path}`;
}

/**
 * Hàm lấy dữ liệu và hiển thị thông tin đơn hàng cần thanh toán lên màn hình
 */
async function loadPaymentData() {
    const paymentInfo = document.getElementById('payment-info');
    const paymentFormSection = document.getElementById('payment-form-section');

    if (!paymentInfo || !paymentFormSection) return;

    try {
        // Lấy hoặc tạo đơn hàng thanh toán từ dữ liệu giỏ hàng lưu ở LocalStorage
        const orderId = await getOrCreatePaymentOrder();

        // Nếu không tìm thấy bất kỳ mã đơn hàng nào
        if (!orderId) {
            paymentInfo.innerHTML = `
                <p style="color: var(--danger); font-size: 14px; font-weight: bold; text-align: center;">
                    ⚠️ Không tìm thấy thông tin đơn hàng hợp lệ.<br>
                    <a href="${appUrl('pages/user/nat-cart.html')}" style="color: var(--accent); text-decoration: underline;">Quay lại giỏ hàng của bạn</a>
                </p>`;
            return;
        }

        // Gọi API backend hoặc khôi phục đơn hàng nếu gặp sự cố kết nối
        let order = await fetchOrderOrRecover(orderId);
        if (!order) {
            paymentInfo.innerHTML = `
                <p style="color: var(--danger); font-size: 14px; font-weight: bold; text-align: center;">
                    ❌ Không thể khôi phục đơn hàng thanh toán.<br>
                    <a href="${appUrl('pages/user/nat-cart.html')}" style="color: var(--accent); text-decoration: underline;">Quay lại giỏ hàng để thử lại</a>
                </p>`;
            return;
        }

        // Tạo chuỗi mã hóa đơn giảm giá (nếu có khuyến mãi)
        let discountRow = '';
        if (order.promotion) {
            const discountAmount = (order.totalAmount || 0) - (order.finalAmount || 0);
            discountRow = `
                <div class="order-row">
                    <span class="label">Áp dụng giảm giá</span>
                    <span class="value" style="color: var(--success); font-weight: 700;">
                        -${formatCurrency(discountAmount)}
                    </span>
                </div>`;
        }

        // Điền thông tin hóa đơn chi tiết vào giao diện HTML
        paymentInfo.innerHTML = `
            <div class="order-row">
                <span class="label">Mã đơn hàng</span>
                <span class="value" style="font-family: monospace; font-size: 15px; color: var(--accent);">#BDHT${order.orderId || orderId}</span>
            </div>
            <div class="order-row">
                <span class="label">Trạng thái</span>
                <span class="value" style="color: var(--warning); font-weight: 700; text-transform: uppercase;">⏱️ ${order.status || 'PENDING'}</span>
            </div>
            <div class="order-row">
                <span class="label">Tổng giá trị ban đầu</span>
                <span class="value">${formatCurrency(order.totalAmount || 0)}</span>
            </div>
            ${discountRow}
            <div class="order-row total">
                <span class="label">Cần thanh toán thực tế</span>
                <span class="value">${formatCurrency(order.finalAmount ?? order.totalAmount ?? 0)}</span>
            </div>
        `;

        // Hiển thị phần chọn phương thức thanh toán
        paymentFormSection.style.display = 'block';
    } catch (error) {
        // Hiển thị thông báo lỗi thân thiện lên giao diện
        paymentInfo.innerHTML = `
            <p style="color: var(--danger); font-size: 14px; font-weight: bold; text-align: center;">
                ❌ Không thể tải thông tin đơn hàng: ${error.message}
            </p>`;
    }
}

/**
 * Hàm lấy thông tin đơn hàng từ API, nếu lỗi thì tìm cách khôi phục lại từ checkoutData
 * @param {number|string} orderId - Mã đơn hàng
 */
async function fetchOrderOrRecover(orderId) {
    try {
        return await window.apiClient.get(`/api/vtd/member/orders/${orderId}`);
    } catch (error) {
        console.warn('Đơn hàng hiện tại không tồn tại trên máy chủ, thử tạo mới lại từ dữ liệu checkoutData:', error);
        localStorage.removeItem('currentOrderId');

        const recoveredOrderId = await getOrCreatePaymentOrder();
        if (!recoveredOrderId || recoveredOrderId === String(orderId)) {
            throw error; // Ném lỗi ra ngoài nếu không thể phục hồi
        }

        return window.apiClient.get(`/api/vtd/member/orders/${recoveredOrderId}`);
    }
}

/**
 * Hàm đọc dữ liệu tạm từ localStorage/sessionStorage để khôi phục giỏ hàng khi thanh toán
 */
function readStoredCheckoutData() {
    const keys = ['checkoutData', 'pendingCheckout'];
    const stores = [localStorage, sessionStorage];

    for (const store of stores) {
        for (const key of keys) {
            const raw = store.getItem(key);
            if (!raw) continue;

            try {
                const data = JSON.parse(raw);
                if (data && Array.isArray(data.items) && data.items.length > 0) {
                    return data;
                }
            } catch (error) {
                console.warn(`Không đọc được cấu trúc JSON từ khóa ${key}:`, error);
            }
        }
    }

    return null;
}

/**
 * Hàm khởi tạo đơn hàng mới trên Database dựa theo giỏ hàng tạm của Client
 * @returns {Promise<string|null>} - Trả về mã đơn hàng orderId vừa tạo
 */
async function getOrCreatePaymentOrder() {
    // Nếu đã có orderId đang xử lý dở trong phiên làm việc
    const existingOrderId = localStorage.getItem('currentOrderId');
    if (existingOrderId) return existingOrderId;

    // Đọc giỏ hàng tạm được người dùng lưu ở trang Chi tiết sự kiện
    const checkoutData = readStoredCheckoutData();
    if (!checkoutData) return null;

    // 1. Gọi API POST khởi tạo một đơn hàng rỗng trên Database
    const createdOrder = await window.apiClient.post('/api/vtd/member/orders', {});
    if (!createdOrder || !createdOrder.orderId) {
        throw new Error('Không tạo được phiên giao dịch đơn hàng trên máy chủ.');
    }

    const orderId = createdOrder.orderId;
    const items = checkoutData.items.filter((item) => item.ticketTypeId && Number(item.quantity || 0) > 0);
    if (items.length === 0) {
        throw new Error('Giỏ hàng tạm không có thông tin hạng vé hợp lệ.');
    }

    // 2. Lần lượt đẩy các vé được chọn lên Database thông qua API thêm items vào đơn hàng
    for (const item of items) {
        await window.apiClient.post(`/api/vtd/member/orders/${orderId}/items`, {
            ticketTypeId: Number(item.ticketTypeId),
            quantity: Number(item.quantity || 1)
        });
    }

    // Lưu mã đơn hàng thành công vào localStorage để theo dõi
    localStorage.setItem('currentOrderId', orderId);
    return String(orderId);
}

/**
 * Hàm chính xử lý khi người dùng nhấn nút "Tiến hành thanh toán"
 */
async function submitPayment() {
    const orderId = localStorage.getItem('currentOrderId');
    const methodInput = document.querySelector('input[name="payment-method"]:checked');
    const btn = document.getElementById('btn-submit');
    const result = document.getElementById('payment-result');

    if (!orderId) {
        if (result) {
            result.style.color = 'var(--danger)';
            result.innerHTML = '⚠️ Không tìm thấy đơn hàng tương ứng để thực hiện thanh toán.';
        }
        return;
    }

    if (!methodInput) {
        if (result) {
            result.style.color = 'var(--danger)';
            result.innerHTML = '⚠️ Vui lòng lựa chọn một phương thức thanh toán trước.';
        }
        return;
    }

    // Vô hiệu hóa nút để tránh người dùng click liên tục nhiều lần (Double Submit)
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Đang kết nối tới máy chủ...';

    // Rẽ nhánh xử lý tùy vào phương thức thanh toán được chọn
    if (methodInput.value === 'BANK_TRANSFER') {
        await handleBankTransfer(orderId, btn);
    } else {
        await handleOtherPayment(orderId, methodInput.value, btn);
    }
}

/**
 * Hàm xử lý trường hợp chuyển khoản ngân hàng qua mã VietQR
 */
async function handleBankTransfer(orderId, btn) {
    const result = document.getElementById('payment-result');
    const paymentFormSection = document.getElementById('payment-form-section');
    const qrSection = document.getElementById('qr-section');

    if (result) {
        result.style.color = 'var(--text-muted)';
        result.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Đang khởi tạo mã QR thanh toán an toàn VietQR...';
    }

    try {
        // 1. Gọi API POST để khởi tạo giao dịch thanh toán
        const payment = await window.apiClient.post('/api/vtd/member/payments', {
            orderId: Number(orderId),
            paymentMethod: 'BANK_TRANSFER'
        });

        // 2. Lấy link mã QR VietQR từ máy chủ
        const qrData = await window.apiClient.get(`/api/vtd/member/payments/${payment.paymentId}/qr`);

        if (result) result.textContent = '';
        
        // Ẩn form chọn phương thức và hiển thị khung quét QR động
        paymentFormSection.style.display = 'none';
        qrSection.style.display = 'block';

        // Gắn các thông số ảnh QR, số tiền chuyển khoản
        document.getElementById('qr-image').src = qrData.qrUrl;
        document.getElementById('qr-amount').textContent = formatCurrency(qrData.amount);
        document.getElementById('btn-view-tickets').href = appUrl('pages/user/nat-profile.html');

        // Lưu thông tin paymentId để phục vụ việc đối chiếu trạng thái ở trang cá nhân
        localStorage.setItem(`payment_for_order_${orderId}`, payment.paymentId);

        // Kích hoạt đồng hồ đếm ngược 15 phút an toàn và tính năng thăm dò tự động (Polling)
        startQrCountdown(btn, paymentFormSection, qrSection);
        startPaymentPolling(payment.paymentId);
    } catch (error) {
        if (result) {
            result.style.color = 'var(--danger)';
            result.innerHTML = '❌ Không thể tạo mã QR lúc này: ' + error.message;
        }
        resetSubmitButton(btn);
    }
}

/**
 * Hàm chạy đồng hồ đếm ngược thời hạn thanh toán an toàn của mã QR
 */
function startQrCountdown(btn, paymentFormSection, qrSection) {
    clearInterval(timerInterval);

    let countdown = 900; // 15 phút = 900 giây
    timerInterval = setInterval(() => {
        countdown--;
        const minutes = String(Math.floor(countdown / 60)).padStart(2, '0');
        const seconds = String(countdown % 60).padStart(2, '0');
        document.getElementById('qr-timer').innerHTML = `⏱️ Mã QR hết hạn sau: <span style="font-family:monospace; font-weight:bold;">${minutes}:${seconds}</span>`;

        // Nếu hết 15 phút chưa thanh toán thành công
        if (countdown <= 0) {
            clearInterval(timerInterval);
            clearInterval(pollInterval);
            document.getElementById('qr-timer').textContent = '⚠️ Mã QR đã hết hạn. Vui lòng thao tác lại.';
            qrSection.style.display = 'none';
            paymentFormSection.style.display = 'block';
            resetSubmitButton(btn);
        }
    }, 1000);
}

/**
 * Hàm tự động gửi request thăm dò (Long-polling) trạng thái thanh toán đến Backend sau mỗi 5 giây
 * @param {number} paymentId - ID của giao dịch cần kiểm soát
 */
function startPaymentPolling(paymentId) {
    clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        try {
            // Hỏi Backend trạng thái của Payment ID
            const status = await window.apiClient.get(`/api/vtd/member/payments/${paymentId}`);
            
            // Nếu trạng thái đổi thành SUCCESS (đã nhận được tiền thật thông qua Webhook ngân hàng)
            if (status.status === 'SUCCESS' || status.paymentStatus === 'COMPLETED') {
                clearInterval(pollInterval);
                clearInterval(timerInterval);
                
                // Xóa phiên làm việc đơn hàng hiện tại
                localStorage.removeItem('currentOrderId');
                
                // Chuyển hướng sang kho vé cá nhân
                window.location.href = appUrl('pages/user/nat-profile.html');
            }
        } catch (error) {
            console.error('Lỗi trong quá trình polling cập nhật trạng thái:', error);
        }
    }, 5000); // Polling mỗi 5 giây
}

/**
 * Hàm xử lý thanh toán giả lập dành cho các phương thức khác (Tiền mặt, MoMo, VNPay...)
 */
async function handleOtherPayment(orderId, method, btn) {
    const result = document.getElementById('payment-result');
    result.style.color = 'var(--text-muted)';
    result.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Đang xử lý giao dịch thanh toán...';

    try {
        // 1. Tạo bản ghi giao dịch
        const payment = await window.apiClient.post('/api/vtd/member/payments', {
            orderId: Number(orderId),
            paymentMethod: method
        });

        // Lưu thông tin paymentId của đơn hàng này
        localStorage.setItem(`payment_for_order_${orderId}`, payment.paymentId);

        // 2. Giả lập một Webhook báo thanh toán thành công lập tức để phục vụ môi trường demo
        await window.apiClient.post(`/api/vtd/public/payments/${payment.paymentId}/webhook`, {
            status: 'SUCCESS',
            transactionId: `${method}-MOCK-${Date.now()}`
        });

        // Ẩn form nhập liệu, hiển thị màn hình chúc mừng thành công
        document.getElementById('payment-form-section').style.display = 'none';
        document.getElementById('success-section').style.display = 'block';
        document.getElementById('btn-view-tickets').href = appUrl('pages/user/nat-profile.html');
        
        // Xóa mã đơn hàng khỏi giỏ hàng
        localStorage.removeItem('currentOrderId');
    } catch (error) {
        result.style.color = 'var(--danger)';
        result.innerHTML = '❌ Thanh toán không thành công: ' + error.message;
        resetSubmitButton(btn);
    }
}

/**
 * Hàm hồi phục trạng thái ban đầu của nút bấm xác nhận thanh toán khi gặp lỗi
 */
function resetSubmitButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = 'Tiến hành thanh toán';
}

/**
 * Hàm tiện ích format định dạng tiền tệ sang chuẩn Việt Nam Đồng (VND)
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
        .format(Number(amount || 0));
}
