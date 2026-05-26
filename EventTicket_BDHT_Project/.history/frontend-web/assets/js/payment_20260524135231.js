document.addEventListener('DOMContentLoaded', () => {
    window.pageUtils.loadHeader();
    loadPaymentData();
});

let pollInterval  = null;
let timerInterval = null;

async function loadPaymentData() {
    const orderId      = localStorage.getItem('currentOrderId');
    const paymentInfo  = document.getElementById('payment-info');
    const paymentForm  = document.getElementById('payment-form');

    if (!paymentInfo || !paymentForm) return;

    if (!orderId) {
        paymentInfo.innerHTML = `Không tìm thấy đơn hàng. Vui lòng quay lại 
            <a href="${window.pageUtils.resolveUrl('/pages/user/cart.html')}" 
               style="color:#007bff;">giỏ hàng</a>.`;
        return;
    }

    try {
        const order = await window.apiClient.get(`/api/vtd/member/orders/${orderId}`);
        paymentInfo.innerHTML = `
            <p><strong>Đơn hàng #${order.orderId || orderId}</strong></p>
            <p>Trạng thái: ${order.status || 'PENDING'}</p>
            <p>Tổng giá trị: ${formatCurrency(order.totalAmount || 0)}</p>
            <p><strong>Cần thanh toán: ${formatCurrency(order.finalAmount ?? order.totalAmount ?? 0)}</strong></p>
        `;

        paymentForm.style.display = 'block';
        paymentForm.onsubmit = async (event) => {
            event.preventDefault();
            const method = document.getElementById('payment-method').value;

            if (method === 'BANK_TRANSFER') {
                await handleBankTransfer(orderId);
            } else {
                await handleOtherPayment(orderId, method);
            }
        };

    } catch (error) {
        paymentInfo.innerHTML = 'Không thể tải thông tin đơn hàng: ' + error.message;
    }
}

// ── Xử lý chuyển khoản QR ──────────────────────────────────────────
async function handleBankTransfer(orderId) {
    const paymentResult = document.getElementById('payment-result');
    const qrSection     = document.getElementById('qr-section');
    const successSection = document.getElementById('success-section');

    paymentResult.style.color = 'blue';
    paymentResult.innerText   = 'Đang tạo mã QR...';

    try {
        // 1. Tạo payment với method BANK_TRANSFER
        const payment = await window.apiClient.post('/api/vtd/member/payments', {
            orderId: Number(orderId),
            paymentMethod: 'BANK_TRANSFER'
        });

        // 2. Lấy QR URL
        const qrData = await window.apiClient.get(`/api/vtd/member/payments/${payment.paymentId}/qr`);

        // 3. Hiển thị QR
        paymentResult.innerText = '';
        document.getElementById('payment-form').style.display = 'none';
        qrSection.style.display = 'block';
        document.getElementById('qr-image').src    = qrData.qrUrl;
        document.getElementById('qr-amount').textContent = formatCurrency(qrData.amount);

        // 4. Đếm ngược 15 phút
        let countdown = 900;
        timerInterval = setInterval(() => {
            countdown--;
            const m = String(Math.floor(countdown / 60)).padStart(2, '0');
            const s = String(countdown % 60).padStart(2, '0');
            document.getElementById('qr-timer').textContent = `⏱ Hết hạn sau: ${m}:${s}`;
            if (countdown <= 0) {
                clearInterval(timerInterval);
                clearInterval(pollInterval);
                document.getElementById('qr-timer').textContent = '❌ QR hết hạn. Vui lòng thử lại.';
                qrSection.style.display = 'none';
                document.getElementById('payment-form').style.display = 'block';
            }
        }, 1000);

        // 5. Polling kiểm tra mỗi 5 giây
      pollInterval = setInterval(async () => {
        try {
            const status = await window.apiClient.get(`/api/vtd/member/payments/${payment.paymentId}`);
            if (status.status === 'SUCCESS') {
                clearInterval(pollInterval);
                clearInterval(timerInterval);
                localStorage.removeItem('currentOrderId');
                // Chuyển thẳng sang trang đơn hàng
                window.location.href = window.pageUtils
                    ? window.pageUtils.resolveUrl('/pages/user/profile.html')
                    : '/pages/user/profile.html';
            }
        } catch (e) {}
    }, 5000);

    } catch (error) {
        paymentResult.style.color = 'red';
        paymentResult.innerText   = 'Không thể tạo QR: ' + error.message;
    }
}

// ── Xử lý các phương thức khác (giữ nguyên flow cũ) ────────────────
async function handleOtherPayment(orderId, method) {
    const paymentResult = document.getElementById('payment-result');

    paymentResult.style.color = 'blue';
    paymentResult.innerText   = 'Đang tạo giao dịch thanh toán...';

    try {
        const payment = await window.apiClient.post('/api/vtd/member/payments', {
            orderId: Number(orderId),
            paymentMethod: method
        });

        paymentResult.innerText = 'Đang xác nhận kết quả giao dịch...';

        const completed = await window.apiClient.post(`/api/vtd/public/payments/${payment.paymentId}/webhook`, {
            status: 'SUCCESS',
            transactionId: `${method}-${Date.now()}`
        });

        paymentResult.style.color = 'green';
        paymentResult.innerHTML = `
            Thanh toán thành công.<br>
            Mã giao dịch: ${payment.paymentId || '---'}<br>
            Trạng thái: ${completed.paymentStatus || 'SUCCESS'}<br>
            <a href="${window.pageUtils.resolveUrl('/pages/user/profile.html')}" 
               style="color:#007bff;">Xem kho vé điện tử</a>
        `;
        localStorage.removeItem('currentOrderId');

    } catch (error) {
        paymentResult.style.color = 'red';
        paymentResult.innerText   = 'Thanh toán thất bại: ' + error.message;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
           .format(Number(amount || 0));
}