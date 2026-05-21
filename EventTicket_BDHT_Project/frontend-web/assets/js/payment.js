document.addEventListener('DOMContentLoaded', () => {
    // Tải Header dynamic nếu có tiện ích
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }

    loadOrderAndPaymentInfo();
    startCountdown();
    setupBackButton();
    setupConfirmPayment();
});

// ==========================================
// 1. TẢI VÀ ĐỒNG BỘ DỮ LIỆU THANH TOÁN TỪ LOCALSTORAGE
// ==========================================
function loadOrderAndPaymentInfo() {
    const checkoutDataStr = localStorage.getItem('checkoutData');
    
    // Nếu không có dữ liệu đơn hàng hợp lệ, tự động trả về trang chi tiết sự kiện để tránh lỗi
    if (!checkoutDataStr) {
        alert("Không tìm thấy thông tin thanh toán hợp lệ! Đang chuyển hướng bạn quay lại Trang chủ.");
        window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('index.html') : '../../index.html';
        return;
    }

    try {
        const checkoutData = JSON.parse(checkoutDataStr);
        const orderId = checkoutData.orderId || '42357';
        const eventName = checkoutData.eventName || 'Sự kiện đặc sắc';
        const totalAmount = checkoutData.totalAmount || '3.100.000đ';
        const selectedPayment = checkoutData.selectedPayment || 'vietqr';

        // Cập nhật giao diện bên trái
        const orderIdEl = document.getElementById('payment-order-id');
        if (orderIdEl) orderIdEl.innerText = `BDHT${orderId}`;

        const eventNameEl = document.getElementById('payment-event-name');
        if (eventNameEl) eventNameEl.innerText = eventName;

        const amountEl = document.getElementById('payment-amount');
        if (amountEl) amountEl.innerText = totalAmount;

        // Cập nhật hiển thị View thanh toán bên phải
        const momoView = document.getElementById('momo-view');
        const bankView = document.getElementById('bank-view');

        if (momoView && bankView) {
            const numericAmount = parseInt(totalAmount.replace(/[^0-9]/g, '')) || 3100000;

            if (selectedPayment === 'momo') {
                momoView.classList.remove('hidden');
                bankView.classList.add('hidden');

                // Cập nhật mã QR MoMo động
                const momoQrImg = document.getElementById('momo-qr-img');
                if (momoQrImg) {
                    momoQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MoMoPayment_BDHT${orderId}_${numericAmount}`;
                }
            } else {
                bankView.classList.remove('hidden');
                momoView.classList.add('hidden');

                // Cập nhật text bank details
                const bankMemo = document.getElementById('bank-memo');
                if (bankMemo) bankMemo.innerText = `BDHT${orderId}`;

                // Cập nhật mã QR VietQR động (Sử dụng MB Bank)
                const bankQrImg = document.getElementById('bank-qr-img');
                if (bankQrImg) {
                    bankQrImg.src = `https://img.vietqr.io/image/MB-123456789-print.png?amount=${numericAmount}&addInfo=BDHT${orderId}&accountName=CONG%20TY%20ALADDIN`;
                }
            }
        }
    } catch (e) {
        console.error("Lỗi phân tích dữ liệu checkoutData:", e);
        alert("Dữ liệu thanh toán bị hỏng! Quay lại trang chủ.");
        window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('index.html') : '../../index.html';
    }
}

// ==========================================
// 2. CHỨC NĂNG SAO CHÉP (COPY TO CLIPBOARD)
// ==========================================
window.copyText = function(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const text = el.innerText || el.textContent;
    
    navigator.clipboard.writeText(text.trim()).then(() => {
        showToastNotification();
    }).catch(err => {
        console.error('Không thể sao chép văn bản:', err);
    });
};

function showToastNotification() {
    const toast = document.getElementById('copy-toast');
    if (!toast) return;

    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');

    setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
        toast.classList.remove('opacity-100');
    }, 2000);
}

// ==========================================
// 3. BỘ ĐẾM NGƯỢC THỜI GIAN (COUNTDOWN TIMER - 10:00)
// ==========================================
function startCountdown() {
    let minutes = 10;
    let seconds = 0;

    const timerMinEl = document.getElementById('timer-min');
    const timerSecEl = document.getElementById('timer-sec');

    if (!timerMinEl || !timerSecEl) return;

    const interval = setInterval(() => {
        if (seconds === 0) {
            if (minutes === 0) {
                clearInterval(interval);
                handlePaymentExpiration();
                return;
            }
            minutes--;
            seconds = 59;
        } else {
            seconds--;
        }

        // Cập nhật số hiển thị
        timerMinEl.innerText = String(minutes).padStart(2, '0');
        timerSecEl.innerText = String(seconds).padStart(2, '0');
    }, 1000);
}

function handlePaymentExpiration() {
    alert('Đơn hàng của bạn đã hết hạn thanh toán! Bạn sẽ được chuyển hướng về trang Chi tiết sự kiện.');
    
    // Tìm URL trang chi tiết sự kiện từ dữ liệu lưu trữ
    let eventId = '1';
    const checkoutDataStr = localStorage.getItem('checkoutData');
    if (checkoutDataStr) {
        try {
            const data = JSON.parse(checkoutDataStr);
            if (data.eventId) {
                eventId = data.eventId;
            } else if (data.orderId) {
                // Hạn chế fallback nhầm orderId nếu không khớp, nhưng giữ an toàn chống sập
                eventId = data.orderId;
            }
        } catch (e) {}
    }
    
    // Khôi phục bộ nhớ tạm
    localStorage.removeItem('checkoutData');
    window.location.href = `event-detail.html?id=${eventId}`;
}

// ==========================================
// 4. THIẾT LẬP NÚT QUAY VỀ
// ==========================================
function setupBackButton() {
    const backBtn = document.getElementById('back-btn');
    if (!backBtn) return;

    backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.back();
    });
}

// ==========================================
// 5. XÁC NHẬN THANH TOÁN LÊN BACKEND
// ==========================================
function setupConfirmPayment() {
    const btnConfirm = document.getElementById('btn-confirm-payment');
    if (!btnConfirm) return;

    btnConfirm.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const checkoutDataStr = localStorage.getItem('checkoutData');
        if (!checkoutDataStr) {
            alert("Lỗi: Không có dữ liệu đơn hàng.");
            return;
        }

        let orderId, paymentMethod;
        try {
            const data = JSON.parse(checkoutDataStr);
            orderId = parseInt(data.orderId);
            // Chuẩn hóa paymentMethod (MOMO, VNPAY, ZALOPAY, CASH)
            paymentMethod = (data.selectedPayment || 'CASH').toUpperCase();
            if (paymentMethod === 'VIETQR' || paymentMethod === 'BANK') paymentMethod = 'CASH'; // Mapping temporary
        } catch (err) {
            alert("Lỗi dữ liệu đơn hàng.");
            return;
        }

        // Loading state
        const originalText = btnConfirm.innerHTML;
        btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        btnConfirm.classList.add('pointer-events-none', 'opacity-70');

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error("Bạn chưa đăng nhập.");

            const response = await fetch('http://localhost:8080/api/nat/member/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId: orderId,
                    paymentMethod: paymentMethod
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Lỗi khi khởi tạo thanh toán.');
            }

            // Gọi API thành công, backend đã ghi nhận payment cho orderId này
            alert('Giao dịch đã được ghi nhận trên hệ thống! Vui lòng chờ nhân viên xác nhận.');
            
            // Xóa bộ nhớ đệm giỏ hàng/thanh toán
            localStorage.removeItem('checkoutData');
            localStorage.removeItem('currentOrderId');

            // Chuyển hướng sang trang hồ sơ > lịch sử giao dịch
            window.location.href = 'profile.html';
        } catch (error) {
            console.error("Payment API Error:", error);
            alert("Lỗi: " + error.message);
        } finally {
            btnConfirm.innerHTML = originalText;
            btnConfirm.classList.remove('pointer-events-none', 'opacity-70');
        }
    });
}
