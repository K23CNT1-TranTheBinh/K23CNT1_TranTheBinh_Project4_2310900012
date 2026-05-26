document.addEventListener('DOMContentLoaded', () => {
    window.pageUtils.loadHeader();
    bindPromotionActions();
});

function bindPromotionActions() {
    const validateButton = document.getElementById('btn-validate');
    const calculateButton = document.getElementById('btn-calculate');
    const resultBox = document.getElementById('promo-result');

    if (validateButton) {
        validateButton.addEventListener('click', async () => {
            const code = document.getElementById('promo-code').value.trim();
            if (!code) {
                resultBox.style.color = 'red';
                resultBox.innerText = 'Vui lòng nhập mã khuyến mãi.';
                return;
            }
            resultBox.style.color = 'blue';
            resultBox.innerText = 'Đang kiểm tra mã...';
            try {
                const response = await window.apiClient.post('/api/vtd/public/promotions/validate', { code });
                if (response.success) {
                    resultBox.style.color = 'green';
                    resultBox.innerHTML = `✅ Mã hợp lệ! Loại giảm giá: ${response.discountType}, giá trị: ${response.discountValue}.`;
                    
                    // Gọi thêm API chi tiết mã khuyến mãi
                    fetchPromotionDetails(code, resultBox);
                } else {
                    resultBox.style.color = 'red';
                    resultBox.innerText = response.message || 'Mã không hợp lệ.';
                }
            } catch (error) {
                resultBox.style.color = 'red';
                resultBox.innerText = 'Lỗi: ' + error.message;
            }
        });
    }

    if (calculateButton) {
        calculateButton.addEventListener('click', async () => {
            const code = document.getElementById('promo-code').value.trim();
            const price = Number(document.getElementById('original-price').value || 0);
            if (!code || price <= 0) {
                resultBox.style.color = 'red';
                resultBox.innerText = 'Nhập mã và giá gốc hợp lệ để tính giảm giá.';
                return;
            }
            resultBox.style.color = 'blue';
            resultBox.innerText = 'Đang tính giảm giá...';
            try {
                const result = await window.apiClient.post('/api/vtd/public/promotions/calculate-discount', {
                    promotionCode: code,
                    originalPrice: price
                });
                resultBox.style.color = 'green';
                resultBox.innerHTML = `Giá gốc: ${Number(result.originalPrice).toLocaleString('vi-VN')} VNĐ<br>` +
                    `Giảm: ${Number(result.discountAmount).toLocaleString('vi-VN')} VNĐ (${result.discountType})<br>` +
                    `Giá cuối cùng: ${Number(result.finalPrice).toLocaleString('vi-VN')} VNĐ`;
            } catch (error) {
                resultBox.style.color = 'red';
                resultBox.innerText = 'Lỗi: ' + error.message;
            }
        });
    }
}

/**
 * Gọi API GET /api/vtd/public/promotions/{code} để lấy thêm chi tiết mã (HSD, ĐK áp dụng)
 * và hiển thị một thông báo nhỏ màu xanh lá cây bên dưới kết quả.
 */
async function fetchPromotionDetails(code, resultBox) {
    try {
        const details = await window.apiClient.get(`/api/vtd/public/promotions/${code}`);
        if (details) {
            const endDate = details.endDate ? new Date(details.endDate).toLocaleDateString('vi-VN') : 'Không giới hạn';
            const minOrder = details.minOrderValue ? `Đơn tối thiểu: ${Number(details.minOrderValue).toLocaleString('vi-VN')}đ` : 'Không yêu cầu đơn tối thiểu';
            const desc = details.description || 'Không có mô tả thêm.';
            
            const detailHtml = `
                <div class="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs shadow-sm">
                    <strong><i class="fas fa-info-circle mr-1"></i>Chi tiết:</strong> ${desc}<br>
                    <div class="mt-1 flex items-center gap-3 text-[10px] text-green-700 font-medium">
                        <span><i class="far fa-calendar-alt mr-1"></i>HSD: ${endDate}</span>
                        <span><i class="fas fa-money-bill-wave mr-1"></i>${minOrder}</span>
                    </div>
                </div>
            `;
            
            // Thêm vào dưới nội dung hiện tại
            resultBox.innerHTML += detailHtml;
        }
    } catch (error) {
        console.warn("Không thể tải chi tiết khuyến mãi:", error);
        // Bỏ qua lỗi hiển thị vì validate đã thành công
    }
}