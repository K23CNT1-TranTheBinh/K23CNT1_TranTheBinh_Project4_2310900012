let pollInterval = null;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }

    loadPaymentData();
});

function appUrl(path) {
    return window.pageUtils && typeof window.pageUtils.resolveUrl === 'function'
        ? window.pageUtils.resolveUrl(path)
        : `../../${path}`;
}

async function loadPaymentData() {
    const paymentInfo = document.getElementById('payment-info');
    const loadingSection = document.getElementById('loading-section');

    if (!paymentInfo || !loadingSection) return;

    try {
        const checkoutData = readStoredCheckoutData();
        const orderId = await getOrCreatePaymentOrder();

        if (!orderId) {
            paymentInfo.innerHTML = `
                <p style="color:var(--danger); font-size:14px;">
                    Không tìm thấy đơn hàng.<br>
                    <a href="${appUrl('pages/user/nat-cart.html')}" style="color:var(--accent);">Quay lại giỏ hàng</a>
                </p>`;
            showError('Không tìm thấy đơn hàng. Vui lòng quay lại giỏ hàng.');
            return;
        }

        let order = await fetchOrderOrRecover(orderId);
        if (!order) {
            showError('Không thể khôi phục đơn hàng. Vui lòng thử lại.');
            return;
        }

        // Render order info
        paymentInfo.innerHTML = `
            <div class="order-row">
                <span class="label">Mã đơn hàng</span>
                <span class="value">#${order.orderId || orderId}</span>
            </div>
            <div class="order-row">
                <span class="label">Trạng thái</span>
                <span class="value" style="color:var(--warning);">${order.status || 'PENDING'}</span>
            </div>
            <div class="order-row">
                <span class="label">Tổng giá trị</span>
                <span class="value">${formatCurrency(order.totalAmount || 0)}</span>
            </div>
            ${order.promotion ? `
            <div class="order-row">
                <span class="label">Giảm giá</span>
                <span class="value" style="color:var(--success);">
                    -${formatCurrency((order.totalAmount || 0) - (order.finalAmount || 0))}
                </span>
            </div>` : ''}
            <div class="order-row total">
                <span class="label">Cần thanh toán</span>
                <span class="value">${formatCurrency(order.finalAmount ?? order.totalAmount ?? 0)}</span>
            </div>
        `;

        // If already completed
        if (order.status === 'COMPLETED') {
            loadingSection.style.display = 'none';
            showSuccess();
            return;
        }

        // If cancelled
        if (order.status === 'CANCELLED') {
            showError('Đơn hàng này đã bị hủy. Bạn không thể thanh toán.');
            return;
        }

        // Determine payment method from checkout data
        const selectedPayment = resolvePaymentMethod(checkoutData);
        document.getElementById('btn-view-tickets').href = appUrl('pages/user/nat-profile.html');

        if (selectedPayment === 'BANK_TRANSFER') {
            await handleBankTransfer(orderId);
        } else {
            await handleOtherPayment(orderId, selectedPayment);
        }

    } catch (error) {
        paymentInfo.innerHTML = `<p style="color:var(--danger); font-size:14px;">
            Không thể tải đơn hàng: ${error.message}</p>`;
        showError('Đã xảy ra lỗi: ' + error.message);
    }
}

function resolvePaymentMethod(checkoutData) {
    let method = checkoutData?.selectedPayment || 'BANK_TRANSFER';

    if (['vietqr', 'BANK_TRANSFER', 'BANK'].includes(method)) return 'BANK_TRANSFER';
    if (['momo', 'MOMO'].includes(method)) return 'MOMO';
    if (['cash', 'CASH'].includes(method.toLowerCase())) return 'CASH';
    if (['zalopay', 'vnpay', 'VNPAY', 'credit', 'atm'].includes(method.toLowerCase())) return 'VNPAY';

    return 'BANK_TRANSFER'; // default
}

async function fetchOrderOrRecover(orderId) {
    try {
        return await window.apiClient.get(`/api/vtd/member/orders/${orderId}`);
    } catch (error) {
        console.warn('Order hiện tại không tải được, thử tạo lại từ checkoutData:', error);
        if (window.cartSession) {
            window.cartSession.clearOrder();
        } else {
            localStorage.removeItem('currentOrderId');
        }

        const recoveredOrderId = await getOrCreatePaymentOrder();
        if (!recoveredOrderId || recoveredOrderId === String(orderId)) {
            throw error;
        }

        return window.apiClient.get(`/api/vtd/member/orders/${recoveredOrderId}`);
    }
}

function readStoredCheckoutData() {
    const keys = ['checkoutData', 'pendingCheckout'];
    const stores = [sessionStorage, localStorage];

    for (const store of stores) {
        for (const key of keys) {
            const raw = store.getItem(key);
            if (!raw) continue;

            try {
                const data = JSON.parse(raw);
                const isCurrentUserData = window.cartSession ? window.cartSession.belongsToCurrentUser(data) : true;
                if (isCurrentUserData && data && Array.isArray(data.items) && data.items.length > 0) {
                    return data;
                }
            } catch (error) {
                console.warn(`Không đọc được ${key}:`, error);
            }
        }
    }

    return null;
}

async function getOrCreatePaymentOrder() {
    const existingOrderId = window.cartSession ? window.cartSession.getOrderId() : localStorage.getItem('currentOrderId');
    const checkoutData = readStoredCheckoutData();
    const checkoutOrderId = checkoutData?.orderId ? String(checkoutData.orderId) : null;

    if (checkoutOrderId) {
        if (window.cartSession) {
            window.cartSession.setOrderId(checkoutOrderId);
        } else {
            localStorage.setItem('currentOrderId', checkoutOrderId);
        }
        return checkoutOrderId;
    }

    if (existingOrderId && (!checkoutData || checkoutOrderId === String(existingOrderId))) {
        return existingOrderId;
    }

    if (existingOrderId && checkoutData && checkoutOrderId !== String(existingOrderId)) {
        if (window.cartSession) {
            window.cartSession.clearOrder();
        } else {
            localStorage.removeItem('currentOrderId');
        }
    }

    if (!checkoutData) return null;

    const createdOrder = await window.apiClient.post('/api/vtd/member/orders', {});
    if (!createdOrder || !createdOrder.orderId) {
        throw new Error('Không tạo được đơn hàng thanh toán.');
    }

    const orderId = createdOrder.orderId;
    const items = checkoutData.items.filter((item) => item.ticketTypeId && Number(item.quantity || 0) > 0);
    if (items.length === 0) {
        throw new Error('Dữ liệu thanh toán không có hàng vé hợp lệ.');
    }

    for (const item of items) {
        await window.apiClient.post(`/api/vtd/member/orders/${orderId}/items`, {
            ticketTypeId: Number(item.ticketTypeId),
            quantity: Number(item.quantity || 1)
        });
    }

    if (window.cartSession) {
        window.cartSession.setOrderId(orderId);
    } else {
        localStorage.setItem('currentOrderId', orderId);
    }
    return String(orderId);
}

async function handleBankTransfer(orderId) {
    try {
        const payment = await window.apiClient.post('/api/vtd/member/payments', {
            orderId: Number(orderId),
            paymentMethod: 'BANK_TRANSFER'
        });

        const qrData = await window.apiClient.get(`/api/vtd/member/payments/${payment.paymentId}/qr`);

        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('qr-section').style.display = 'block';

        document.getElementById('qr-image').src = qrData.qrUrl;
        document.getElementById('qr-amount').textContent = formatCurrency(qrData.amount);

        startQrCountdown();
        startPaymentPolling(payment.paymentId);
    } catch (error) {
        showError('Không thể tạo mã QR: ' + error.message);
    }
}

function startQrCountdown() {
    clearInterval(timerInterval);

    let countdown = 900;
    const timerEl = document.getElementById('qr-timer');

    timerInterval = setInterval(() => {
        countdown--;
        const minutes = String(Math.floor(countdown / 60)).padStart(2, '0');
        const seconds = String(countdown % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `⏱ Hết hạn sau: ${minutes}:${seconds}`;

        if (countdown <= 0) {
            clearInterval(timerInterval);
            clearInterval(pollInterval);
            if (timerEl) timerEl.textContent = 'QR đã hết hạn. Vui lòng thử lại.';
            document.getElementById('qr-section').style.display = 'none';
            showError('Mã QR đã hết hạn. <a href="javascript:location.reload()" style="color:var(--accent);">Tải lại trang</a> để tạo mã mới.');
        }
    }, 1000);
}

function startPaymentPolling(paymentId) {
    clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        try {
            const status = await window.apiClient.get(`/api/vtd/member/payments/${paymentId}`);
            if (status.status === 'SUCCESS') {
                clearInterval(pollInterval);
                clearInterval(timerInterval);
                if (window.cartSession) {
                    window.cartSession.clear();
                } else {
                    localStorage.removeItem('currentOrderId');
                }
                document.getElementById('qr-section').style.display = 'none';
                document.getElementById('loading-section').style.display = 'none';
                showSuccess();
            }
        } catch (error) {
            console.error('Polling lỗi:', error);
        }
    }, 5000);
}

async function handleOtherPayment(orderId, method) {
    try {
        const payment = await window.apiClient.post('/api/vtd/member/payments', {
            orderId: Number(orderId),
            paymentMethod: method
        });

        await window.apiClient.post(`/api/vtd/public/payments/${payment.paymentId}/webhook`, {
            status: 'SUCCESS',
            transactionId: `${method}-${Date.now()}`
        });

        document.getElementById('loading-section').style.display = 'none';
        if (window.cartSession) {
            window.cartSession.clear();
        } else {
            localStorage.removeItem('currentOrderId');
        }
        showSuccess();
    } catch (error) {
        showError('Thanh toán thất bại: ' + error.message);
    }
}

function showSuccess() {
    document.getElementById('loading-section').style.display = 'none';
    document.getElementById('qr-section').style.display = 'none';
    document.getElementById('error-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'block';
    document.getElementById('btn-view-tickets').href = appUrl('pages/user/nat-profile.html');
}

function showError(message) {
    document.getElementById('loading-section').style.display = 'none';
    document.getElementById('qr-section').style.display = 'none';
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    if (errorSection && errorMessage) {
        errorMessage.innerHTML = message;
        errorSection.style.display = 'block';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
        .format(Number(amount || 0));
}
