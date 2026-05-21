document.addEventListener('DOMContentLoaded', () => {
    // Tải Header dynamic nếu có tiện ích
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }
    
    loadEventDetails();
    setupBookingForm();
    setupStickyFooterScroll();
    setupModalEvents();
});

// ==========================================
// 1. TẢI CHI TIẾT SỰ KIỆN TỪ BACKEND API
// ==========================================
async function loadEventDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    const loadingMsg = document.getElementById('loading-msg');
    const errorMsg = document.getElementById('error-msg');
    const eventContent = document.getElementById('event-content');
    const ticketTypesContainer = document.getElementById('ticket-types');
    const ticketListStatic = document.getElementById('ticket-types-list-static');
    const eventImagesContainer = document.getElementById('detail-images');
    const venueInfo = document.getElementById('detail-venue-info');

    if (!eventId) {
        if (loadingMsg) loadingMsg.style.display = 'none';
        if (errorMsg) {
            errorMsg.innerText = 'Không tìm thấy mã sự kiện. Vui lòng quay lại Trang chủ!';
            errorMsg.classList.remove('hidden');
        }
        return;
    }

    try {
        let event = null;
        let ticketTypes = [];
        let images = [];
        let isFallback = false;

        try {
            event = await window.apiClient.get(`/api/nat/public/events/${eventId}`);
        } catch (apiErr) {
            console.warn("Lỗi API lấy chi tiết sự kiện, đang kiểm tra dữ liệu dự phòng:", apiErr);
            event = getFallbackEventDetails(eventId);
            if (!event) throw apiErr; // Nếu không có dự phòng thì ném lỗi ra ngoài
            isFallback = true;
        }

        if (loadingMsg) loadingMsg.style.display = 'none';
        if (eventContent) eventContent.classList.remove('hidden');

        // Điền Tiêu đề
        const titleEl = document.getElementById('detail-title');
        if (titleEl) titleEl.innerText = event.title || event.name || event.eventName || 'Sự kiện đặc sắc';

        // Điền Địa điểm
        const venueEl = document.getElementById('detail-venue');
        if (venueEl) venueEl.innerText = (event.venue && event.venue.venueName) ? event.venue.venueName : (event.venueName || event.location || 'Chưa cập nhật');

        // Điền mô tả giới thiệu chi tiết
        const descEl = document.getElementById('detail-desc');
        if (descEl) descEl.innerHTML = event.description || event.desc || 'Chưa có thông tin giới thiệu chi tiết.';
        
        // Phân tách Ngày & Giờ
        const rawDate = event.startTime || event.date;
        const dateEl = document.getElementById('detail-date');
        const timeEl = document.getElementById('detail-time-row');
        if (rawDate) {
            const d = new Date(rawDate);
            if (dateEl) dateEl.innerText = d.toLocaleDateString('vi-VN');
            if (timeEl) timeEl.innerText = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // Cập nhật banner chính và phông nền mờ cinematic
        const imgUrl = event.bannerImageUrl || event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80';
        const imgEl = document.getElementById('detail-image');
        if (imgEl) imgEl.src = imgUrl;

        const blurBgEl = document.getElementById('detail-blur-bg');
        if (blurBgEl) {
            blurBgEl.style.backgroundImage = `url('${imgUrl}')`;
        }

        // Tải ảnh sự kiện lên Modal checkout
        const modalImg = document.getElementById('modal-event-image');
        if (modalImg) modalImg.src = imgUrl;

        // Tải chi tiết địa điểm
        if (venueInfo) {
            venueInfo.innerHTML = renderVenueInfo(event.venue || {
                venueName: event.venueName || 'Chưa cập nhật',
                address: event.address || '',
                city: event.city || ''
            });
        }

        // Tải hạng vé
        if (isFallback) {
            ticketTypes = event.ticketTypes || [];
        } else {
            try {
                const ticketApi = window.apiClient.getToken() ?
                    `/api/nat/member/ticket-types/${eventId}/available` :
                    `/api/nat/public/ticket-types/${eventId}`;
                ticketTypes = await window.apiClient.get(ticketApi);
            } catch (ticketErr) {
                console.warn("Lỗi tải hạng vé thực tế, dùng hạng vé của sự kiện:", ticketErr);
                ticketTypes = event.ticketTypes || [];
            }
        }
        
        // Render vào bộ chọn đặt vé bên phải
        if (ticketTypesContainer) {
            renderTicketTypesSelect(ticketTypes, ticketTypesContainer);
        }

        // Render vào danh sách giá vé tĩnh bên trái
        if (ticketListStatic) {
            renderTicketListStatic(ticketTypes, ticketListStatic);
        }

        // Tải thêm dải ảnh phụ
        if (eventImagesContainer) {
            if (isFallback) {
                images = [];
            } else {
                images = await loadEventImages(eventId);
            }
            renderEventImages(images, eventImagesContainer, imgUrl);
        }

        // Render sự kiện liên quan bằng Mock Data
        renderRelatedEvents();

    } catch (error) {
        console.error('Lỗi lấy chi tiết sự kiện:', error);
        if (loadingMsg) loadingMsg.style.display = 'none';
        if (errorMsg) {
            errorMsg.innerText = `Không thể tải dữ liệu: ${error.message}`;
            errorMsg.classList.remove('hidden');
        }
    }
}

// Tải thêm ảnh phụ sự kiện
async function loadEventImages(eventId) {
    try {
        const images = await window.apiClient.get(`/api/nat/public/events/${eventId}/images`);
        return Array.isArray(images) && images.length > 0 ? images : [];
    } catch (error) {
        console.warn('Không lấy được ảnh sự kiện phụ:', error);
        return [];
    }
}

// Vẽ danh sách ảnh thu nhỏ
function renderEventImages(images, container, fallbackImage) {
    if (!container) return;

    const imageUrls = [fallbackImage];
    images.forEach(image => {
        const src = image.imageUrl || image.url;
        if (src && !imageUrls.includes(src)) {
            imageUrls.push(src);
        }
    });

    if (imageUrls.length <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = imageUrls.map((src, idx) => {
        return `
            <img src="${src}" 
                 alt="Thumbnail ${idx + 1}" 
                 class="detail-thumbnail-img w-16 h-12 object-cover rounded border-2 cursor-pointer transition ${idx === 0 ? 'border-brand-orange scale-102' : 'border-gray-200 hover:border-brand-orange'}" 
                 onclick="changeDetailImage('${src}', this)">
        `;
    }).join('');
}

// Đổi ảnh chính & ảnh mờ phông nền khi bấm ảnh phụ
window.changeDetailImage = function(src, thumbnailEl) {
    const mainImageEl = document.getElementById('detail-image');
    if (mainImageEl) mainImageEl.src = src;
    
    const blurBgEl = document.getElementById('detail-blur-bg');
    if (blurBgEl) blurBgEl.style.backgroundImage = `url('${src}')`;
    
    // Nổi bật ảnh phụ đang chọn
    if (thumbnailEl) {
        const thumbnails = thumbnailEl.parentElement.querySelectorAll('img');
        thumbnails.forEach(img => {
            img.className = "w-16 h-12 object-cover rounded border-2 border-gray-200 cursor-pointer hover:border-brand-orange transition";
        });
        thumbnailEl.className = "w-16 h-12 object-cover rounded border-2 border-brand-orange scale-102 transition";
    }
};

// Render chi tiết địa điểm
function renderVenueInfo(venue) {
    const name = venue.venueName || venue.name || 'Chưa cập nhật';
    const address = venue.address || venue.addressLine || 'Địa chỉ chưa rõ';
    const city = venue.city || venue.cityName || '';

    return `
        <div class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold leading-relaxed text-slate-655">
            <h4 class="text-sm font-extrabold text-slate-800 mb-1">📍 Thông Tin Địa Điểm</h4>
            <p class="font-bold text-slate-900">${name}</p>
            <p>${address}${city ? ', ' + city : ''}</p>
        </div>
    `;
}

// Render các ô chọn hạng vé bên cột phải
function renderTicketTypesSelect(ticketTypes, container) {
    if (!ticketTypes || ticketTypes.length === 0) {
        container.innerHTML = '<p class="text-xs font-bold text-red-500">Không có loại vé nào đang mở bán.</p>';
        return;
    }

    container.innerHTML = ticketTypes.map((type, index) => {
        const name = type.typeName || type.name || 'Vé chung';
        const price = type.price ? Number(type.price).toLocaleString('vi-VN') + ' đ' : 'Liên hệ';
        const remaining = (type.totalQuantity || 0) - (type.soldQuantity || 0);
        
        return `
            <label class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition text-xs font-bold ${index === 0 ? 'border-brand-orange bg-orange-50/50 text-brand-orange' : 'border-gray-200 hover:border-brand-orange text-slate-700'}" onclick="highlightSelectedTicket(this)">
                <span class="flex items-center gap-2">
                    <input type="radio" name="ticketType" value="${type.ticketTypeId}" ${index === 0 ? 'checked' : ''} class="accent-brand-orange w-4 h-4 cursor-pointer">
                    <span>${name}</span>
                </span>
                <span>${price} (Còn ${remaining})</span>
            </label>
        `;
    }).join('');
}

// Thay đổi viền nổi bật cho ô vé đang chọn
window.highlightSelectedTicket = function(labelEl) {
    if (!labelEl) return;
    const labels = labelEl.parentElement.querySelectorAll('label');
    labels.forEach(lbl => {
        lbl.className = "flex items-center justify-between p-3.5 rounded-xl border border-gray-200 cursor-pointer hover:border-brand-orange text-slate-700 text-xs font-bold";
    });
    labelEl.className = "flex items-center justify-between p-3.5 rounded-xl border-2 border-brand-orange bg-orange-50/50 text-brand-orange text-xs font-bold cursor-pointer";
};

// Render bảng giá vé tĩnh bên cột trái
function renderTicketListStatic(ticketTypes, container) {
    if (!ticketTypes || ticketTypes.length === 0) {
        container.innerHTML = '<li class="bg-gray-50 p-4 border border-gray-200 rounded-xl text-center text-xs font-bold col-span-2">Đang cập nhật giá vé</li>';
        return;
    }

    container.innerHTML = ticketTypes.map(type => {
        const name = type.typeName || type.name || 'Vé chung';
        const price = type.price ? Number(type.price).toLocaleString('vi-VN') + ' VND' : 'Liên hệ';
        return `
            <li class="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between font-semibold text-sm">
                <span class="text-slate-800 font-extrabold">${name}</span>
                <span class="text-brand-orange font-black">${price}</span>
            </li>
        `;
    }).join('');
}

// ==========================================
// 2. MOCK DATA & RENDER RELATED EVENTS (Grid chia 4 cột)
// ==========================================
const MOCK_EVENTS = [
    {
        id: 101,
        title: 'DaNang Craft Beer Festival 2026 - Lễ hội bia thủ công',
        date: '12.07.2026',
        location: 'Cung Thể Thao Tiên Sơn',
        price: 'VND 350,000+',
        imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c092fb6224d?w=500&auto=format&fit=crop&q=80',
        city: 'Đà Nẵng'
    },
    {
        id: 102,
        title: 'Show diễn xiếc tre nghệ thuật Teh Dar | Bản sắc Tây Nguyên',
        date: '18.07.2026',
        location: 'Nhà Hát Lớn TP. Hồ Chí Minh',
        price: 'VND 700,000+',
        imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80',
        city: 'TP. HCM'
    },
    {
        id: 103,
        title: 'Liveshow HÀ NHI - Người yêu cũ là Tri kỷ | Sky Melody',
        date: '25.07.2026',
        location: 'Ecopark Hưng Yên',
        price: 'VND 1,200,000+',
        imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&auto=format&fit=crop&q=80',
        city: 'Hà Nội'
    },
    {
        id: 104,
        title: 'Ký Ức Hội An - Hoi An Memories Show | Bản sắc biểu diễn',
        date: '02.08.2026',
        location: 'Đảo Ký Ức Hội An',
        price: 'VND 600,000+',
        imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80',
        city: 'Hội An'
    }
];

function renderRelatedEvents() {
    const grid = document.getElementById('related-events-grid');
    if (!grid) return;

    grid.innerHTML = MOCK_EVENTS.map(event => {
        return `
            <div onclick="window.location.href='event-detail.html?id=${event.id}'" class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-150 flex flex-col hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer">
                <div class="relative h-44 overflow-hidden bg-slate-900">
                    <img src="${event.imageUrl}" alt="${event.title}" class="w-full h-full object-cover group-hover:scale-102 transition" />
                    <span class="absolute top-3 left-3 text-[10px] font-extrabold bg-brand-purple text-white px-2.5 py-1 rounded shadow">
                        ${event.date}
                    </span>
                    <span class="absolute top-3 right-3 text-[9px] font-extrabold bg-brand-orange text-white px-2 py-0.5 rounded shadow uppercase">
                        ${event.city}
                    </span>
                </div>
                <div class="p-4 flex-1 flex flex-col justify-between gap-3">
                    <h4 class="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-orange transition">
                        ${event.title}
                    </h4>
                    <div class="text-[11px] text-slate-500 font-medium truncate">📍 ${event.location}</div>
                    <div class="border-t border-gray-100 pt-2 flex items-center justify-between">
                        <span class="text-[10px] text-slate-400 uppercase font-bold">Giá từ</span>
                        <span class="text-xs font-black text-brand-orange">${event.price}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// 3. ĐẶT VÉ SỰ KIỆN (CALL API MUA HÀNG THỰC TẾ)
// ==========================================
function setupBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    if (!bookingForm) return;

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgBox = document.getElementById('booking-msg');
        const token = window.apiClient ? window.apiClient.getToken() : null;
        const storedUser = localStorage.getItem('currentUser');
        const isLoggedIn = token || storedUser;

        if (!isLoggedIn) {
            if (msgBox) {
                msgBox.className = "text-xs font-bold text-center p-3 bg-red-50 border border-red-100 rounded text-red-655";
                msgBox.innerHTML = 'Bạn cần đăng nhập trước khi đặt vé.';
            }
            setTimeout(() => {
                window.location.href = './login.html';
            }, 1400);
            return;
        }

        const qtyInput = document.getElementById('ticket-qty');
        const qty = Number(qtyInput ? qtyInput.value : 1) || 1;
        const selectedTicketType = document.querySelector('input[name="ticketType"]:checked');
        
        if (!selectedTicketType) {
            if (msgBox) {
                msgBox.className = "text-xs font-bold text-center p-3 bg-red-50 border border-red-100 rounded text-red-655";
                msgBox.innerText = 'Vui lòng chọn loại vé.';
            }
            return;
        }

        const ticketTypeId = Number(selectedTicketType.value);
        if (msgBox) {
            msgBox.className = "text-xs font-bold text-center text-blue-600";
            msgBox.innerText = 'Đang thêm vé vào đơn hàng...';
        }

        try {
            const orderId = await getOrCreateOrder();
            await window.apiClient.post(`/api/nat/member/orders/${orderId}/items`, {
                ticketTypeId,
                quantity: qty
            });
            
            if (msgBox) {
                const profileUrl = 'profile.html';
                
                msgBox.className = "text-xs font-bold text-center p-3 bg-emerald-50 border border-emerald-100 rounded text-emerald-655";
                msgBox.innerHTML = `🎉 Đã thêm thành công ${qty} vé! <a href='${profileUrl}' class='text-brand-purple underline ml-1'>Xem giỏ hàng</a>`;
            }
        } catch (error) {
            if (msgBox) {
                msgBox.className = "text-xs font-bold text-center p-3 bg-red-50 border border-red-100 rounded text-red-655";
                msgBox.innerText = `Lỗi đặt vé: ${error.message}`;
            }
        }
    });
}

// Lấy hoặc tạo mới giỏ hàng
async function getOrCreateOrder() {
    let orderId = localStorage.getItem('currentOrderId');
    if (orderId) return orderId;

    const data = await window.apiClient.post('/api/nat/member/orders', {});
    if (!data || !data.orderId) {
        throw new Error('Không tạo được phiên giao dịch đơn hàng.');
    }

    orderId = data.orderId;
    localStorage.setItem('currentOrderId', orderId);
    return orderId;
}

// ==========================================
// 4. HIỆN / ẨN STICKY FOOTER ON SCROLL
// ==========================================
function setupStickyFooterScroll() {
    window.addEventListener('scroll', () => {
        const footer = document.getElementById('sticky-checkout-bar');
        const bookingBox = document.getElementById('booking-block');
        if (!footer || !bookingBox) return;

        const triggerOffset = bookingBox.offsetTop + bookingBox.offsetHeight;
        if (window.scrollY > triggerOffset) {
            footer.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
            footer.classList.add('translate-y-0', 'opacity-100');
        } else {
            footer.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
            footer.classList.remove('translate-y-0', 'opacity-100');
        }
    });
}

// ==========================================
// 5. MOCK TICKETS & CART LOGIC FOR MODAL
// ==========================================
const MOCK_CART_TICKETS = [
    { id: 1, name: 'Vé GA: Zone "Anh đau từ lúc em đi"', price: 850000, soldOut: false, quantity: 0 },
    { id: 2, name: 'Vé VIP: Zone "Trời vẫn còn xanh"', price: 1250000, soldOut: false, quantity: 0 },
    { id: 3, name: 'Vé VIP: Zone "Kẻ Say Tình"', price: 1650000, soldOut: false, quantity: 0 },
    { id: 4, name: 'Vé SVIP: Zone "Hoa và Váy"', price: 2150000, soldOut: true, quantity: 0 },
    { id: 5, name: 'Hạng vé đặc biệt: "SVIP Class"', price: 2650000, soldOut: false, quantity: 0 }
];

window.activeDiscount = 0; // Tỷ lệ chiết khấu (0 - 1)

// Thiết lập các sự kiện mở/đóng modal thanh toán
function setupModalEvents() {
    const modal = document.getElementById('booking-modal');
    const summaryBtn = document.getElementById('summary-buy-btn');
    const stickyBtn = document.getElementById('sticky-buy-btn');
    const closeBtn = document.getElementById('close-modal-btn');

    if (!modal) return;

    const openModal = () => {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden'); // Chặn cuộn trang chính
        renderModalCart();
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden'); // Mở cuộn trang chính
    };

    if (summaryBtn) summaryBtn.addEventListener('click', openModal);
    if (stickyBtn) stickyBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Click ra ngoài vùng trắng để đóng modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Render giỏ hàng trong Modal
function renderModalCart() {
    const container = document.getElementById('modal-cart-items');
    if (!container) return;

    container.innerHTML = MOCK_CART_TICKETS.map(ticket => {
        const priceStr = ticket.price.toLocaleString('vi-VN') + ' VNĐ';
        
        let controlHtml = '';
        if (ticket.soldOut) {
            controlHtml = `<span class="bg-gray-200 text-slate-500 font-bold px-3 py-1 rounded text-xs">Bán hết</span>`;
        } else {
            controlHtml = `
                <div class="flex items-center border border-gray-250 rounded-lg overflow-hidden bg-white">
                    <button type="button" onclick="updateModalQty(${ticket.id}, -1)" class="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-500 font-extrabold flex items-center justify-center transition">-</button>
                    <input type="text" readonly value="${ticket.quantity}" class="w-8 text-center font-bold text-xs bg-transparent focus:outline-none" />
                    <button type="button" onclick="updateModalQty(${ticket.id}, 1)" class="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 font-extrabold flex items-center justify-center transition">+</button>
                </div>
            `;
        }

        return `
            <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-xs">
                <div class="flex flex-col gap-0.5 max-w-[200px] sm:max-w-xs">
                    <span class="font-extrabold text-slate-800 truncate">${ticket.name}</span>
                    <span class="text-slate-450 font-bold">${priceStr}</span>
                </div>
                <div>
                    ${controlHtml}
                </div>
            </div>
        `;
    }).join('');

    calculateTotal();
}

// Cập nhật số lượng vé trong Modal
window.updateModalQty = function(ticketId, delta) {
    const ticket = MOCK_CART_TICKETS.find(t => t.id === ticketId);
    if (!ticket) return;

    ticket.quantity = Math.max(0, ticket.quantity + delta);
    renderModalCart();
};

// Tính toán tổng tiền thực tế
function calculateTotal() {
    let subtotal = 0;
    MOCK_CART_TICKETS.forEach(t => {
        subtotal += t.price * t.quantity;
    });

    // Áp dụng giảm giá coupon
    const total = subtotal * (1 - window.activeDiscount);

    const totalEl = document.getElementById('modal-cart-total');
    if (totalEl) {
        totalEl.innerText = total.toLocaleString('vi-VN') + ' VNĐ';
    }
}

// Kiểm tra mã giảm giá
window.checkCoupon = function() {
    const codeEl = document.getElementById('coupon-code');
    const msgEl = document.getElementById('coupon-msg');
    if (!codeEl || !msgEl) return;

    const code = codeEl.value.trim().toUpperCase();
    if (!code) {
        msgEl.className = "text-[10px] font-bold text-center mt-1 text-red-500";
        msgEl.innerText = "Vui lòng nhập mã coupon.";
        return;
    }

    if (code === 'BDHT2026' || code === 'SALE50') {
        msgEl.className = "text-[10px] font-bold text-center mt-1 text-emerald-500";
        msgEl.innerText = "Áp dụng thành công! Giảm giá 10% tổng tiền vé.";
        window.activeDiscount = 0.1;
        calculateTotal();
    } else {
        msgEl.className = "text-[10px] font-bold text-center mt-1 text-red-500";
        msgEl.innerText = "Mã coupon không đúng hoặc đã hết hạn.";
        window.activeDiscount = 0;
        calculateTotal();
    }
};

// Xác nhận thanh toán và chuyển tiếp dữ liệu qua payment.html
window.submitModalCheckout = function() {
    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const email = document.getElementById('cust-email').value.trim();
    const idcard = document.getElementById('cust-idcard').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const terms = document.getElementById('terms-chk').checked;

    if (!name || !phone || !email || !idcard || !address) {
        alert("Vui lòng nhập đầy đủ thông tin khách hàng bắt buộc!");
        return;
    }

    if (!terms) {
        alert("Vui lòng đồng ý với các Điều khoản & Chính sách trước khi tiếp tục!");
        return;
    }

    const totalStr = document.getElementById('modal-cart-total').innerText;
    if (totalStr === '0 VNĐ') {
        alert("Giỏ hàng của bạn đang trống! Vui lòng chọn ít nhất 1 hạng vé.");
        return;
    }

    // Lấy phương thức thanh toán đang chọn
    const selectedPaymentEl = document.querySelector('input[name="payment-method"]:checked');
    const selectedPayment = selectedPaymentEl ? selectedPaymentEl.value : 'vietqr';
    
    const eventName = document.getElementById('detail-title').innerText;
    const orderId = localStorage.getItem('currentOrderId') || Math.floor(100000 + Math.random() * 900000).toString();
    
    // Trích xuất eventId từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id') || '1';

    // Đóng gói dữ liệu thanh toán
    const checkoutData = {
        eventId: eventId,
        selectedPayment: selectedPayment,
        totalAmount: totalStr,
        eventName: eventName,
        orderId: orderId,
        customer: {
            name: name,
            phone: phone,
            email: email,
            idcard: idcard,
            address: address
        }
    };

    // Ghi vào localStorage
    localStorage.setItem('checkoutData', JSON.stringify(checkoutData));

    // Khôi phục thanh cuộn body
    document.body.classList.remove('overflow-hidden');

    alert(`🎉 Đăng ký thông tin mua vé thành công!\nHọ tên: ${name}\nTổng thanh toán: ${totalStr}\n\nHệ thống đang chuyển hướng tới cổng thanh toán an toàn...`);
    
    // Chuyển hướng
                window.location.href = './payment.html';
};

// ==========================================================
// HÀM DỰ PHÒNG CHỐNG SẬP: TRẢ VỀ DỮ LIỆU SỰ KIỆN KHI API CHƯA CÓ
// ==========================================================
function getFallbackEventDetails(eventId) {
    const id = parseInt(eventId, 10);
    
    const fallbackList = [
        {
            eventId: 1,
            title: "Vietnam Tech Impact Summit 2026",
            description: "<p>Hội nghị thượng đỉnh công nghệ có tầm ảnh hưởng lớn nhất Việt Nam năm 2026 quy tụ hơn 50 diễn giả quốc tế và hàng ngàn doanh nghiệp công nghệ toàn cầu.</p>",
            startTime: "2026-07-25T19:30:00",
            endTime: "2026-07-25T23:30:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=600",
            venue: {
                venueName: "Trung tâm Hội nghị Quốc gia",
                address: "Cổng số 1, Đại lộ Thăng Long, Mễ Trì",
                city: "Hà Nội"
            },
            ticketTypes: [
                { ticketTypeId: 1, typeName: "Standard Pass", price: 1500000, totalQuantity: 500, soldQuantity: 320 },
                { ticketTypeId: 2, typeName: "VIP Access", price: 4500000, totalQuantity: 100, soldQuantity: 95 }
            ]
        },
        {
            eventId: 2,
            title: "The Eras Tour - Vietnam Edition",
            description: "<p>Đêm diễn âm nhạc huyền thoại mang đẳng cấp thế giới lần đầu tiên cập bến Việt Nam, hứa hẹn bùng nổ mọi giác quan của hàng triệu khán giả.</p>",
            startTime: "2026-07-15T20:00:00",
            endTime: "2026-07-15T23:30:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=600",
            venue: {
                venueName: "Sân vận động Quốc gia Mỹ Đình",
                address: "Đường Lê Đức Thọ, Mỹ Đình 1",
                city: "Hà Nội"
            },
            ticketTypes: [
                { ticketTypeId: 3, typeName: "Khu vực CAT 1", price: 5800000, totalQuantity: 1000, soldQuantity: 980 },
                { ticketTypeId: 4, typeName: "Khu vực VIP", price: 15000000, totalQuantity: 200, soldQuantity: 198 }
            ]
        },
        {
            eventId: 3,
            title: "Workshop: Bảo mật Hệ thống Web Spring Boot",
            description: "<p>Khóa đào tạo chuyên sâu về xây dựng kiến trúc bảo mật cấp độ doanh nghiệp, cấu hình JWT nâng cao và phòng chống lỗ hổng OWASP Top 10.</p>",
            startTime: "2026-07-22T19:00:00",
            endTime: "2026-07-22T22:00:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600",
            venue: {
                venueName: "BDHT Lab Hà Nội",
                address: "Số 1, Phạm Văn Bạch, Yên Hòa",
                city: "Hà Nội"
            },
            ticketTypes: [
                { ticketTypeId: 5, typeName: "Vé tham gia trực tiếp", price: 450000, totalQuantity: 50, soldQuantity: 42 },
                { ticketTypeId: 6, typeName: "Vé Online Zoom", price: 200000, totalQuantity: 200, soldQuantity: 150 }
            ]
        },
        {
            eventId: 4,
            title: "Dragon Ocean Concert - Dòng Chảy | Phương Linh",
            description: "<p>Đêm đại nhạc hội ngoài trời đắm chìm trong tiếng sóng biển và những bản tình ca say đắm của ca sĩ Phương Linh cùng ban nhạc.</p>",
            startTime: "2026-09-05T20:00:00",
            endTime: "2026-09-05T23:00:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600",
            venue: {
                venueName: "Khu du lịch Đồi Rồng",
                address: "Vạn Hương, Đồ Sơn",
                city: "Hải Phòng"
            },
            ticketTypes: [
                { ticketTypeId: 7, typeName: "Hạng Standard", price: 800000, totalQuantity: 1200, soldQuantity: 950 },
                { ticketTypeId: 8, typeName: "Hạng VIP", price: 2000000, totalQuantity: 300, soldQuantity: 240 }
            ]
        },
        {
            eventId: 5,
            title: "Tour Trekking & Cắm trại Hồ Ba Bể kì vĩ",
            description: "<p>Hành trình khám phá di sản thiên nhiên quốc gia Hồ Ba Bể, băng rừng nguyên sinh, trải nghiệm văn hóa Tày bản địa.</p>",
            startTime: "2026-08-12T07:00:00",
            endTime: "2026-08-14T18:00:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1470229722913-7c092fb6224d?q=80&w=600",
            venue: {
                venueName: "Hồ Ba Bể",
                address: "Vườn Quốc Gia Ba Bể",
                city: "Bắc Kạn"
            },
            ticketTypes: [
                { ticketTypeId: 9, typeName: "Trọn gói 3N2Đ", price: 2389500, totalQuantity: 20, soldQuantity: 15 }
            ]
        },
        {
            eventId: 6,
            title: "Show Diễn Ký Ức Hội An đỉnh cao nghệ thuật",
            description: "<p>Chương trình biểu diễn nghệ thuật thực cảnh quy mô lớn nhất thế giới, tái hiện sống động thương cảng Hội An sầm uất qua các thời kỳ.</p>",
            startTime: "2026-08-20T20:00:00",
            endTime: "2026-08-20T21:15:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=600",
            venue: {
                venueName: "Công viên Ấn tượng Hội An",
                address: "Cồn Hến, Cẩm Nam",
                city: "Hội An"
            },
            ticketTypes: [
                { ticketTypeId: 10, typeName: "Hạng Eco", price: 600000, totalQuantity: 2000, soldQuantity: 1400 },
                { ticketTypeId: 11, typeName: "Hạng High", price: 750000, totalQuantity: 1000, soldQuantity: 820 },
                { ticketTypeId: 12, typeName: "Hạng VIP", price: 1200000, totalQuantity: 300, soldQuantity: 290 }
            ]
        },
        {
            eventId: 7,
            title: "Private Quốc Thiên In Fantasy show hoành tráng",
            description: "<p>Đêm nhạc phòng trà ấm cúng, sang trọng dành riêng cho các tri kỷ yêu mến giọng hát truyền cảm của nam ca sĩ Quốc Thiên.</p>",
            startTime: "2026-08-16T19:30:00",
            endTime: "2026-08-16T22:30:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=600",
            venue: {
                venueName: "Nhà Hát Lớn Hà Nội",
                address: "Số 1, Tràng Tiền, Hoàn Kiếm",
                city: "Hà Nội"
            },
            ticketTypes: [
                { ticketTypeId: 13, typeName: "Hạng VIP", price: 2000000, totalQuantity: 100, soldQuantity: 88 },
                { ticketTypeId: 14, typeName: "Hạng VVIP", price: 3500000, totalQuantity: 50, soldQuantity: 49 }
            ]
        },
        {
            eventId: 8,
            title: "Workshop Nấu Ăn Ẩm Thực Ấn Độ Benaras",
            description: "<p>Trực tiếp học hỏi công thức gia truyền và cách phối hợp gia vị tinh tế từ Master Chef Ấn Độ tại chuỗi nhà hàng Benaras.</p>",
            startTime: "2026-08-18T14:00:00",
            endTime: "2026-08-18T17:00:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600",
            venue: {
                venueName: "Benaras Restaurant",
                address: "Quận 1",
                city: "TP. HCM"
            },
            ticketTypes: [
                { ticketTypeId: 15, typeName: "Standard Entry", price: 500000, totalQuantity: 30, soldQuantity: 18 }
            ]
        }
    ];

    const matched = fallbackList.find(e => e.eventId === id);
    if (matched) return matched;

    const secondaryList = [
        {
            eventId: 101,
            title: "DaNang Craft Beer Festival 2026 - Lễ hội bia thủ công",
            description: "<p>Lễ hội hội tụ hàng chục thương hiệu bia thủ công nổi tiếng trong và ngoài nước cùng không khí nhạc rock cuồng nhiệt.</p>",
            startTime: "2026-07-12T16:00:00",
            endTime: "2026-07-12T23:30:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1470229722913-7c092fb6224d?w=500&auto=format&fit=crop&q=80",
            venue: {
                venueName: "Cung Thể Thao Tiên Sơn",
                address: "Phan Đăng Lưu, Hòa Cường Bắc",
                city: "Đà Nẵng"
            },
            ticketTypes: [
                { ticketTypeId: 101, typeName: "Vé tham gia phổ thông", price: 350000, totalQuantity: 1000, soldQuantity: 650 }
            ]
        },
        {
            eventId: 102,
            title: "Show diễn xiếc tre nghệ thuật Teh Dar | Bản sắc Tây Nguyên",
            description: "<p>Vở diễn xiếc tre kết hợp âm nhạc cồng chiêng sống động, tái hiện nét hoang dã đầy lôi cuốn của đồng bào Tây Nguyên.</p>",
            startTime: "2026-07-18T20:00:00",
            endTime: "2026-07-18T21:15:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80",
            venue: {
                venueName: "Nhà Hát Lớn TP. Hồ Chí Minh",
                address: "Số 7, Công Trường Lam Sơn, Bến Nghé",
                city: "TP. HCM"
            },
            ticketTypes: [
                { ticketTypeId: 102, typeName: "Hạng vé Ooh", price: 700000, totalQuantity: 500, soldQuantity: 410 },
                { ticketTypeId: 103, typeName: "Hạng vé Sip", price: 1150000, totalQuantity: 200, soldQuantity: 170 }
            ]
        },
        {
            eventId: 103,
            title: "Liveshow HÀ NHI - Người yêu cũ là Tri kỷ | Sky Melody",
            description: "<p>Liveshow lãng mạn giữa đại ngàn Ecopark lắng nghe những bản ballad sâu lắng đi vào lòng người của Hà Nhi.</p>",
            startTime: "2026-07-25T19:30:00",
            endTime: "2026-07-25T22:30:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&auto=format&fit=crop&q=80",
            venue: {
                venueName: "Sky Melody Ecopark",
                address: "Văn Giang",
                city: "Hà Nội"
            },
            ticketTypes: [
                { ticketTypeId: 104, typeName: "Hạng ghế Vùng Lá Me Bay", price: 1200000, totalQuantity: 200, soldQuantity: 150 }
            ]
        },
        {
            eventId: 104,
            title: "Ký Ức Hội An - Hoi An Memories Show | Bản sắc biểu diễn",
            description: "<p>Chương trình thực cảnh đẳng cấp kỷ lục thế giới mang lại những cung bậc cảm xúc khó phai.</p>",
            startTime: "2026-08-02T20:00:00",
            endTime: "2026-08-02T21:15:00",
            bannerImageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80",
            venue: {
                venueName: "Đảo Ký Ức Hội An",
                address: "Cẩm Nam",
                city: "Hội An"
            },
            ticketTypes: [
                { ticketTypeId: 105, typeName: "Hạng Eco Standard", price: 600000, totalQuantity: 1000, soldQuantity: 720 }
            ]
        }
    ];
    return secondaryList.find(e => e.eventId === id);
}
