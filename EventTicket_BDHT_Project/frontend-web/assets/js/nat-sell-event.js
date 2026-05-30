/**
 * ============================================================================
 * HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT
 * File: nat-sell-event.js
 * Chức năng: Cho phép thành viên đăng bán vé sự kiện của riêng mình.
 *
 * *** THIẾT KẾ "ĐÚNG SỰ KIỆN CỦA TÔI" (KHÔNG TẠO ẢO) ***
 * Vì backend không có trường createdBy, ta dùng localStorage để:
 *   - Khi user tạo sự kiện thành công → lưu eventId vào localStorage
 *     key: "bdht_my_events_<userId>"  (gắn theo userId để tránh nhầm giữa users)
 *   - Khi tải "Sự kiện của tôi" → chỉ hiển thị những event có ID trong localStorage
 *   - Khi gỡ sự kiện → xóa ID khỏi localStorage và cập nhật trạng thái backend
 *
 * Luồng tạo sự kiện:
 *   1. Nếu chọn "tạo địa điểm mới" → POST /api/ttb/admin/venues/add → lấy venueId
 *   2. POST /api/ttb/admin/events/add?venueId=X → lấy eventId
 *   3. Với mỗi hạng vé → POST /api/ttb/admin/ticket-types/add?eventId=X
 *   4. Lưu eventId vào localStorage → hiển thị sự kiện vừa đăng
 * ============================================================================
 */

// ============================================================================
// 0. HELPERS QUẢN LÝ DANH SÁCH EVENT IDS THEO USER (localStorage)
// ============================================================================

/**
 * Lấy userId hiện tại từ localStorage (dùng để phân biệt user)
 */
function getCurrentUserId() {
    try {
        const raw = localStorage.getItem('currentUser');
        if (!raw) return 'guest';
        const user = JSON.parse(raw);
        return String(user.userId || user.id || user.email || 'guest');
    } catch {
        return 'guest';
    }
}

/**
 * Lấy key localStorage riêng cho từng user
 */
function getMyEventStorageKey() {
    return `bdht_my_events_${getCurrentUserId()}`;
}

/**
 * Lấy danh sách ID sự kiện mà user này đã tạo
 * @returns {number[]}
 */
function getMyCreatedEventIds() {
    try {
        const raw = localStorage.getItem(getMyEventStorageKey());
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

/**
 * Lưu một eventId mới vào danh sách của user
 * @param {number} eventId
 */
function addMyCreatedEventId(eventId) {
    const ids = getMyCreatedEventIds();
    if (!ids.includes(eventId)) {
        ids.push(eventId);
        localStorage.setItem(getMyEventStorageKey(), JSON.stringify(ids));
    }
}

/**
 * Xóa một eventId khỏi danh sách của user (khi gỡ sự kiện)
 * @param {number} eventId
 */
function removeMyCreatedEventId(eventId) {
    const ids = getMyCreatedEventIds().filter(id => id !== eventId);
    localStorage.setItem(getMyEventStorageKey(), JSON.stringify(ids));
}

// ============================================================================
// 1. KHỞI TẠO TAB ĐĂNG BÁN VÉ
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupSellTab();
});

function setupSellTab() {
    // Nút sidebar "ĐĂNG BÁN VÉ"
    const menuBtn = document.getElementById('menu-btn-sell');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            loadAndRenderMyEvents();
        });
    }

    // Nút "Tạo Sự Kiện Mới" → hiển thị form
    const openFormBtn = document.getElementById('sell-open-form-btn');
    if (openFormBtn) {
        openFormBtn.addEventListener('click', () => {
            const wrapper = document.getElementById('sell-form-wrapper');
            if (wrapper) {
                wrapper.classList.remove('hidden');
                wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // Nút "Đóng" form
    const closeFormBtn = document.getElementById('sell-close-form-btn');
    if (closeFormBtn) {
        closeFormBtn.addEventListener('click', () => {
            const wrapper = document.getElementById('sell-form-wrapper');
            if (wrapper) wrapper.classList.add('hidden');
            resetSellForm();
        });
    }

    // Toggle chọn địa điểm có sẵn vs tạo mới
    setupVenueModeToggle();

    // Nút tải danh sách địa điểm
    const venueLoadBtn = document.getElementById('sell-venue-load-btn');
    if (venueLoadBtn) {
        venueLoadBtn.addEventListener('click', loadVenueOptions);
    }

    // Nút thêm hạng vé
    const addTicketTypeBtn = document.getElementById('sell-add-ticket-type-btn');
    if (addTicketTypeBtn) {
        addTicketTypeBtn.addEventListener('click', addTicketTypeRow);
    }

    // Xóa hàng vé (event delegation)
    const container = document.getElementById('sell-ticket-types-container');
    if (container) {
        container.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.sell-remove-ticket-row');
            if (!removeBtn) return;
            const row = removeBtn.closest('.sell-ticket-type-row');
            const allRows = container.querySelectorAll('.sell-ticket-type-row');
            if (allRows.length > 1) {
                row.remove();
            } else {
                showFormMessage('Phải có ít nhất 1 hạng vé!', 'error');
            }
        });
    }

    // Submit form
    const sellForm = document.getElementById('sell-event-form');
    if (sellForm) {
        sellForm.addEventListener('submit', handleSellFormSubmit);
    }

    // Toggle tạo danh mục mới
    const categorySelect = document.getElementById('sell-category');
    const categoryNewWrapper = document.getElementById('sell-category-new-wrapper');
    const categoryNewInput = document.getElementById('sell-category-new-input');
    const categoryNewHint = document.getElementById('sell-category-new-hint');
    const categoryNewCancel = document.getElementById('sell-category-new-cancel');

    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            if (categorySelect.value === '__new__') {
                categoryNewWrapper?.classList.remove('hidden');
                categoryNewHint?.classList.remove('hidden');
                categoryNewInput?.focus();
            } else {
                categoryNewWrapper?.classList.add('hidden');
                categoryNewHint?.classList.add('hidden');
            }
        });
    }

    if (categoryNewCancel) {
        categoryNewCancel.addEventListener('click', () => {
            if (categorySelect) categorySelect.value = '';
            categoryNewWrapper?.classList.add('hidden');
            categoryNewHint?.classList.add('hidden');
            if (categoryNewInput) categoryNewInput.value = '';
        });
    }
}

// ============================================================================
// 2. TOGGLE CHẾ ĐỘ ĐỊA ĐIỂM
// ============================================================================

function setupVenueModeToggle() {
    const modeExisting = document.getElementById('venue-mode-existing');
    const modeNew      = document.getElementById('venue-mode-new');
    const panelExisting = document.getElementById('venue-existing-panel');
    const panelNew      = document.getElementById('venue-new-panel');

    if (!modeExisting || !modeNew) return;

    const toggle = () => {
        const isNew = modeNew.checked;
        if (panelExisting) panelExisting.classList.toggle('hidden', isNew);
        if (panelNew)      panelNew.classList.toggle('hidden', !isNew);
    };

    modeExisting.addEventListener('change', toggle);
    modeNew.addEventListener('change', toggle);
}

// ============================================================================
// 3. TẢI DANH SÁCH ĐỊA ĐIỂM
// ============================================================================

async function loadVenueOptions() {
    const btn         = document.getElementById('sell-venue-load-btn');
    const searchInput = document.getElementById('sell-venue-search');
    const select      = document.getElementById('sell-venue-select');
    if (!select) return;

    const keyword = searchInput ? searchInput.value.trim() : '';

    if (btn) { btn.textContent = 'Đang tải...'; btn.disabled = true; }

    try {
        const url = keyword
            ? `/api/ttb/admin/venues?keyword=${encodeURIComponent(keyword)}`
            : '/api/ttb/admin/venues';

        const res = await fetch(`http://localhost:8080${url}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const venues = await res.json();

        select.innerHTML = '';
        if (!venues || venues.length === 0) {
            select.innerHTML = '<option value="" disabled>Không tìm thấy địa điểm — hãy tạo mới!</option>';
        } else {
            venues.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.venueId;
                opt.textContent = `${v.venueName} — ${v.address} (${(v.capacity || 0).toLocaleString('vi-VN')} người)`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Lỗi tải địa điểm:', err);
        select.innerHTML = '<option value="" disabled>Lỗi kết nối — vui lòng thử lại</option>';
    } finally {
        if (btn) { btn.textContent = 'Tải danh sách'; btn.disabled = false; }
    }
}

// ============================================================================
// 4. THÊM HÀNG LOẠI VÉ ĐỘNG
// ============================================================================

function addTicketTypeRow() {
    const container = document.getElementById('sell-ticket-types-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'sell-ticket-type-row grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end bg-orange-50/50 border border-orange-100 rounded-xl p-3';
    row.innerHTML = `
        <div class="flex flex-col gap-1.5">
            <label class="text-slate-500 text-[10px] uppercase tracking-wide">Tên hạng vé</label>
            <input type="text" name="tt-name" placeholder="VD: VIP, Standard..." required
                class="px-3 py-2 border border-gray-200 rounded-lg font-semibold focus:border-orange-400 outline-none bg-white text-xs transition" />
        </div>
        <div class="flex flex-col gap-1.5">
            <label class="text-slate-500 text-[10px] uppercase tracking-wide">Giá vé (VNĐ)</label>
            <input type="number" name="tt-price" placeholder="VD: 500000" min="0" required
                class="px-3 py-2 border border-gray-200 rounded-lg font-semibold focus:border-orange-400 outline-none bg-white text-xs transition" />
        </div>
        <div class="flex flex-col gap-1.5">
            <label class="text-slate-500 text-[10px] uppercase tracking-wide">Số lượng</label>
            <input type="number" name="tt-quantity" placeholder="VD: 100" min="1" required
                class="px-3 py-2 border border-gray-200 rounded-lg font-semibold focus:border-orange-400 outline-none bg-white text-xs transition" />
        </div>
        <button type="button" class="sell-remove-ticket-row pb-1 text-slate-300 hover:text-red-400 transition text-base" title="Xóa hạng vé">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;
    container.appendChild(row);
    row.querySelector('input[name="tt-name"]')?.focus();
}

// ============================================================================
// 5. XỬ LÝ SUBMIT — LUỒNG TẠO SỰ KIỆN + LOẠI VÉ
// ============================================================================

async function handleSellFormSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('sell-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    }
    hideFormMessage();

    try {
        // ─── BƯỚC 1: XÁC ĐỊNH venueId ───────────────────────────────────────
        let venueId = null;
        const isNewVenue = document.getElementById('venue-mode-new')?.checked;

        if (isNewVenue) {
            const venueName     = document.getElementById('sell-new-venue-name')?.value.trim();
            const venueAddress  = document.getElementById('sell-new-venue-address')?.value.trim();
            const venueCapacity = parseInt(document.getElementById('sell-new-venue-capacity')?.value) || 1000;

            if (!venueName || !venueAddress) {
                showFormMessage('Vui lòng nhập đầy đủ thông tin địa điểm mới!', 'error');
                return;
            }

            const venueRes = await fetch('http://localhost:8080/api/ttb/admin/venues/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ venueName, address: venueAddress, capacity: venueCapacity })
            });
            if (!venueRes.ok) {
                const err = await venueRes.json().catch(() => ({}));
                throw new Error(err.message || 'Không thể tạo địa điểm mới!');
            }
            const newVenue = await venueRes.json();
            venueId = newVenue.venueId;

        } else {
            const select = document.getElementById('sell-venue-select');
            venueId = select ? parseInt(select.value) : null;
            if (!venueId || isNaN(venueId)) {
                showFormMessage('Vui lòng chọn một địa điểm tổ chức (nhấn "Tải danh sách" rồi chọn)!', 'error');
                return;
            }
        }

        // ─── BƯỚC 2: VALIDATE & TẠO SỰ KIỆN ────────────────────────────────
        const title       = document.getElementById('sell-title')?.value.trim();
        const categorySelect = document.getElementById('sell-category');
        const categoryNewInput = document.getElementById('sell-category-new-input');
        const category    = (categorySelect?.value === '__new__')
            ? (categoryNewInput?.value.trim() || '')
            : (categorySelect?.value || '');
        const artist      = document.getElementById('sell-artist')?.value.trim() || '';
        const banner      = document.getElementById('sell-banner')?.value.trim() || '';
        const startTime   = document.getElementById('sell-start-time')?.value;
        const endTime     = document.getElementById('sell-end-time')?.value;
        const description = document.getElementById('sell-description')?.value.trim();

        if (!title || !category || !startTime || !endTime || !description) {
            showFormMessage('Vui lòng điền đầy đủ các trường bắt buộc (*)', 'error');
            return;
        }
        if (new Date(startTime) >= new Date(endTime)) {
            showFormMessage('Ngày kết thúc phải sau ngày bắt đầu!', 'error');
            return;
        }

        const eventRes = await fetch(
            `http://localhost:8080/api/ttb/admin/events/add?venueId=${venueId}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    categoryName: category,
                    artistNames: artist,
                    bannerImageUrl: banner,
                    description,
                    startTime,
                    endTime,
                    status: 'PUBLISHED'
                })
            }
        );
        if (!eventRes.ok) {
            const err = await eventRes.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tạo sự kiện!');
        }
        const newEvent = await eventRes.json();
        const eventId  = newEvent.eventId || newEvent.id;
        if (!eventId) throw new Error('Không lấy được ID sự kiện vừa tạo!');

        // ─── BƯỚC 3: THÊM LOẠI VÉ ───────────────────────────────────────────
        const ticketRows = document.querySelectorAll('.sell-ticket-type-row');
        const ticketPromises = [];

        for (const row of ticketRows) {
            const ttName  = row.querySelector('input[name="tt-name"]')?.value.trim();
            const ttPrice = parseFloat(row.querySelector('input[name="tt-price"]')?.value) || 0;
            const ttQty   = parseInt(row.querySelector('input[name="tt-quantity"]')?.value) || 0;
            if (!ttName || ttQty < 1) continue;

            ticketPromises.push(
                fetch(`http://localhost:8080/api/ttb/admin/ticket-types/add?eventId=${eventId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ typeName: ttName, price: ttPrice, totalQuantity: ttQty, soldQuantity: 0 })
                })
            );
        }
        await Promise.allSettled(ticketPromises);

        // ─── BƯỚC 4: LƯU eventId VÀO localStorage (CHỈ SỰ KIỆN CỦA USER NÀY) ─
        addMyCreatedEventId(eventId);

        // ─── THÀNH CÔNG ──────────────────────────────────────────────────────
        showFormMessage(
            `🎉 Sự kiện "${title}" đã được đăng bán thành công! Người dùng khác có thể tìm thấy và mua vé ngay.`,
            'success'
        );

        setTimeout(async () => {
            resetSellForm();
            document.getElementById('sell-form-wrapper')?.classList.add('hidden');
            await loadAndRenderMyEvents();
        }, 2500);

    } catch (err) {
        console.error('Lỗi khi đăng sự kiện:', err);
        showFormMessage(`❌ Lỗi: ${err.message || 'Không thể kết nối tới server. Vui lòng thử lại!'}`, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Đăng Bán Ngay!';
        }
    }
}

// ============================================================================
// 6. TẢI & RENDER "SỰ KIỆN CỦA TÔI" — CHỈ SỰ KIỆN USER NÀY TẠO
// ============================================================================

async function loadAndRenderMyEvents() {
    const list = document.getElementById('sell-my-events-list');
    if (!list) return;

    // Lấy danh sách ID mà chính user này đã tạo
    const myIds = getMyCreatedEventIds();

    // Không có ID nào → user chưa tạo sự kiện nào
    if (myIds.length === 0) {
        renderEmptyState(list);
        return;
    }

    list.innerHTML = `
        <div class="col-span-full flex items-center justify-center py-10 gap-3 text-slate-400">
            <i class="fas fa-spinner fa-spin text-lg"></i>
            <span class="text-xs font-bold">Đang tải sự kiện của bạn...</span>
        </div>
    `;

    try {
        // Fetch từng event theo ID — chỉ những sự kiện user này tạo
        const fetchResults = await Promise.allSettled(
            myIds.map(id =>
                fetch(`http://localhost:8080/api/vtd/public/events/${id}`)
                    .then(r => r.ok ? r.json() : null)
            )
        );

        // Lọc lấy kết quả thành công và còn PUBLISHED
        const myEvents = fetchResults
            .filter(r => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value)
            .filter(e => e && (e.status === 'PUBLISHED' || !e.status) && !e.deletedAt);

        if (myEvents.length === 0) {
            // Có thể các sự kiện đã bị xóa/cancelled → dọn localStorage
            myIds.forEach(id => removeMyCreatedEventId(id));
            renderEmptyState(list);
            return;
        }

        list.innerHTML = myEvents.map(event => renderMyEventCard(event)).join('');

        // Gắn sự kiện cho nút "Gỡ xuống"
        list.querySelectorAll('.sell-remove-event-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const eventId    = parseInt(btn.dataset.eventId);
                const eventTitle = btn.dataset.eventTitle;
                if (confirm(`Bạn có chắc muốn gỡ sự kiện "${eventTitle}" khỏi trang bán không?`)) {
                    await removeMyEvent(eventId);
                }
            });
        });

    } catch (err) {
        console.error('Lỗi tải sự kiện:', err);
        list.innerHTML = `
            <div class="col-span-full bg-red-50 rounded-2xl border border-red-100 py-8 flex flex-col items-center justify-center gap-3 text-center">
                <i class="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
                <p class="text-xs font-extrabold text-red-500">Không thể tải danh sách sự kiện</p>
                <p class="text-[10px] text-red-400">Kiểm tra lại kết nối với server backend</p>
            </div>
        `;
    }
}

/**
 * Render trạng thái rỗng khi user chưa đăng sự kiện nào
 */
function renderEmptyState(list) {
    list.innerHTML = `
        <div class="col-span-full bg-white rounded-2xl border border-dashed border-gray-200 py-14 flex flex-col items-center justify-center gap-3 text-center">
            <div class="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-400 text-3xl">
                <i class="fas fa-calendar-plus"></i>
            </div>
            <p class="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Bạn chưa đăng sự kiện nào</p>
            <p class="text-[10px] text-slate-400 font-medium">Nhấn "Tạo Sự Kiện Mới" để bắt đầu đăng bán vé của bạn</p>
        </div>
    `;
}

// ============================================================================
// 7. RENDER CARD MỖI SỰ KIỆN
// ============================================================================

function renderMyEventCard(event) {
    const startDate = event.startTime
        ? new Date(event.startTime).toLocaleString('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
          })
        : 'Chưa xác định';

    const venueName    = event.venue?.venueName || 'Chưa cập nhật';
    const venueAddress = event.venue?.address   || '';
    const bannerUrl    = event.bannerImageUrl    || '';
    const category     = event.categoryName     || 'Sự kiện';

    const categoryColors = {
        'Âm nhạc':    'bg-purple-100 text-purple-600',
        'Hội thảo':   'bg-blue-100 text-blue-600',
        'Thể thao':   'bg-green-100 text-green-600',
        'Nghệ thuật': 'bg-pink-100 text-pink-600',
        'Giải trí':   'bg-yellow-100 text-yellow-600',
    };
    const catClass = categoryColors[category] || 'bg-slate-100 text-slate-600';

    // Kiểm tra sự kiện còn bán không (chưa qua ngày kết thúc)
    const isOngoing = !event.endTime || new Date(event.endTime) > new Date();
    const statusBadge = isOngoing
        ? `<span class="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">● Đang bán</span>`
        : `<span class="absolute top-3 right-3 bg-slate-400 text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">Đã kết thúc</span>`;

    return `
        <div class="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
            <!-- Banner ảnh -->
            <div class="relative h-36 bg-gradient-to-br from-orange-100 to-orange-50 overflow-hidden flex-shrink-0">
                ${bannerUrl
                    ? `<img src="${bannerUrl}" alt="${event.title}" class="w-full h-full object-cover"
                           onerror="this.style.display='none'" />`
                    : `<div class="w-full h-full flex items-center justify-center text-orange-300 text-4xl">
                           <i class="fas fa-image"></i>
                       </div>`
                }
                <span class="absolute top-3 left-3 ${catClass} text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                    ${category}
                </span>
                ${statusBadge}
            </div>

            <!-- Thông tin sự kiện -->
            <div class="p-4 flex-1 flex flex-col gap-3">
                <h4 class="text-xs font-extrabold text-slate-900 leading-snug line-clamp-2">${event.title}</h4>

                <div class="flex flex-col gap-1.5 text-[10px] font-semibold text-slate-400">
                    <span class="flex items-center gap-1.5">
                        <i class="fas fa-calendar-alt text-orange-400 w-3.5"></i>
                        ${startDate}
                    </span>
                    <span class="flex items-center gap-1.5">
                        <i class="fas fa-map-marker-alt text-orange-400 w-3.5"></i>
                        ${venueName}${venueAddress ? ` — ${venueAddress}` : ''}
                    </span>
                </div>

                <!-- Tình trạng bán vé thực tế động -->
                ${(() => {
                    if (!event.ticketTypes || !Array.isArray(event.ticketTypes) || event.ticketTypes.length === 0) return '';
                    return `
                        <div class="bg-slate-50 border border-gray-150 rounded-xl p-2.5 flex flex-col gap-2 text-[9px] mt-1">
                            <div class="font-extrabold text-slate-900 uppercase tracking-wide border-b border-gray-200 pb-1 flex items-center justify-between">
                                <span>📊 Báo cáo bán vé</span>
                                <span class="text-[8px] font-semibold text-slate-400">Tỷ lệ</span>
                            </div>
                            <div class="flex flex-col gap-2">
                                ${event.ticketTypes.map(tt => {
                                    const total = tt.totalQuantity || 0;
                                    const sold = tt.soldQuantity || 0;
                                    const isSoldOut = sold >= total;
                                    const percent = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
                                    
                                    return `
                                        <div class="flex flex-col gap-1">
                                            <div class="flex items-center justify-between font-extrabold text-slate-700">
                                                <span class="truncate pr-1">${tt.typeName} (${Number(tt.price).toLocaleString('vi-VN')} đ)</span>
                                                <span class="${isSoldOut ? 'text-red-500 font-black' : 'text-slate-900'} font-black text-right flex-shrink-0">
                                                    ${isSoldOut ? '🔥 HẾT VÉ' : `${sold}/${total}`}
                                                </span>
                                            </div>
                                            <div class="w-full bg-slate-200 rounded-full h-1 overflow-hidden relative">
                                                <div class="bg-gradient-to-r ${isSoldOut ? 'from-red-500 to-rose-600' : 'from-theme-brandOrange to-orange-400'} h-full rounded-full transition-all" style="width: ${percent}%"></div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                })()}

                <!-- Nút hành động -->
                <div class="mt-auto pt-3 border-t border-gray-50 flex items-center gap-2">
                    <a href="../user/nat-event-detail.html?id=${event.eventId}"
                        target="_blank"
                        class="flex-1 text-center text-[10px] font-extrabold text-theme-brandBlue border border-theme-brandBlue hover:bg-theme-brandBlue hover:text-white px-3 py-2 rounded-lg transition uppercase tracking-wider">
                        <i class="fas fa-eye mr-1"></i>Xem trang
                    </a>
                    <button type="button"
                        class="sell-remove-event-btn flex-1 text-[10px] font-extrabold text-red-500 border border-red-200 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition uppercase tracking-wider"
                        data-event-id="${event.eventId}"
                        data-event-title="${event.title}">
                        <i class="fas fa-eye-slash mr-1"></i>Gỡ xuống
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// 8. GỠ SỰ KIỆN KHỎI TRANG BÁN
// ============================================================================

async function removeMyEvent(eventId) {
    const btn = document.querySelector(`.sell-remove-event-btn[data-event-id="${eventId}"]`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    try {
        // Gỡ sự kiện: dùng DELETE (xóa mềm - backend set deletedAt)
        const res = await fetch(
            `http://localhost:8080/api/ttb/admin/events/delete/${eventId}`,
            { method: 'DELETE' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Xóa khỏi localStorage của user này
        removeMyCreatedEventId(eventId);

        // Reload danh sách
        await loadAndRenderMyEvents();

    } catch (err) {
        console.error('Lỗi khi gỡ sự kiện:', err);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-eye-slash mr-1"></i>Gỡ xuống';
        }
        alert('Không thể gỡ sự kiện. Vui lòng thử lại!');
    }
}

// ============================================================================
// 9. HIỂN THỊ THÔNG BÁO FORM
// ============================================================================

function showFormMessage(msg, type = 'success') {
    const el = document.getElementById('sell-form-msg');
    if (!el) return;

    el.className = 'mb-4 px-4 py-3 rounded-xl text-xs font-bold border ' + (
        type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
    );
    el.textContent = msg;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideFormMessage() {
    const el = document.getElementById('sell-form-msg');
    if (el) el.className = 'hidden';
}

// ============================================================================
// 10. RESET FORM
// ============================================================================

function resetSellForm() {
    document.getElementById('sell-event-form')?.reset();

    // Về chế độ "địa điểm có sẵn"
    const modeExisting = document.getElementById('venue-mode-existing');
    if (modeExisting) modeExisting.checked = true;
    document.getElementById('venue-existing-panel')?.classList.remove('hidden');
    document.getElementById('venue-new-panel')?.classList.add('hidden');

    // Chỉ giữ 1 hàng vé
    const container = document.getElementById('sell-ticket-types-container');
    if (container) {
        const rows = container.querySelectorAll('.sell-ticket-type-row');
        for (let i = 1; i < rows.length; i++) rows[i].remove();
        container.querySelector('.sell-ticket-type-row')
            ?.querySelectorAll('input')
            .forEach(inp => inp.value = '');
    }

    hideFormMessage();
}