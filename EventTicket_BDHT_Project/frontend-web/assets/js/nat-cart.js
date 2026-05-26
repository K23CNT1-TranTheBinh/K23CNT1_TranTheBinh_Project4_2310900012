/**
 * ----------------------------------------------------------------------------
 *  HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT
 * Tệp tin: cart.js
 * Chức năng: Điều khiển trang Giỏ hàng (cart.html)
 * Người thực hiện: Sinh viên Nguyễn Anh Tuấn
 * Vai trò: Hiển thị giỏ hàng, cập nhật số lượng vé, xóa vé và đóng gói thông tin thanh toán
 * ----------------------------------------------------------------------------
 */

// Biến lưu trữ thông tin hóa đơn đơn hàng và danh sách vé đã chọn từ Backend
let currentOrderDetails = null;

// Lắng nghe sự kiện trang web tải xong toàn bộ cấu trúc giao diện DOM
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tải Header dùng chung bằng cơ chế nạp động
    if (window.pageUtils && window.pageUtils.loadHeader) {
        window.pageUtils.loadHeader();
    }

    // 2. Liên kết các sự kiện tương tác của giỏ hàng
    bindCartActions();

    // 3. Gọi API để nạp thông tin giỏ hàng hiện hành
    loadCart();
});

/**
 * Liên kết các sự kiện bấm nút Làm mới, Xác nhận đơn và Chuyển hướng thanh toán.
 */
function bindCartActions() {
    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) {
        // Nút cập nhật lại dữ liệu giỏ hàng
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadCart();
        });
    }

    const confirmBtn = document.getElementById('btn-confirm-order');
    if (confirmBtn) {
        // Nút bấm xác nhận giữ chỗ vé trên đơn hàng
        confirmBtn.addEventListener('click', async () => {
            await confirmCurrentOrder();
        });
    }

    const paymentBtn = document.getElementById('btn-go-payment');
    if (paymentBtn) {
        // Nút bấm chuyển tiếp sang trang thanh toán VNPAY
        paymentBtn.addEventListener('click', () => {
            if (currentOrderDetails && currentOrderDetails.items && currentOrderDetails.items.length > 0) {
                const order = currentOrderDetails.order;
                const items = currentOrderDetails.items;

                // Tính toán tổng số tiền dựa vào danh sách các vé
                const totalAmount = Number(order.totalAmount || items.reduce((sum, item) => {
                    const price = item.priceAtTime || item.price || item.unitPrice || 0;
                    return sum + Number(price) * Number(item.quantity || 0);
                }, 0));

                const firstItem = items[0];
                const eventName = (firstItem.ticketType && firstItem.ticketType.event && firstItem.ticketType.event.title)
                    || firstItem.ticketTypeName
                    || firstItem.typeName
                    || 'Sự kiện BDHT';

                const eventId = (firstItem.ticketType && firstItem.ticketType.event && firstItem.ticketType.event.id)
                    || '1';

                // Đóng gói cấu trúc dữ liệu thanh toán chuẩn lưu vào LocalStorage
                const checkoutData = {
                    eventId: String(eventId),
                    selectedPayment: 'VNPAY',
                    totalAmount: totalAmount,
                    eventName: eventName,
                    orderId: String(order.orderId || order.id || getCurrentOrderId()),
                    customer: {
                        name: 'Khách mua từ giỏ hàng',
                        phone: '',
                        email: '',
                        idcard: '',
                        address: ''
                    },
                    items: items.map(item => ({
                        ticketTypeId: item.ticketType?.ticketTypeId || item.ticketTypeId || null,
                        quantity: Number(item.quantity || 1),
                        typeName: item.ticketType?.typeName || item.ticketTypeName || item.typeName || 'Vé',
                        subtotal: Number(item.priceAtTime || item.price || item.unitPrice || 0) * Number(item.quantity || 1),
                        price: Number(item.priceAtTime || item.price || item.unitPrice || 0)
                    }))
                };

                // Lưu dữ liệu vào LocalStorage phục vụ đồng bộ hóa ở payment.html
                localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
                localStorage.setItem('pendingCheckout', JSON.stringify(checkoutData));
            }

            // Chuyển hướng sang trang thanh toán ngân hàng
            window.location.href = 'nat-payment.html';
        });
    }
}

/**
 * Trích xuất Mã đơn hàng hiện tại đang được xử lý trong LocalStorage.
 */
function getCurrentOrderId() {
    return localStorage.getItem('currentOrderId');
}

/**
 * Gọi API tải dữ liệu đơn hàng và chi tiết các vé, render trực quan lên bảng hóa đơn.
 */
async function loadCart() {
    const orderId = getCurrentOrderId();
    const cartMessage = document.getElementById('cart-message');
    const cartDetails = document.getElementById('cart-details');
    const cartSummary = document.getElementById('cart-summary');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');

    if (!cartMessage || !cartDetails || !cartItems || !cartSummary || !cartTotal) return;

    // Trường hợp chưa có giỏ hàng được xử lý
    if (!orderId) {
        cartDetails.style.display = 'none';
        cartMessage.innerHTML = `Bạn chưa có vé nào trong giỏ hàng. <a href="../../index.html" style="color:#f26f21; font-weight: bold;">Quay lại trang chủ</a> để chọn vé sự kiện nhé.`;
        return;
    }

    cartMessage.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Đang kết nối tải chi tiết đơn hàng...';
    cartDetails.style.display = 'none';

    try {
        // Thực hiện hai lệnh gọi API song song để tăng tốc độ tải
        const order = await window.apiClient.get(`/api/vtd/member/orders/${orderId}`);
        const items = await window.apiClient.get(`/api/vtd/member/orders/${orderId}/items`);

        if (!order || !items) {
            throw new Error('Hệ thống không thể phản hồi thông tin chi tiết đơn hàng.');
        }

        // Lưu thông tin phục vụ chuyển cổng thanh toán
        currentOrderDetails = { order, items };

        // Trường hợp giỏ hàng rỗng
        if (!items.length) {
            cartDetails.style.display = 'none';
            cartMessage.innerHTML = `Giỏ hàng của bạn hiện đang trống. <a href="../../index.html" style="color:#f26f21; font-weight: bold;">Khám phá các sự kiện</a> để tiếp tục mua sắm.`;
            return;
        }

        cartMessage.innerHTML = '';
        cartDetails.style.display = 'block';

        // Tính tổng tiền đơn hàng bằng hàm rút gọn giảm tải cho Backend
        const totalAmount = order.totalAmount || items.reduce((sum, item) => {
            const price = item.priceAtTime || item.price || item.unitPrice || 0;
            return sum + Number(price) * Number(item.quantity || 0);
        }, 0);

        // Vẽ tóm tắt hóa đơn
        cartSummary.innerHTML = `
            <div class="mb-1"><strong>Đơn hàng: #BDHT${order.orderId || order.id || orderId}</strong></div>
            <div class="mb-1">Trạng thái: <span class="text-brand-orange font-bold">${order.status || order.orderStatus || 'PENDING'}</span></div>
            <div>Ngày tạo: ${order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Không rõ'}</div>
        `;
        cartTotal.innerText = `Tổng giá trị: ${Number(totalAmount).toLocaleString('vi-VN')} VNĐ`;

        // Dựng mã HTML cho từng hàng vé trong giỏ hàng
        cartItems.innerHTML = items.map(item => {
            const label = (item.ticketType && item.ticketType.typeName) || item.ticketTypeName || item.typeName || item.name || 'Vé sự kiện';
            const unitPrice = item.priceAtTime || item.price || item.unitPrice || 0;
            const quantity = item.quantity || 1;
            const amount = Number(unitPrice) * Number(quantity);
            const itemId = item.orderItemId || item.id || item.orderItem?.orderItemId;

            return `
                <tr>
                    <td class="font-semibold text-slate-500">#${item.orderItemId || item.ticketId || item.id || '---'}</td>
                    <td class="font-extrabold text-slate-800">${label}</td>
                    <td>
                        <input type="number" min="1" value="${quantity}" data-item-id="${itemId}" class="cart-qty" style="width:70px; padding:6px; border-radius:8px; border:1px solid #ccc; text-align: center; font-weight: bold;"/>
                    </td>
                    <td class="font-bold text-slate-600">${Number(unitPrice).toLocaleString('vi-VN')} VNĐ</td>
                    <td class="font-extrabold text-brand-orange">${amount.toLocaleString('vi-VN')} VNĐ</td>
                    <td>
                        <button data-item-id="${itemId}" class="bg-red-50 hover:bg-red-100 text-red-500 font-bold px-3 py-1.5 rounded-lg text-xs transition btn-remove-item">Xóa</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Lắng nghe sự kiện thay đổi số lượng ở ô nhập số lượng
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

        // Lắng nghe sự kiện click xóa vé khỏi giỏ hàng
        document.querySelectorAll('.btn-remove-item').forEach(button => {
            button.addEventListener('click', async (event) => {
                const itemId = event.target.dataset.itemId;
                if (confirm('Bạn có chắc chắn muốn xóa hạng vé này khỏi giỏ hàng?')) {
                    await removeCartItem(orderId, itemId);
                }
            });
        });
    } catch (error) {
        console.error('Lỗi khi tải chi tiết giỏ hàng:', error);
        cartDetails.style.display = 'none';
        cartMessage.innerHTML = `<span style="color: red; font-weight: bold;">Có lỗi xảy ra: ${error.message}</span>`;
    }
}

/**
 * Gọi API PUT để cập nhật lại số lượng vé trên Backend.
 */
async function updateCartItem(orderId, itemId, quantity) {
    try {
        await window.apiClient.put(`/api/vtd/member/orders/${orderId}/items/${itemId}`, { quantity });
        await loadCart(); // Tải lại giỏ hàng để cập nhật lại tổng tiền
    } catch (error) {
        alert('Không thể cập nhật số lượng vé: ' + error.message);
    }
}

/**
 * Gọi API DELETE để loại bỏ hoàn toàn vé khỏi đơn hàng ở Backend.
 */
async function removeCartItem(orderId, itemId) {
    try {
        await window.apiClient.delete(`/api/vtd/member/orders/${orderId}/items/${itemId}`);
        await loadCart();
    } catch (error) {
        alert('Không thể xóa hạng vé: ' + error.message);
    }
}

/**
 * Gọi API POST gửi xác nhận giữ chỗ cho các vé trong đơn hàng hiện hành.
 */
async function confirmCurrentOrder() {
    const orderId = getCurrentOrderId();
    if (!orderId) {
        alert('Không tìm thấy mã đơn hàng hiện tại để xác nhận.');
        return;
    }
    try {
        const order = await window.apiClient.post(`/api/vtd/member/orders/${orderId}/confirm`, {});
        localStorage.setItem('currentOrderId', orderId);
        alert('🎉 Đơn hàng của bạn đã được hệ thống xác nhận giữ chỗ thành công! Hãy tiếp tục sang bước thanh toán.');
        await loadCart();
    } catch (error) {
        alert('Không thể gửi yêu cầu xác nhận đơn hàng: ' + error.message);
    }
}
