let currentOrderDetails = null;

document.addEventListener('DOMContentLoaded', () => {
    window.pageUtils.loadHeader();
    bindCartActions();
    loadCart();
});

function bindCartActions() {
    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadCart();
        });
    }

    const confirmBtn = document.getElementById('btn-confirm-order');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            await confirmCurrentOrder();
        });
    }

    const paymentBtn = document.getElementById('btn-go-payment');
    if (paymentBtn) {
        paymentBtn.addEventListener('click', () => {
            if (currentOrderDetails && currentOrderDetails.items && currentOrderDetails.items.length > 0) {
                const order = currentOrderDetails.order;
                const items = currentOrderDetails.items;
                
                const totalAmount = order.totalAmount || items.reduce((sum, item) => {
                    const price = item.priceAtTime || item.price || item.unitPrice || 0;
                    return sum + Number(price) * Number(item.quantity || 0);
                }, 0);
                
                // Trích xuất thông tin sự kiện an toàn
                const firstItem = items[0];
                const eventName = (firstItem.ticketType && firstItem.ticketType.event && firstItem.ticketType.event.title)
                    || firstItem.ticketTypeName 
                    || firstItem.typeName 
                    || 'Sự kiện BDHT';
                
                const eventId = (firstItem.ticketType && firstItem.ticketType.event && firstItem.ticketType.event.id)
                    || '1';

                // Đóng gói checkoutData tạm để cổng thanh toán payment.html nhận diện
                const checkoutData = {
                    eventId: String(eventId),
                    selectedPayment: 'vietqr', // Cổng mặc định
                    totalAmount: totalAmount.toLocaleString('vi-VN') + ' VNĐ',
                    eventName: eventName,
                    orderId: String(order.orderId || order.id || getCurrentOrderId()),
                    customer: {
                        name: 'Khách mua từ giỏ hàng',
                        phone: '',
                        email: '',
                        idcard: '',
                        address: ''
                    }
                };
                localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
            }
            window.location.href = 'payment.html';
        });
    }
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
        cartMessage.innerHTML = `Bạn chưa có giỏ hàng đang xử lý. <a href="../../index.html" style="color:#007bff;">Quay lại trang chủ</a> để chọn vé.`;
        return;
    }

    cartMessage.innerHTML = 'Đang tải đơn hàng...';
    cartDetails.style.display = 'none';

    try {
        const order = await window.apiClient.get(`/api/nat/member/orders/${orderId}`);
        const items = await window.apiClient.get(`/api/nat/member/orders/${orderId}/items`);

        if (!order || !items) {
            throw new Error('Không thể tải dữ liệu đơn hàng.');
        }

        // Lưu thông tin phục vụ chuyển cổng thanh toán
        currentOrderDetails = { order, items };

        if (!items.length) {
            cartDetails.style.display = 'none';
            cartMessage.innerHTML = `Giỏ hàng của bạn hiện trống. <a href="../../index.html" style="color:#007bff;">Tiếp tục mua sắm</a>.`;
            return;
        }

        cartMessage.innerHTML = '';
        cartDetails.style.display = 'block';

        const totalAmount = order.totalAmount || items.reduce((sum, item) => {
            const price = item.priceAtTime || item.price || item.unitPrice || 0;
            return sum + Number(price) * Number(item.quantity || 0);
        }, 0);

        cartSummary.innerHTML = `
            <div><strong>Đơn hàng #${order.orderId || order.id || orderId}</strong></div>
            <div>Trạng thái: ${order.status || order.orderStatus || 'PENDING'}</div>
            <div>Ngày tạo: ${order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Không rõ'}</div>
        `;
        cartTotal.innerText = `Tổng giá: ${Number(totalAmount).toLocaleString('vi-VN')} VNĐ`;

        cartItems.innerHTML = items.map(item => {
            const label = (item.ticketType && item.ticketType.typeName) || item.ticketTypeName || item.typeName || item.name || 'Vé sự kiện';
            const unitPrice = item.priceAtTime || item.price || item.unitPrice || 0;
            const quantity = item.quantity || 1;
            const amount = Number(unitPrice) * Number(quantity);
            return `
                <tr>
                    <td>${item.orderItemId || item.ticketId || item.id || '---'}</td>
                    <td>${label}</td>
                    <td><input type="number" min="1" value="${quantity}" data-item-id="${item.orderItemId || item.id || item.orderItem?.orderItemId}" class="cart-qty" style="width:70px; padding:6px; border-radius:4px; border:1px solid #ccc;"/></td>
                    <td>${Number(unitPrice).toLocaleString('vi-VN')} VNĐ</td>
                    <td>${amount.toLocaleString('vi-VN')} VNĐ</td>
                    <td><button data-item-id="${item.orderItemId || item.id || item.orderItem?.orderItemId}" class="btn-secondary btn-remove-item">Xóa</button></td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.cart-qty').forEach(input => {
            input.addEventListener('change', async (event) => {
                const newQty = Number(event.target.value);
                const itemId = event.target.dataset.itemId;
                if (newQty < 1) {
                    event.target.value = 1;
                    return;
                }
                await updateCartItem(orderId, itemId, newQty);
            });
        });

        document.querySelectorAll('.btn-remove-item').forEach(button => {
            button.addEventListener('click', async (event) => {
                const itemId = event.target.dataset.itemId;
                await removeCartItem(orderId, itemId);
            });
        });
    } catch (error) {
        console.error('Lỗi tải giỏ hàng:', error);
        cartDetails.style.display = 'none';
        cartMessage.innerHTML = `Không thể tải giỏ hàng: ${error.message}`;
    }
}

async function updateCartItem(orderId, itemId, quantity) {
    try {
        await window.apiClient.put(`/api/nat/member/orders/${orderId}/items/${itemId}`, { quantity });
        await loadCart();
    } catch (error) {
        alert('Không thể cập nhật số lượng: ' + error.message);
    }
}

async function removeCartItem(orderId, itemId) {
    try {
        await window.apiClient.delete(`/api/nat/member/orders/${orderId}/items/${itemId}`);
        await loadCart();
    } catch (error) {
        alert('Không thể xóa mục: ' + error.message);
    }
}

async function confirmCurrentOrder() {
    const orderId = getCurrentOrderId();
    if (!orderId) {
        alert('Không tìm thấy đơn hàng hiện tại.');
        return;
    }
    try {
        const order = await window.apiClient.post(`/api/nat/member/orders/${orderId}/confirm`, {});
        localStorage.setItem('currentOrderId', orderId);
        alert('Đơn hàng đã được xác nhận. Bạn có thể tiếp tục thanh toán.');
        await loadCart();
    } catch (error) {
        alert('Không thể xác nhận đơn hàng: ' + error.message);
    }
}
