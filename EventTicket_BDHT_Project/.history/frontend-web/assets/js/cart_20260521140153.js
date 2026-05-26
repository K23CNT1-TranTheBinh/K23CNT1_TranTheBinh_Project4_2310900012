document.addEventListener('DOMContentLoaded', () => {
    window.pageUtils.loadHeader();
    bindCartActions();
    loadCart();
});

function bindCartActions() {
    document.getElementById('btn-refresh')?.addEventListener('click', (e) => {
        e.preventDefault();
        loadCart();
    });
    document.getElementById('btn-confirm-order')?.addEventListener('click', confirmCurrentOrder);
    document.getElementById('btn-go-payment')?.addEventListener('click', () => {
        window.location.href = window.pageUtils.resolveUrl('/pages/user/payment.html');
    });
    document.getElementById('btn-apply-promotion')?.addEventListener('click', applyPromotion);
    document.getElementById('btn-remove-promotion')?.addEventListener('click', removePromotion);
    document.getElementById('btn-cancel-order')?.addEventListener('click', cancelOrder);
}

function getCurrentOrderId() {
    return localStorage.getItem('currentOrderId');
}

async function loadCart() {
    const orderId = getCurrentOrderId();
    const cartMessage = document.getElementById('cart-message');
    const cartDetails = document.getElementById('cart-details');
    const cartSummary = document.getElementById('cart-summary');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');

    if (!cartMessage || !cartDetails || !cartItems || !cartSummary || !cartTotal) return;

    if (!orderId) {
        cartDetails.style.display = 'none';
        cartMessage.innerHTML = `Ban chua co gio hang. <a href="${window.pageUtils.resolveUrl('/pages/index.html')}" style="color:#007bff;">Quay lai trang chu</a> de chon ve.`;
        return;
    }

    cartMessage.innerHTML = 'Dang tai don hang...';
    cartDetails.style.display = 'none';

    try {
        const [order, items] = await Promise.all([
            window.apiClient.get(`/api/vtd/member/orders/${orderId}`),
            window.apiClient.get(`/api/vtd/member/orders/${orderId}/items`)
        ]);

        if (!items.length) {
            cartMessage.innerHTML = `Gio hang hien trong. <a href="${window.pageUtils.resolveUrl('/pages/index.html')}" style="color:#007bff;">Tiep tuc mua ve</a>.`;
            return;
        }

        cartMessage.innerHTML = '';
        cartDetails.style.display = 'block';
        renderOrderSummary(order, cartSummary, cartTotal);
        renderCartItems(orderId, items, cartItems);
    } catch (error) {
        cartDetails.style.display = 'none';
        cartMessage.innerHTML = `Khong the tai gio hang: ${escapeHtml(error.message)}`;
    }
}

function renderOrderSummary(order, cartSummary, cartTotal) {
    const total = Number(order.totalAmount || 0);
    const finalAmount = Number(order.finalAmount ?? total);
    const discount = Math.max(0, total - finalAmount);
    cartSummary.innerHTML = `
        <div><strong>Don hang #${order.orderId}</strong></div>
        <div>Trang thai: ${escapeHtml(order.status || 'PENDING')}</div>
        <div>Ma giam gia: ${order.promotion ? escapeHtml(order.promotion.code || order.promotion.promotionCode || 'Da ap dung') : 'Chua ap dung'}</div>
        <div>Ngay tao: ${order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Khong ro'}</div>
    `;
    cartTotal.innerHTML = `
        Tong: ${formatCurrency(total)}
        ${discount ? `<br><span style="color:#28a745;">Giam: ${formatCurrency(discount)}</span>` : ''}
        <br><span style="color:#e74c3c;">Can thanh toan: ${formatCurrency(finalAmount)}</span>
    `;
}

function renderCartItems(orderId, items, cartItems) {
    cartItems.innerHTML = items.map(item => {
        const label = item.ticketType?.typeName || 'Ve su kien';
        const unitPrice = Number(item.priceAtTime || 0);
        const quantity = Number(item.quantity || 1);
        return `
            <tr>
                <td>${item.orderItemId}</td>
                <td>${escapeHtml(label)}</td>
                <td><input type="number" min="1" value="${quantity}" data-item-id="${item.orderItemId}" class="cart-qty" style="width:70px; padding:6px; border-radius:4px; border:1px solid #ccc;"/></td>
                <td>${formatCurrency(unitPrice)}</td>
                <td>${formatCurrency(unitPrice * quantity)}</td>
                <td><button data-item-id="${item.orderItemId}" class="btn-secondary btn-remove-item">Xoa</button></td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.cart-qty').forEach(input => {
        input.addEventListener('change', async (event) => {
            const quantity = Math.max(1, Number(event.target.value || 1));
            await updateCartItem(orderId, event.target.dataset.itemId, quantity);
        });
    });
    document.querySelectorAll('.btn-remove-item').forEach(button => {
        button.addEventListener('click', async (event) => removeCartItem(orderId, event.target.dataset.itemId));
    });
}

async function updateCartItem(orderId, itemId, quantity) {
    try {
        await window.apiClient.put(`/api/vtd/member/orders/${orderId}/items/${itemId}`, { quantity });
        await loadCart();
    } catch (error) {
        alert('Khong the cap nhat so luong: ' + error.message);
    }
}

async function removeCartItem(orderId, itemId) {
    try {
        await window.apiClient.delete(`/api/vtd/member/orders/${orderId}/items/${itemId}`);
        await loadCart();
    } catch (error) {
        alert('Khong the xoa muc: ' + error.message);
    }
}

async function applyPromotion() {
    const orderId = getCurrentOrderId();
    const code = document.getElementById('cart-promotion-code')?.value.trim();
    if (!orderId || !code) return alert('Vui long nhap ma giam gia.');
    try {
        await window.apiClient.post(`/api/vtd/member/orders/${orderId}/promotion`, { promotionCode: code });
        await loadCart();
    } catch (error) {
        alert('Khong the ap dung ma: ' + error.message);
    }
}

async function removePromotion() {
    const orderId = getCurrentOrderId();
    if (!orderId) return;
    try {
        await window.apiClient.delete(`/api/vtd/member/orders/${orderId}/promotion`);
        await loadCart();
    } catch (error) {
        alert('Khong the go ma: ' + error.message);
    }
}

async function confirmCurrentOrder() {
    const orderId = getCurrentOrderId();
    if (!orderId) return alert('Khong tim thay don hang hien tai.');
    try {
        await window.apiClient.post(`/api/vtd/member/orders/${orderId}/confirm`, {});
        alert('Don hang da duoc xac nhan. Ban co the thanh toan.');
        await loadCart();
    } catch (error) {
        alert('Khong the xac nhan don hang: ' + error.message);
    }
}

async function cancelOrder() {
    const orderId = getCurrentOrderId();
    if (!orderId || !confirm('Huy don hang PENDING nay?')) return;
    try {
        await window.apiClient.delete(`/api/vtd/member/orders/${orderId}/cancel`);
        localStorage.removeItem('currentOrderId');
        await loadCart();
    } catch (error) {
        alert('Khong the huy don: ' + error.message);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount || 0));
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
