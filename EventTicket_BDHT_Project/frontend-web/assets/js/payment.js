let pollInterval = null;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }

    const submitButton = document.getElementById('btn-submit');
    if (submitButton) {
        submitButton.addEventListener('click', submitPayment);
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
    const paymentFormSection = document.getElementById('payment-form-section');

    if (!paymentInfo || !paymentFormSection) return;

    try {
        const orderId = await getOrCreatePaymentOrder();

        if (!orderId) {
            paymentInfo.innerHTML = `
                <p style="color:var(--danger); font-size:14px;">
                    Khong tim thay don hang.<br>
                    <a href="${appUrl('pages/user/cart.html')}" style="color:var(--accent);">Quay lai gio hang</a>
                </p>`;
            return;
        }

        let order = await fetchOrderOrRecover(orderId);
        if (!order) {
            paymentInfo.innerHTML = `
                <p style="color:var(--danger); font-size:14px;">
                    Khong the khoi phuc don hang thanh toan.<br>
                    <a href="${appUrl('pages/user/cart.html')}" style="color:var(--accent);">Quay lai gio hang</a>
                </p>`;
            return;
        }

        paymentInfo.innerHTML = `
            <div class="order-row">
                <span class="label">Ma don hang</span>
                <span class="value">#${order.orderId || orderId}</span>
            </div>
            <div class="order-row">
                <span class="label">Trang thai</span>
                <span class="value" style="color:var(--warning);">${order.status || 'PENDING'}</span>
            </div>
            <div class="order-row">
                <span class="label">Tong gia tri</span>
                <span class="value">${formatCurrency(order.totalAmount || 0)}</span>
            </div>
            ${order.promotion ? `
            <div class="order-row">
                <span class="label">Giam gia</span>
                <span class="value" style="color:var(--success);">
                    -${formatCurrency((order.totalAmount || 0) - (order.finalAmount || 0))}
                </span>
            </div>` : ''}
            <div class="order-row total">
                <span class="label">Can thanh toan</span>
                <span class="value">${formatCurrency(order.finalAmount ?? order.totalAmount ?? 0)}</span>
            </div>
        `;

        paymentFormSection.style.display = 'block';
    } catch (error) {
        paymentInfo.innerHTML = `<p style="color:var(--danger); font-size:14px;">
            Khong the tai don hang: ${error.message}</p>`;
    }
}

async function fetchOrderOrRecover(orderId) {
    try {
        return await window.apiClient.get(`/api/vtd/member/orders/${orderId}`);
    } catch (error) {
        console.warn('Order hien tai khong tai duoc, thu tao lai tu checkoutData:', error);
        localStorage.removeItem('currentOrderId');

        const recoveredOrderId = await getOrCreatePaymentOrder();
        if (!recoveredOrderId || recoveredOrderId === String(orderId)) {
            throw error;
        }

        return window.apiClient.get(`/api/vtd/member/orders/${recoveredOrderId}`);
    }
}

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
                console.warn(`Khong doc duoc ${key}:`, error);
            }
        }
    }

    return null;
}

async function getOrCreatePaymentOrder() {
    const existingOrderId = localStorage.getItem('currentOrderId');
    if (existingOrderId) return existingOrderId;

    const checkoutData = readStoredCheckoutData();
    if (!checkoutData) return null;

    const createdOrder = await window.apiClient.post('/api/vtd/member/orders', {});
    if (!createdOrder || !createdOrder.orderId) {
        throw new Error('Khong tao duoc don hang thanh toan.');
    }

    const orderId = createdOrder.orderId;
    const items = checkoutData.items.filter((item) => item.ticketTypeId && Number(item.quantity || 0) > 0);
    if (items.length === 0) {
        throw new Error('Du lieu thanh toan khong co hang ve hop le.');
    }

    for (const item of items) {
        await window.apiClient.post(`/api/vtd/member/orders/${orderId}/items`, {
            ticketTypeId: Number(item.ticketTypeId),
            quantity: Number(item.quantity || 1)
        });
    }

    localStorage.setItem('currentOrderId', orderId);
    return String(orderId);
}

async function submitPayment() {
    const orderId = localStorage.getItem('currentOrderId');
    const methodInput = document.querySelector('input[name="payment-method"]:checked');
    const btn = document.getElementById('btn-submit');
    const result = document.getElementById('payment-result');

    if (!orderId) {
        if (result) {
            result.style.color = 'var(--danger)';
            result.textContent = 'Khong tim thay don hang de thanh toan.';
        }
        return;
    }

    if (!methodInput) {
        if (result) {
            result.style.color = 'var(--danger)';
            result.textContent = 'Vui long chon phuong thuc thanh toan.';
        }
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Dang xu ly...';

    if (methodInput.value === 'BANK_TRANSFER') {
        await handleBankTransfer(orderId, btn);
    } else {
        await handleOtherPayment(orderId, methodInput.value, btn);
    }
}

async function handleBankTransfer(orderId, btn) {
    const result = document.getElementById('payment-result');
    const paymentFormSection = document.getElementById('payment-form-section');
    const qrSection = document.getElementById('qr-section');

    if (result) {
        result.style.color = 'var(--text-muted)';
        result.textContent = 'Dang tao ma QR...';
    }

    try {
        const payment = await window.apiClient.post('/api/vtd/member/payments', {
            orderId: Number(orderId),
            paymentMethod: 'BANK_TRANSFER'
        });

        const qrData = await window.apiClient.get(`/api/vtd/member/payments/${payment.paymentId}/qr`);

        if (result) result.textContent = '';
        paymentFormSection.style.display = 'none';
        qrSection.style.display = 'block';

        document.getElementById('qr-image').src = qrData.qrUrl;
        document.getElementById('qr-amount').textContent = formatCurrency(qrData.amount);
        document.getElementById('btn-view-tickets').href = appUrl('pages/user/profile.html');

        startQrCountdown(btn, paymentFormSection, qrSection);
        startPaymentPolling(payment.paymentId);
    } catch (error) {
        if (result) {
            result.style.color = 'var(--danger)';
            result.textContent = 'Khong the tao QR: ' + error.message;
        }
        resetSubmitButton(btn);
    }
}

function startQrCountdown(btn, paymentFormSection, qrSection) {
    clearInterval(timerInterval);

    let countdown = 900;
    timerInterval = setInterval(() => {
        countdown--;
        const minutes = String(Math.floor(countdown / 60)).padStart(2, '0');
        const seconds = String(countdown % 60).padStart(2, '0');
        document.getElementById('qr-timer').textContent = `Het han sau: ${minutes}:${seconds}`;

        if (countdown <= 0) {
            clearInterval(timerInterval);
            clearInterval(pollInterval);
            document.getElementById('qr-timer').textContent = 'QR het han. Vui long thu lai.';
            qrSection.style.display = 'none';
            paymentFormSection.style.display = 'block';
            resetSubmitButton(btn);
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
                localStorage.removeItem('currentOrderId');
                window.location.href = appUrl('pages/user/profile.html');
            }
        } catch (error) {
            console.error('Polling loi:', error);
        }
    }, 5000);
}

async function handleOtherPayment(orderId, method, btn) {
    const result = document.getElementById('payment-result');
    result.style.color = 'var(--text-muted)';
    result.textContent = 'Dang xu ly...';

    try {
        const payment = await window.apiClient.post('/api/vtd/member/payments', {
            orderId: Number(orderId),
            paymentMethod: method
        });

        await window.apiClient.post(`/api/vtd/public/payments/${payment.paymentId}/webhook`, {
            status: 'SUCCESS',
            transactionId: `${method}-${Date.now()}`
        });

        document.getElementById('payment-form-section').style.display = 'none';
        document.getElementById('success-section').style.display = 'block';
        document.getElementById('btn-view-tickets').href = appUrl('pages/user/profile.html');
        localStorage.removeItem('currentOrderId');
    } catch (error) {
        result.style.color = 'var(--danger)';
        result.textContent = 'Thanh toan that bai: ' + error.message;
        resetSubmitButton(btn);
    }
}

function resetSubmitButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = 'Tien hanh thanh toan';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
        .format(Number(amount || 0));
}
