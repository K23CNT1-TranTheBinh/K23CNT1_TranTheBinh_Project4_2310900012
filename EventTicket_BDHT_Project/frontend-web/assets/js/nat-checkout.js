let checkoutState = {
    checkoutData: null,
    discount: null,
    totals: {
        subtotal: 0,
        discountAmount: 0,
        finalAmount: 0
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }

    bindCheckoutEvents();
    await loadCheckout();
});

function bindCheckoutEvents() {
    const applyBtn = document.getElementById('btn-apply-promo');
    if (applyBtn) applyBtn.addEventListener('click', applyPromotionPreview);

    const removeBtn = document.getElementById('btn-remove-promo');
    if (removeBtn) removeBtn.addEventListener('click', removePromotionPreview);

    const paymentBtn = document.getElementById('btn-go-payment');
    if (paymentBtn) paymentBtn.addEventListener('click', submitCheckout);
}

function appUrl(path) {
    return window.pageUtils && typeof window.pageUtils.resolveUrl === 'function'
        ? window.pageUtils.resolveUrl(path)
        : `../../${path}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
}

function readCheckoutData() {
    const keys = ['checkoutData', 'pendingCheckout'];
    const stores = [sessionStorage, localStorage];

    for (const store of stores) {
        for (const key of keys) {
            const raw = store.getItem(key);
            if (!raw) continue;

            try {
                const data = JSON.parse(raw);
                const belongsToUser = window.cartSession ? window.cartSession.belongsToCurrentUser(data) : true;
                if (belongsToUser && Array.isArray(data.items) && data.items.length > 0) {
                    return data;
                }
            } catch (error) {
                console.warn(`Khong doc duoc ${key}:`, error);
            }
        }
    }

    return null;
}

async function loadCheckout() {
    const message = document.getElementById('checkout-message');
    const details = document.getElementById('checkout-details');

    checkoutState.checkoutData = readCheckoutData();

    if (!checkoutState.checkoutData) {
        if (details) details.style.display = 'none';
        if (message) {
            message.innerHTML = `Khong tim thay thong tin mua ve. <a href="${appUrl('pages/nat-index.html')}" class="text-brand-orange font-bold">Chon su kien</a>`;
        }
        return;
    }

    if (message) message.style.display = 'none';
    if (details) details.style.display = 'grid';

    // Khoi tao thong tin khuyen mai neu da duoc ap dung tu truoc (vi du khi tiep tuc thanh toan)
    if (checkoutState.checkoutData.promotionCode) {
        checkoutState.discount = {
            code: checkoutState.checkoutData.promotionCode,
            discountAmount: Number(checkoutState.checkoutData.discountAmount || 0)
        };
        const promoInput = document.getElementById('promotion-code');
        if (promoInput) promoInput.value = checkoutState.checkoutData.promotionCode;
        
        const removeBtn = document.getElementById('btn-remove-promo');
        if (removeBtn) removeBtn.classList.remove('hidden');
        
        showPromotionMessage(`Da ap dung ma ${checkoutState.checkoutData.promotionCode}. Giam ${formatCurrency(checkoutState.checkoutData.discountAmount)}.`, 'success');
    }

    hydrateCustomerForm();
    renderCheckoutItems();
    recalculateTotals();
}

function hydrateCustomerForm() {
    const customer = checkoutState.checkoutData?.customer || {};
    const currentUser = getCurrentUser();

    setValue('cust-name', customer.name || currentUser?.fullName || currentUser?.name || '');
    setValue('cust-phone', customer.phone || currentUser?.phoneNumber || currentUser?.phone || '');
    setValue('cust-email', customer.email || currentUser?.email || '');
    setValue('cust-idcard', customer.idcard || '');
    setValue('cust-address', customer.address || currentUser?.address || '');

    const selectedPayment = checkoutState.checkoutData?.selectedPayment || 'BANK_TRANSFER';
    const methodInput = document.querySelector(`input[name="payment-method"][value="${selectedPayment}"]`);
    if (methodInput) methodInput.checked = true;
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch (error) {
        return null;
    }
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function getValue(id) {
    return document.getElementById(id)?.value?.trim() || '';
}

function renderCheckoutItems() {
    const eventNameEl = document.getElementById('checkout-event-name');
    const eventImageEl = document.getElementById('checkout-event-image');
    const itemsEl = document.getElementById('checkout-items');

    const data = checkoutState.checkoutData;
    if (eventNameEl) eventNameEl.textContent = data.eventName || 'Su kien BDHT';
    if (eventImageEl) {
        eventImageEl.src = data.bannerImageUrl || '../../assets/images/placeholder-event.jpg';
        eventImageEl.alt = data.eventName || 'Su kien';
    }

    if (!itemsEl) return;
    itemsEl.innerHTML = data.items.map((item) => {
        const price = Number(item.price || item.unitPrice || 0);
        const quantity = Number(item.quantity || 1);
        const subtotal = Number(item.subtotal || price * quantity);
        return `
            <div class="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
                <div>
                    <div class="font-extrabold text-slate-900">${item.typeName || item.name || 'Ve su kien'}</div>
                    <div class="text-sm text-slate-500 mt-1">So luong: ${quantity} x ${formatCurrency(price)}</div>
                </div>
                <div class="font-black text-brand-orange whitespace-nowrap">${formatCurrency(subtotal)}</div>
            </div>
        `;
    }).join('');
}

function recalculateTotals() {
    const data = checkoutState.checkoutData;
    const subtotal = data.items.reduce((sum, item) => {
        const price = Number(item.price || item.unitPrice || 0);
        const quantity = Number(item.quantity || 1);
        return sum + Number(item.subtotal || price * quantity);
    }, 0);

    let discountAmount = 0;
    if (checkoutState.discount) {
        discountAmount = Number(checkoutState.discount.discountAmount || 0);
    }

    const finalAmount = Math.max(subtotal - discountAmount, 0);
    checkoutState.totals = { subtotal, discountAmount, finalAmount };

    setText('summary-subtotal', formatCurrency(subtotal));
    setText('summary-discount', `-${formatCurrency(discountAmount)}`);
    setText('summary-final', formatCurrency(finalAmount));
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

async function applyPromotionPreview() {
    const code = getValue('promotion-code').toUpperCase();
    const msg = document.getElementById('promotion-message');

    if (!code) {
        showPromotionMessage('Nhap ma giam gia truoc khi ap dung.', 'error');
        return;
    }

    try {
        if (msg) msg.textContent = 'Dang kiem tra ma...';
        const response = await window.apiClient.post('/api/vtd/public/promotions/calculate-discount', {
            promotionCode: code,
            originalPrice: checkoutState.totals.subtotal
        });

        if (response?.error) throw new Error(response.error);

        checkoutState.discount = {
            code,
            discountAmount: Number(response.discountAmount || 0),
            discountType: response.discountType,
            discountValue: response.discountValue
        };

        recalculateTotals();
        showPromotionMessage(`Da ap dung ma ${code}. Giam ${formatCurrency(checkoutState.discount.discountAmount)}.`, 'success');
        const removeBtn = document.getElementById('btn-remove-promo');
        if (removeBtn) removeBtn.classList.remove('hidden');
    } catch (error) {
        checkoutState.discount = null;
        recalculateTotals();
        const errorMsg = error.message || 'Ma giam gia khong hop le.';
        showPromotionMessage(errorMsg, 'error');
        alert(errorMsg); // Bao loi luon khi an button Ap dung
    }
}

function removePromotionPreview() {
    checkoutState.discount = null;
    const input = document.getElementById('promotion-code');
    if (input) input.value = '';
    const removeBtn = document.getElementById('btn-remove-promo');
    if (removeBtn) removeBtn.classList.add('hidden');
    recalculateTotals();
    showPromotionMessage('Da bo ma giam gia.', 'neutral');
}

function showPromotionMessage(message, type) {
    const msg = document.getElementById('promotion-message');
    if (!msg) return;

    const classes = {
        success: 'text-emerald-600',
        error: 'text-red-600',
        neutral: 'text-slate-500'
    };
    msg.className = `text-xs font-bold mt-2 ${classes[type] || classes.neutral}`;
    msg.textContent = message;
}

function validateCheckoutForm() {
    const required = [
        ['cust-name', 'Vui long nhap ho ten.'],
        ['cust-phone', 'Vui long nhap so dien thoai.'],
        ['cust-email', 'Vui long nhap email.'],
        ['cust-address', 'Vui long nhap dia chi.']
    ];

    for (const [id, message] of required) {
        if (!getValue(id)) {
            alert(message);
            document.getElementById(id)?.focus();
            return false;
        }
    }

    const email = getValue('cust-email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Email khong dung dinh dang.');
        document.getElementById('cust-email')?.focus();
        return false;
    }

    if (!document.querySelector('input[name="payment-method"]:checked')) {
        alert('Vui long chon phuong thuc thanh toan.');
        return false;
    }

    if (!document.getElementById('terms-chk')?.checked) {
        alert('Vui long dong y dieu khoan mua ve.');
        return false;
    }

    return true;
}

async function submitCheckout() {
    if (!checkoutState.checkoutData || !validateCheckoutForm()) return;

    const btn = document.getElementById('btn-go-payment');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dang tao don...';
    }

    try {
        const orderId = await createOrderFromCheckout();
        const selectedPayment = document.querySelector('input[name="payment-method"]:checked')?.value || 'BANK_TRANSFER';

        const updatedCheckout = window.cartSession ? window.cartSession.attachUser({
            ...checkoutState.checkoutData,
            orderId: String(orderId),
            selectedPayment,
            customer: {
                name: getValue('cust-name'),
                phone: getValue('cust-phone'),
                email: getValue('cust-email'),
                idcard: getValue('cust-idcard'),
                address: getValue('cust-address')
            },
            promotionCode: checkoutState.discount?.code || null,
            subtotalAmount: checkoutState.totals.subtotal,
            discountAmount: checkoutState.totals.discountAmount,
            totalAmount: checkoutState.totals.finalAmount
        }) : {
            ...checkoutState.checkoutData,
            orderId: String(orderId),
            selectedPayment,
            customer: {
                name: getValue('cust-name'),
                phone: getValue('cust-phone'),
                email: getValue('cust-email'),
                idcard: getValue('cust-idcard'),
                address: getValue('cust-address')
            },
            promotionCode: checkoutState.discount?.code || null,
            subtotalAmount: checkoutState.totals.subtotal,
            discountAmount: checkoutState.totals.discountAmount,
            totalAmount: checkoutState.totals.finalAmount
        };

        localStorage.setItem('checkoutData', JSON.stringify(updatedCheckout));
        localStorage.setItem('pendingCheckout', JSON.stringify(updatedCheckout));
        sessionStorage.setItem('checkoutData', JSON.stringify(updatedCheckout));

        window.location.href = './nat-payment.html';
    } catch (error) {
        alert('Khong the tao don thanh toan: ' + error.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

async function createOrderFromCheckout() {
    let orderId = checkoutState.checkoutData?.orderId;

    // Neu da co san ma don hang (vi du tu tiep tuc thanh toan hoac an lai) thi tai su dung
    if (orderId) {
        // Cap nhat promotion neu co thay doi (best-effort, khong block flow)
        try {
            if (checkoutState.discount?.code) {
                await window.apiClient.post(`/api/vtd/member/orders/${orderId}/promotion`, {
                    promotionCode: checkoutState.discount.code
                });
            } else {
                try {
                    await window.apiClient.request(`/api/vtd/member/orders/${orderId}/promotion`, {
                        method: 'DELETE'
                    });
                } catch (e) {
                    // Bo qua neu truoc do chua ap promotion
                }
            }
        } catch (error) {
            console.warn("Loi cap nhat ma khuyen mai don hang cu:", error);
            // Khong throw - don hang cu co the da COMPLETED nen khong cho sua promotion
        }

        // Don hang cu da duoc confirm truoc do, khong can goi lai /confirm
        // (Backend chi cho confirm don PENDING, goi lai se bi loi 500)

        if (window.cartSession) {
            window.cartSession.setOrderId(orderId);
        } else {
            localStorage.setItem('currentOrderId', String(orderId));
        }

        return orderId;
    }

    // Neu chua co don hang (mua ve moi hoan toan)
    if (window.cartSession) {
        window.cartSession.clearOrder();
    } else {
        localStorage.removeItem('currentOrderId');
    }

    const createdOrder = await window.apiClient.post('/api/vtd/member/orders', {});
    orderId = createdOrder?.orderId || createdOrder?.id;
    if (!orderId) throw new Error('Backend khong tra ve ma don hang.');

    const validItems = checkoutState.checkoutData.items.filter(item => item.ticketTypeId && Number(item.quantity || 0) > 0);
    if (validItems.length === 0) {
        throw new Error('Khong co hang ve hop le de tao don.');
    }

    for (const item of validItems) {
        if (!item.ticketTypeId) continue;
        await window.apiClient.post(`/api/vtd/member/orders/${orderId}/items`, {
            ticketTypeId: Number(item.ticketTypeId),
            quantity: Number(item.quantity || 1)
        });
    }

    if (checkoutState.discount?.code) {
        await window.apiClient.post(`/api/vtd/member/orders/${orderId}/promotion`, {
            promotionCode: checkoutState.discount.code
        });
    }

    await window.apiClient.post(`/api/vtd/member/orders/${orderId}/confirm`, {});

    if (window.cartSession) {
        window.cartSession.setOrderId(orderId);
    } else {
        localStorage.setItem('currentOrderId', String(orderId));
    }

    return orderId;
}
