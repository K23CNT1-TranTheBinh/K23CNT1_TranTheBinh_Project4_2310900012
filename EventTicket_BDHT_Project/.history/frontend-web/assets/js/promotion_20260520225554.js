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
                    resultBox.innerHTML = `Mã hợp lệ! Loại giảm giá: ${response.discountType}, giá trị: ${response.discountValue}.`;
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
