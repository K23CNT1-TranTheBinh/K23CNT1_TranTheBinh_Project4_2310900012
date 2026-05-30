/**
 * JavaScript logic for Events & Ticket Types Management
 * BDHT Admin Portal
 */

let allEvents = [];
let allVenues = [];

document.addEventListener('DOMContentLoaded', () => {
    // Tải thông tin người dùng từ LocalStorage lên Header
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
        try {
            const user = JSON.parse(currentUserStr);
            document.getElementById('admin-display-name').innerText = user.fullName || 'Admin BDHT';
            document.getElementById('admin-avatar-char').innerText = (user.fullName || 'A').charAt(0).toUpperCase();
        } catch (e) { }
    }

    // Tải tài nguyên
    loadVenues();
    loadEvents();

    // Thiết lập sự kiện ô tìm kiếm
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            renderEventsTable(allEvents.filter(ev =>
                (ev.title || '').toLowerCase().includes(val) ||
                (ev.artistNames || '').toLowerCase().includes(val)
            ));
        });
    }

    // Sự kiện submit form sự kiện
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventSubmit);
    }

    // Sự kiện submit form Hạng vé
    const ticketTypeForm = document.getElementById('ticketTypeForm');
    if (ticketTypeForm) {
        ticketTypeForm.addEventListener('submit', handleTicketTypeSubmit);
    }
    loadCategories();
});

// ==========================================
// 1. TẢI DỮ LIỆU ĐỊA ĐIỂM (VENUES)
// ==========================================
async function loadVenues() {
    try {
        const venues = await window.apiClient.get('/api/lpth/venues');
        if (venues) {
            allVenues = venues;
            const select = document.getElementById('venueInput');
            if (select) {
                select.innerHTML = '<option value="">-- Chọn địa điểm --</option>';
                venues.forEach(v => {
                    select.innerHTML += `<option value="${v.venueId}">${v.venueName} (Sức chứa: ${v.capacity} người)</option>`;
                });
            }
        }
    } catch (err) {
        console.error('Lỗi khi tải danh sách địa điểm:', err);
        const select = document.getElementById('venueInput');
        if (select) {
            select.innerHTML = '<option value="">Lỗi tải danh sách địa điểm</option>';
        }
    }
}

async function loadEvents() {
    const tableBody = document.getElementById('eventsTableBody');
    try {
        const events = await window.apiClient.get('/api/ttb/events');
        if (events) {
            allEvents = events.filter(e => e.deletedAt === null);
            renderEventsTable(allEvents);
        }
    } catch (err) {
        console.error('Lỗi tải danh sách sự kiện:', err);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-rose-500 font-bold">
                        <i class="fa-solid fa-circle-exclamation text-xl mb-2 block"></i>
                        Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend!
                    </td>
                </tr>
            `;
        }
    }
}

function renderEventsTable(events) {
    const tableBody = document.getElementById('eventsTableBody');
    if (!tableBody) return;

    if (!events || events.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-400">
                    <i class="fa-solid fa-box-open text-3xl mb-2 block"></i>
                    Không có sự kiện nào được tìm thấy.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = '';
    events.forEach(e => {
        // --- ĐÃ SỬA LẠI LOGIC HIỂN THỊ ẢNH Ở ĐÂY ---
        let imageElement = '';
        if (e.bannerImageUrl && e.bannerImageUrl.trim() !== '') {
            let imageUrl = e.bannerImageUrl.trim();
            
            // XỬ LÝ ĐƯỜNG DẪN: Ghép domain của Backend nếu ảnh dùng đường dẫn tương đối
            if (!imageUrl.startsWith('http')) {
                if (!imageUrl.startsWith('/')) {
                    imageUrl = '/' + imageUrl;
                }
                imageUrl = 'http://localhost:8080' + imageUrl;
            }

            // Có URL ảnh: Hiển thị ảnh thực tế với imageUrl đã xử lý
            imageElement = `<img src="${imageUrl}" class="w-12 h-12 object-cover rounded-xl border border-gray-100 shadow-sm" onerror="this.outerHTML='<div class=\\'w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm\\'><i class=\\'fa-regular fa-image\\'></i></div>'">`;
        } else {
            // Không có URL ảnh (sự kiện mới thêm): Hiển thị ô vuông xám mặc định
            imageElement = `
                <div class="w-12 h-12 flex-shrink-0 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                    <i class="fa-regular fa-image text-lg"></i>
                </div>
            `;
        }

        const dateOpt = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        const startTimeStr = e.startTime ? new Date(e.startTime).toLocaleDateString('vi-VN', dateOpt) : 'Chưa định cấu hình';

        let statusBadge = '';
        if (e.status === 'PUBLISHED') {
            statusBadge = '<span class="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1 w-fit"><i class="fa-solid fa-circle text-[6px]"></i> Mở bán</span>';
        } else if (e.status === 'DRAFT') {
            statusBadge = '<span class="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg text-xs font-bold border border-gray-200 flex items-center gap-1 w-fit"><i class="fa-solid fa-circle text-[6px]"></i> Bản nháp</span>';
        } else {
            statusBadge = '<span class="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-rose-100 flex items-center gap-1 w-fit"><i class="fa-solid fa-circle text-[6px]"></i> Đã hủy</span>';
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition duration-150';
        tr.innerHTML = `
            <td class="px-6 py-4.5">
                <div class="flex items-center gap-3">
                    ${imageElement}
                    <div>
                        <div class="font-bold text-gray-900 leading-snug">${e.title}</div>
                        <div class="text-xs text-gray-400 font-medium mt-0.5">ID: ${e.eventId}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4.5 text-gray-500 font-semibold">${e.artistNames || 'N/A'}</td>
            <td class="px-6 py-4.5 font-bold"><span class="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-xs">${e.categoryName || 'Sự kiện'}</span></td>
            <td class="px-6 py-4.5 text-gray-500 font-semibold">${e.venue ? e.venue.venueName : 'Chưa định cấu hình'}</td>
            <td class="px-6 py-4.5 text-xs font-semibold text-gray-500">${startTimeStr}</td>
            <td class="px-6 py-4.5">${statusBadge}</td>
            <td class="px-6 py-4.5">
                <div class="flex items-center justify-center gap-2">
                    <!-- Nút quản lý vé -->
                    <button onclick="openTicketsModal(${e.eventId}, '${e.title.replace(/'/g, "\\'")}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 transition flex items-center gap-1">
                        <i class="fa-solid fa-ticket-simple"></i> Cấu hình vé
                    </button>
                    
                

                    <!-- Nút sửa -->
                    <button onclick="openEditModal(${e.eventId})" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition" title="Sửa sự kiện">
                        <i class="fa-solid fa-pen text-sm"></i>
                    </button>
                    <!-- Nút xóa -->
                    <button onclick="deleteEvent(${e.eventId})" class="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-gray-400 hover:text-rose-600 transition" title="Xóa sự kiện">
                        <i class="fa-solid fa-trash-can text-sm"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function openCreateModal() {
    document.getElementById('modalTitle').innerText = 'Thêm Sự Kiện Mới';
    document.getElementById('eventForm').reset();
    document.getElementById('eventIdInput').value = '';

    document.getElementById('statusInput').value = 'DRAFT';

    document.getElementById('eventModal').classList.remove('hidden');
}

async function loadCategories() {
    try {
        const events = await window.apiClient.get('/api/ttb/events');

        if (!events) return;
        const categories = [...new Set(
            events
                .map(e => e.categoryName)
                .filter(c => c && c.trim() !== '')
        )];

        const select = document.getElementById('categoryInput');

        select.innerHTML = `
            <option value="">-- Chọn danh mục cũ --</option>
        `;

        categories.forEach(c => {
            select.innerHTML += `
                <option value="${c}">${c}</option>
            `;
        });

    } catch (err) {
        console.error('Lỗi tải danh mục:', err);
    }
}

function openEditModal(eventId) {
    const event = allEvents.find(e => e.eventId === eventId);
    if (!event) return;

    document.getElementById('modalTitle').innerText = 'Cập Nhật Sự Kiện';
    document.getElementById('eventIdInput').value = event.eventId;

    document.getElementById('titleInput').value = event.title || '';
    document.getElementById('artistInput').value = event.artistNames || '';
    document.getElementById('newCategoryInput').value = '';
    document.getElementById('categoryInput').value = event.categoryName || '';
    document.getElementById('venueInput').value = event.venue ? event.venue.venueId : '';
    
    // --- LƯU LINK ẢNH CŨ VÀ RESET Ô CHỌN FILE ---
    const oldUrlInput = document.getElementById('oldBannerUrlInput');
    if (oldUrlInput) oldUrlInput.value = event.bannerImageUrl || '';
    
    const fileInput = document.getElementById('bannerFileInput');
    if (fileInput) fileInput.value = ''; 

    document.getElementById('statusInput').value = event.status || 'DRAFT';
    document.getElementById('descriptionInput').value = event.description || '';

    if (event.startTime) {
        document.getElementById('startTimeInput').value = event.startTime.substring(0, 16);
    }
    if (event.endTime) {
        document.getElementById('endTimeInput').value = event.endTime.substring(0, 16);
    }

    document.getElementById('eventModal').classList.remove('hidden');
}

function closeEventModal() {
    document.getElementById('eventModal').classList.add('hidden');
}

async function handleEventSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('eventIdInput').value;
    const venueId = document.getElementById('venueInput').value;

    const newCategory = document.getElementById('newCategoryInput').value.trim();
    const selectedCategory = document.getElementById('categoryInput').value;
    const finalCategory = newCategory || selectedCategory;

    if (!finalCategory) {
        alert('Vui lòng nhập hoặc chọn danh mục!');
        return;
    }

    // --- BƯỚC 1: XỬ LÝ UPLOAD ẢNH (NẾU CÓ CHỌN FILE) ---
    // Mặc định lấy link ảnh cũ nếu đang sửa mà không tải file mới
    let finalBannerUrl = '';
    const oldUrlInput = document.getElementById('oldBannerUrlInput');
    if (oldUrlInput) {
        finalBannerUrl = oldUrlInput.value;
    }

    const fileInput = document.getElementById('bannerFileInput');
    if (fileInput && fileInput.files.length > 0) {
        try {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            const token = window.apiClient.getToken();
            const uploadRes = await fetch('http://localhost:8080/api/ttb/events/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // Bắt buộc không set Content-Type
                body: formData
            });

            if (!uploadRes.ok) {
                throw new Error('Lỗi khi tải ảnh lên máy chủ!');
            }
            
            const uploadData = await uploadRes.json();
            finalBannerUrl = uploadData.url; // Lấy URL do Backend trả về
        } catch (err) {
            alert('Lỗi upload ảnh: ' + err.message);
            return; // Dừng lại không lưu sự kiện nữa nếu ảnh lỗi
        }
    }

    // --- BƯỚC 2: GỬI JSON LÊN CONTROLLER JAVA CŨ CỦA BẠN ---
    const eventPayload = {
        title: document.getElementById('titleInput').value.trim(),
        artistNames: document.getElementById('artistInput').value.trim(),
        categoryName: finalCategory,
        bannerImageUrl: finalBannerUrl, // Đưa URL chữ vào JSON
        startTime: document.getElementById('startTimeInput').value,
        endTime: document.getElementById('endTimeInput').value,
        status: document.getElementById('statusInput').value,
        description: document.getElementById('descriptionInput').value.trim()
    };

    try {
        if (id) {
            await window.apiClient.put(`/api/ttb/events/update/${id}?venueId=${venueId}`, eventPayload);
            alert('🎉 Cập nhật thông tin sự kiện thành công!');
        } else {
            await window.apiClient.post(`/api/ttb/events/add?venueId=${venueId}`, eventPayload);
            alert('🎉 Tạo mới sự kiện thành công!');
        }

        closeEventModal();
        await loadEvents();
        await loadCategories();

    } catch (err) {
        console.error('Lỗi khi lưu sự kiện:', err);
        alert(`Có lỗi xảy ra: ${err.message || 'Không thể lưu thông tin.'}`);
    }
}
async function deleteEvent(id) {
    if (confirm('Bạn thực sự muốn xóa sự kiện này? Hành động này sẽ đánh dấu xóa và không hiển thị phía người dùng.')) {
        try {
            await window.apiClient.delete(`/api/ttb/events/delete/${id}`);
            alert('🗑️ Đã xóa sự kiện thành công!');
            loadEvents();
        } catch (err) {
            console.error('Lỗi khi xóa sự kiện:', err);
            alert(`Không thể xóa sự kiện: ${err.message}`);
        }
    }
}

let activeEventId = null;
let currentTicketTypes = [];

async function openTicketsModal(eventId, eventTitle) {
    activeEventId = eventId;
    document.getElementById('ticketsModalSubtitle').innerText = `Sự kiện: ${eventTitle}`;
    document.getElementById('ticketTypeEventId').value = eventId;

    resetTicketForm();
    await loadTicketTypes(eventId);

    document.getElementById('ticketsModal').classList.remove('hidden');
}

function closeTicketsModal() {
    document.getElementById('ticketsModal').classList.add('hidden');
    activeEventId = null;
}

async function loadTicketTypes(eventId) {
    const tbody = document.getElementById('ticketTypesTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="px-5 py-6 text-center text-gray-400">
                <i class="fa-solid fa-spinner animate-spin mr-1"></i> Đang tải danh sách hạng vé...
            </td>
        </tr>
    `;

    try {
        const list = await window.apiClient.get(`/api/ttb/ticket-types/event/${eventId}`);
        if (list) {
            currentTicketTypes = list;
            renderTicketTypesTable(list);
        }
    } catch (err) {
        console.error('Lỗi tải danh sách hạng vé:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-5 py-6 text-center text-rose-500 font-semibold">
                    Lỗi kết nối máy chủ! Không tải được hạng vé.
                </td>
            </tr>
        `;
    }
}

function renderTicketTypesTable(list) {
    const tbody = document.getElementById('ticketTypesTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-8 text-center text-gray-400">Không tìm thấy hạng vé.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    list.forEach(t => {
        // Kiểm tra log xem backend trả về tên trường là gì
        console.log("Dữ liệu một dòng vé:", t);

        // TỰ ĐỘNG TÌM ĐÚNG TÊN TRƯỜNG (Dù backend để tên thế nào cũng chạy)
        const typeName = t.typeName || t.g8_type_name || t.G8_type_name || "N/A";
        const price = t.price || t.g8_price || t.G8_price || 0;
        const totalQty = t.totalQuantity || t.g8_total_quantity || t.G8_total_quantity || 0;
        const soldQty = t.soldQuantity || t.g8_sold_quantity || t.G8_sold_quantity || 0;

        const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
        const rate = totalQty > 0 ? Math.round((soldQty * 100) / totalQty) : 0;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition font-semibold text-gray-700';
        tr.innerHTML = `
            <td class="px-5 py-4 font-bold text-gray-900">${typeName}</td>
            <td class="px-5 py-4 text-indigo-600">${formattedPrice}</td>
            <td class="px-5 py-4">${totalQty} vé</td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                    <div class="w-20 bg-gray-150 h-2 rounded-full overflow-hidden relative border border-gray-100">
                        <div class="bg-emerald-500 h-full rounded-full" style="width: ${Math.min(100, rate)}%"></div>
                    </div>
                    <span class="text-xs text-gray-500">${soldQty}/${totalQty} (${rate}%)</span>
                </div>
            </td>
            <td class="px-5 py-4 text-center">
                <button onclick="editTicketTypeLocal(${t.ticketTypeId || t.g8_ticket_type_id})" class="text-indigo-600 hover:text-indigo-800 mr-2"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteTicketType(${t.ticketTypeId || t.g8_ticket_type_id})" class="text-rose-600 hover:text-rose-800"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Sửa hạng vé (Nạp ngược lên Form phía trên)
function editTicketTypeLocal(id) {
    const type = currentTicketTypes.find(t => t.ticketTypeId === id);
    if (!type) return;

    document.getElementById('ticketTypeIdInput').value = type.ticketTypeId;
    document.getElementById('ticketTypeName').value = type.typeName || '';
    document.getElementById('ticketTypePrice').value = type.price || 0;
    document.getElementById('ticketTypeQty').value = type.totalQuantity || 1;

    // Cập nhật giao diện nút
    document.getElementById('btnSubmitTicket').innerText = 'Lưu thay đổi';
    document.getElementById('btnCancelTicketEdit').classList.remove('hidden');
}

function resetTicketForm() {
    document.getElementById('ticketTypeIdInput').value = '';
    document.getElementById('ticketTypeName').value = '';
    document.getElementById('ticketTypePrice').value = '';
    document.getElementById('ticketTypeQty').value = '';

    document.getElementById('btnSubmitTicket').innerText = 'Thêm hạng vé';
    document.getElementById('btnCancelTicketEdit').classList.add('hidden');
}

// Submit Thêm / Sửa Hạng vé
async function handleTicketTypeSubmit(e) {
    e.preventDefault();

    const eventId = activeEventId;
    const ticketTypeId = document.getElementById('ticketTypeIdInput').value;

    const payload = {
        typeName: document.getElementById('ticketTypeName').value.trim(),
        price: parseFloat(document.getElementById('ticketTypePrice').value),
        totalQuantity: parseInt(document.getElementById('ticketTypeQty').value)
    };

    try {
        if (ticketTypeId) {
            // Cập nhật hạng vé
            await window.apiClient.put(`/api/ttb/ticket-types/update/${ticketTypeId}`, payload);
            alert('🎉 Đã cập nhật hạng vé thành công!');
        } else {
            // Thêm mới hạng vé
            await window.apiClient.post(`/api/ttb/ticket-types/add?eventId=${eventId}`, payload);
            alert('🎉 Đã thêm hạng vé mới thành công!');
        }

        resetTicketForm();
        loadTicketTypes(eventId); // Reload bảng vé
    } catch (err) {
        console.error('Lỗi khi lưu hạng vé:', err);
        alert(`Có lỗi xảy ra: ${err.message || 'Không thể lưu hạng vé.'}`);
    }
}

// Xóa hạng vé
async function deleteTicketType(id) {
    if (confirm('Bạn thực sự muốn xóa hạng vé này? Hành động này có thể ảnh hưởng đến các đơn đặt chỗ chưa thanh toán!')) {
        try {
            await window.apiClient.delete(`/api/ttb/ticket-types/delete/${id}`);
            alert('🗑️ Đã xóa hạng vé thành công!');
            loadTicketTypes(activeEventId);
        } catch (err) {
            console.error('Lỗi xóa hạng vé:', err);
            alert(`Không thể xóa hạng vé: ${err.message}`);
        }
    }
}