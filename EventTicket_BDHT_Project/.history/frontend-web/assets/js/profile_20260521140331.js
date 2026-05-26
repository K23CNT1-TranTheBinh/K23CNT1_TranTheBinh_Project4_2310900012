document.addEventListener('DOMContentLoaded', async () => {
    window.pageUtils.loadHeader();
    window.pageUtils.loadFooter();
    bindProfileTabs();
    bindProfileForms();
    await loadProfile();
    await loadOrders();
    await loadTickets();
});

function bindProfileTabs() {
    const tabs = {
        'menu-btn-account': 'tab-account',
        'menu-btn-history': 'tab-history',
        'menu-btn-password': 'tab-password',
        'menu-btn-tickets': 'tab-tickets',
    };

    Object.entries(tabs).forEach(([buttonId, tabId]) => {
        document.getElementById(buttonId)?.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.add('hidden'));
            document.getElementById(tabId)?.classList.remove('hidden');
            document.querySelectorAll('.profile-menu-btn').forEach(btn => {
                btn.classList.remove('text-brand-orange', 'bg-orange-50/50');
                btn.classList.add('text-slate-500');
            });
            const active = document.getElementById(buttonId);
            active?.classList.add('text-brand-orange', 'bg-orange-50/50');
            active?.classList.remove('text-slate-500');
        });
    });
}

function bindProfileForms() {
    document.getElementById('account-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            const profile = await window.apiClient.put('/api/vtd/member/profile', {
                fullName: document.getElementById('acc-fullname').value.trim(),
                phoneNumber: document.getElementById('acc-phone').value.trim(),
            });
            localStorage.setItem('currentUser', JSON.stringify(profile));
            fillProfile(profile);
            showToast('Cap nhat ho so thanh cong.', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    document.getElementById('password-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const oldPassword = document.getElementById('pass-old').value;
        const newPassword = document.getElementById('pass-new').value;
        const confirmPassword = document.getElementById('pass-confirm').value;
        if (newPassword !== confirmPassword) {
            showToast('Mat khau moi va xac nhan khong khop.', 'error');
            return;
        }
        try {
            await window.apiClient.post('/api/vtd/member/change-password', { oldPassword, newPassword });
            event.target.reset();
            showToast('Doi mat khau thanh cong.', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

async function loadProfile() {
    if (!window.apiClient.getToken() && !localStorage.getItem('currentUser')) {
        window.location.href = window.pageUtils.resolveUrl('/pages/user/login.html');
        return;
    }
    try {
        const profile = await window.apiClient.get('/api/vtd/member/profile');
        localStorage.setItem('currentUser', JSON.stringify(profile));
        fillProfile(profile);
    } catch (error) {
        showToast('Khong the tai ho so: ' + error.message, 'error');
    }
}

function fillProfile(profile) {
    const name = profile.fullName || 'Thanh vien BDHT';
    setValue('acc-fullname', name);
    setValue('acc-phone', profile.phoneNumber || '');
    setValue('acc-email', profile.email || '');
    setText('sidebar-user-name', name);
    setText('sidebar-avatar-char', name.charAt(0).toUpperCase());
}

async function loadOrders(status = '') {
    const container = document.getElementById('history-list');
    if (!container) return;
    container.innerHTML = renderOrderFilter(status) + '<div class="text-sm text-slate-400 font-bold">Dang tai lich su don hang...</div>';

    try {
        const endpoint = status ? `/api/vtd/member/orders/status?status=${encodeURIComponent(status)}` : '/api/vtd/member/orders';
        const orders = await window.apiClient.get(endpoint);
        container.innerHTML = renderOrderFilter(status) + renderOrderList(orders || []);
        bindOrderActions();
    } catch (error) {
        container.innerHTML = renderOrderFilter(status) + `<div class="text-sm text-red-500 font-bold">Khong the tai don hang: ${escapeHtml(error.message)}</div>`;
    }
}

function renderOrderFilter(status) {
    return `
        <div class="flex flex-wrap gap-2 items-center mb-2">
            <button type="button" class="order-filter px-4 py-2 rounded-full border text-xs font-bold ${!status ? 'bg-brand-orange text-white' : ''}" data-status="">Tat ca</button>
            <button type="button" class="order-filter px-4 py-2 rounded-full border text-xs font-bold ${status === 'PENDING' ? 'bg-brand-orange text-white' : ''}" data-status="PENDING">Cho thanh toan</button>
            <button type="button" class="order-filter px-4 py-2 rounded-full border text-xs font-bold ${status === 'CONFIRMED' ? 'bg-brand-orange text-white' : ''}" data-status="CONFIRMED">Da xac nhan</button>
            <button type="button" class="order-filter px-4 py-2 rounded-full border text-xs font-bold ${status === 'COMPLETED' ? 'bg-brand-orange text-white' : ''}" data-status="COMPLETED">Hoan thanh</button>
            <button type="button" class="order-filter px-4 py-2 rounded-full border text-xs font-bold ${status === 'CANCELLED' ? 'bg-brand-orange text-white' : ''}" data-status="CANCELLED">Da huy</button>
        </div>
    `;
}

function renderOrderList(orders) {
    if (!orders.length) return '<div class="text-sm text-slate-400 font-bold py-6">Khong co don hang phu hop.</div>';
    return orders.map(order => `
        <div class="border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div class="flex justify-between gap-3 flex-wrap">
                <div>
                    <h3 class="font-extrabold text-slate-800">Don hang #${order.orderId}</h3>
                    <p class="text-xs font-bold text-slate-400 mt-1">Trang thai: ${escapeHtml(order.status || 'PENDING')}</p>
                    <p class="text-xs font-bold text-slate-400">Ngay tao: ${order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Khong ro'}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs font-bold text-slate-400">Can thanh toan</p>
                    <p class="font-extrabold text-brand-orange">${formatCurrency(order.finalAmount ?? order.totalAmount ?? 0)}</p>
                </div>
            </div>
            <div id="order-items-${order.orderId}" class="hidden mt-4 text-xs bg-gray-50 rounded-xl p-4"></div>
            <div class="flex flex-wrap gap-2 mt-4">
                <button type="button" class="btn-order-items px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold" data-order-id="${order.orderId}">Chi tiet</button>
                ${order.status === 'PENDING' ? `<button type="button" class="btn-order-cancel px-4 py-2 rounded-full bg-red-600 text-white text-xs font-bold" data-order-id="${order.orderId}">Huy don</button>` : ''}
                ${['PENDING', 'CONFIRMED'].includes(order.status) ? `<button type="button" class="btn-order-pay px-4 py-2 rounded-full bg-brand-orange text-white text-xs font-bold" data-order-id="${order.orderId}">Thanh toan</button>` : ''}
            </div>
        </div>
    `).join('');
}

function bindOrderActions() {
    document.querySelectorAll('.order-filter').forEach(btn => {
        btn.addEventListener('click', () => loadOrders(btn.dataset.status || ''));
    });
    document.querySelectorAll('.btn-order-items').forEach(btn => {
        btn.addEventListener('click', () => toggleOrderItems(btn.dataset.orderId));
    });
    document.querySelectorAll('.btn-order-cancel').forEach(btn => {
        btn.addEventListener('click', () => cancelOrder(btn.dataset.orderId));
    });
    document.querySelectorAll('.btn-order-pay').forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.setItem('currentOrderId', btn.dataset.orderId);
            window.location.href = window.pageUtils.resolveUrl('/pages/user/payment.html');
        });
    });
}

async function toggleOrderItems(orderId) {
    const box = document.getElementById(`order-items-${orderId}`);
    if (!box) return;
    if (!box.classList.contains('hidden')) {
        box.classList.add('hidden');
        return;
    }
    box.classList.remove('hidden');
    box.innerHTML = 'Dang tai chi tiet...';
    try {
        const items = await window.apiClient.get(`/api/vtd/member/orders/${orderId}/items`);
        box.innerHTML = items.length ? items.map(item => `
            <div class="flex justify-between gap-3 py-2 border-b border-gray-200 last:border-b-0">
                <span>${escapeHtml(item.ticketType?.typeName || 'Ve su kien')} x ${item.quantity}</span>
                <strong>${formatCurrency(Number(item.priceAtTime || 0) * Number(item.quantity || 1))}</strong>
            </div>
        `).join('') : 'Don hang khong co ve.';
    } catch (error) {
        box.innerHTML = escapeHtml(error.message);
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Huy don hang PENDING nay?')) return;
    try {
        await window.apiClient.delete(`/api/vtd/member/orders/${orderId}/cancel`);
        if (localStorage.getItem('currentOrderId') === String(orderId)) localStorage.removeItem('currentOrderId');
        await loadOrders();
        showToast('Da huy don hang.', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function loadTickets() {
    const container = document.getElementById('my-tickets-list');
    if (!container) return;
    container.innerHTML = '<div class="text-sm text-slate-400 font-bold">Dang tai kho ve...</div>';
    try {
        const tickets = await window.apiClient.get('/api/vtd/member/my-tickets');
        if (!tickets?.length) {
            container.innerHTML = '<div class="text-sm text-slate-400 font-bold py-6">Ban chua co ve dien tu nao.</div>';
            return;
        }
        container.innerHTML = tickets.map(ticket => {
            const event = ticket.ticketType?.event || {};
            return `
                <div class="border border-gray-100 rounded-2xl p-5 shadow-sm flex justify-between gap-4 flex-wrap">
                    <div>
                        <h3 class="font-extrabold text-slate-800">${escapeHtml(event.title || 'Su kien')}</h3>
                        <p class="text-xs font-bold text-slate-400 mt-1">Hang ve: ${escapeHtml(ticket.ticketType?.typeName || '---')}</p>
                        <p class="text-xs font-bold text-slate-400">Ma ve: ${escapeHtml(ticket.qrCode || '---')}</p>
                    </div>
                    <button type="button" class="btn-ticket-qr px-4 py-2 rounded-full bg-brand-orange text-white text-xs font-bold self-start" data-ticket-id="${ticket.ticketId}">Hien QR</button>
                </div>
            `;
        }).join('');
        document.querySelectorAll('.btn-ticket-qr').forEach(btn => {
            btn.addEventListener('click', () => openTicketQrModal(btn.dataset.ticketId));
        });
    } catch (error) {
        container.innerHTML = `<div class="text-sm text-red-500 font-bold">Khong the tai ve: ${escapeHtml(error.message)}</div>`;
    }
}

async function openTicketQrModal(ticketId) {
    const modal = document.getElementById('ticket-qr-modal');
    if (!modal) return;
    modal.classList.remove('hidden', 'opacity-0');
    document.getElementById('ticket-qr-loading')?.classList.remove('hidden');
    document.getElementById('ticket-qr-wrapper')?.classList.add('hidden');

    try {
        const ticket = await window.apiClient.get(`/api/vtd/member/tickets/${ticketId}`);
        const event = ticket.ticketType?.event || {};
        setText('ticket-modal-event-name', event.title || 'Su kien');
        setText('ticket-modal-venue', event.venue?.venueName || 'Dia diem');
        setText('ticket-modal-time', event.startTime ? new Date(event.startTime).toLocaleString('vi-VN') : '-');
        setText('ticket-modal-zone', ticket.ticketType?.typeName || '-');
        setText('ticket-modal-gate', 'Cong chinh');
        setText('ticket-modal-seat', `Ve #${ticket.ticketId}`);
        setText('ticket-qr-code-text', ticket.qrCode || '-');
        document.getElementById('ticket-qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(ticket.qrCode || ticket.ticketId)}`;
        document.getElementById('ticket-qr-loading')?.classList.add('hidden');
        document.getElementById('ticket-qr-wrapper')?.classList.remove('hidden');
    } catch (error) {
        showToast(error.message, 'error');
        closeTicketQrModal();
    }
}

function closeTicketQrModal() {
    const modal = document.getElementById('ticket-qr-modal');
    if (modal) modal.classList.add('hidden', 'opacity-0');
}

window.closeTicketQrModal = closeTicketQrModal;

function showToast(message, type) {
    const toast = document.getElementById('profile-toast');
    if (!toast) return alert(message);
    toast.textContent = message;
    toast.className = `mb-6 p-4 rounded-xl text-xs font-extrabold text-center border ${type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount || 0));
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
