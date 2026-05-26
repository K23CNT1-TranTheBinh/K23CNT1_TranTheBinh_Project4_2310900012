/**
 * ----------------------------------------------------------------------------
 * HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT
 * Tệp tin: promotion.js
 * Chức năng: Quản lý mã khuyến mãi, voucher giảm giá (promotion.html)
 * Người thực hiện: Sinh viên Nguyễn Anh Tuấn
 * Vai trò: Kiểm tra mã hợp lệ, tính toán số tiền chiết khấu thực tế từ Backend API
 * ----------------------------------------------------------------------------
 */

// Lắng nghe sự kiện trang web tải xong toàn bộ cấu trúc giao diện DOM
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tải Header dùng chung bằng cơ chế nạp động
    if (window.pageUtils && window.pageUtils.loadHeader) {
        window.pageUtils.loadHeader();
    }

    // 2. Thiết lập lắng nghe các hành động áp dụng mã khuyến mãi
    bindPromotionActions();
});

/**
 * Liên kết sự kiện kiểm tra mã và tính giảm giá trực tiếp vào các nút bấm.
 */
function bindPromotionActions() {
    const validateButton = document.getElementById('btn-validate');
    const calculateButton = document.getElementById('btn-calculate');
    const resultBox = document.getElementById('promo-result');

    if (validateButton) {
        // Sự kiện click nút kiểm tra tính hợp lệ của mã
        validateButton.addEventListener('click', async () => {
            const code = document.getElementById('promo-code').value.trim();
            if (!code) {
                resultBox.style.color = 'red';
                resultBox.innerText = 'Vui lòng điền mã khuyến mãi vào ô nhập.';
                return;
            }
            resultBox.style.color = 'blue';
            resultBox.innerText = 'Đang kiểm tra tính khả dụng của mã...';
            try {
                // Gọi API POST gửi mã khuyến mãi lên Backend xác thực
                const response = await window.apiClient.post('/api/vtd/public/promotions/validate', { code });
                if (response.success) {
                    resultBox.style.color = 'green';
                    resultBox.innerHTML = `✅ Mã khuyến mãi hợp lệ! Loại giảm giá: ${response.discountType}, Giá trị giảm: ${response.discountValue}.`;

                    // Gọi thêm API lấy chi tiết điều kiện áp dụng của mã khuyến mãi
                    fetchPromotionDetails(code, resultBox);
                } else {
                    resultBox.style.color = 'red';
                    resultBox.innerText = response.message || 'Mã không hợp lệ hoặc đã hết lượt dùng.';
                }
            } catch (error) {
                resultBox.style.color = 'red';
                resultBox.innerText = 'Lỗi kết nối: ' + error.message;
            }
        });
    }

    if (calculateButton) {
        // Sự kiện click nút tính toán số tiền thực nhận sau khi giảm
        calculateButton.addEventListener('click', async () => {
            const code = document.getElementById('promo-code').value.trim();
            const price = Number(document.getElementById('original-price').value || 0);
            if (!code || price <= 0) {
                resultBox.style.color = 'red';
                resultBox.innerText = 'Vui lòng nhập đầy đủ mã và giá tiền gốc để tính toán.';
                return;
            }
            resultBox.style.color = 'blue';
            resultBox.innerText = 'Đang thực hiện áp mã và tính toán...';
            try {
                // Gọi API POST tính toán số tiền được khấu trừ trực tiếp từ Backend
                const result = await window.apiClient.post('/api/vtd/public/promotions/calculate-discount', {
                    promotionCode: code,
                    originalPrice: price
                });
                resultBox.style.color = 'green';
                resultBox.innerHTML = `Giá tiền gốc: ${Number(result.originalPrice).toLocaleString('vi-VN')} VNĐ<br>` +
                    `Số tiền được giảm: ${Number(result.discountAmount).toLocaleString('vi-VN')} VNĐ (${result.discountType})<br>` +
                    `<strong>Giá phải thanh toán: ${Number(result.finalPrice).toLocaleString('vi-VN')} VNĐ</strong>`;
            } catch (error) {
                resultBox.style.color = 'red';
                resultBox.innerText = 'Lỗi tính toán: ' + error.message;
            }
        });
    }
}

/**
 * Gọi API GET để lấy thêm thông tin chi tiết (Mô tả, hạn sử dụng, giá trị đơn tối thiểu) của mã khuyến mãi.
 */
async function fetchPromotionDetails(code, resultBox) {
    try {
        const details = await window.apiClient.get(`/api/vtd/public/promotions/${code}`);
        if (details) {
            const endDate = details.endDate ? new Date(details.endDate).toLocaleDateString('vi-VN') : 'Không giới hạn';
            const minOrder = details.minOrderValue ? `Đơn tối thiểu: ${Number(details.minOrderValue).toLocaleString('vi-VN')}đ` : 'Không yêu cầu';
            const desc = details.description || 'Không có mô tả thêm.';

            const detailHtml = `
                <div class="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs shadow-sm">
                    <strong><i class="fas fa-info-circle mr-1"></i>Điều kiện áp dụng:</strong> ${desc}<br>
                    <div class="mt-1 flex items-center gap-3 text-[10px] text-green-700 font-medium">
                        <span><i class="far fa-calendar-alt mr-1"></i>Hạn dùng: ${endDate}</span>
                        <span><i class="fas fa-money-bill-wave mr-1"></i>Đơn tối thiểu: ${minOrder}</span>
                    </div>
                </div>
            `;

            // Chèn mã HTML chi tiết vào bên dưới thông báo kết quả kiểm tra
            resultBox.innerHTML += detailHtml;
        }
    } catch (error) {
        console.warn("Không thể lấy thông tin chi tiết của mã khuyến mãi:", error);
    }
}
