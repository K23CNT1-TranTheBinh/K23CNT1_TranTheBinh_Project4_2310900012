/**
 * JavaScript logic for Venues Management
 * BDHT Admin Portal
 */

let allVenues = [];
let activeVenueId = null; // null tức là đang Tạo mới, có ID là đang Sửa

document.addEventListener('DOMContentLoaded', () => {
    // Tải thông tin người dùng từ LocalStorage lên Header
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
        try {
            const user = JSON.parse(currentUserStr);
            document.getElementById('admin-display-name').innerText = user.fullName || 'Admin BDHT';
            document.getElementById('admin-avatar-char').innerText = (user.fullName || 'A').charAt(0).toUpperCase();
        } catch(e) {}
    }

    // Tải danh sách địa điểm
    loadVenues();

    // Lắng nghe sự kiện tìm kiếm nhanh keyword
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    }
});

// ==========================================
// 1. TẢI DANH SÁCH ĐỊA ĐIỂM (VENUES)
// ==========================================
async function loadVenues() {
    const tableBody = document.getElementById('venuesTableBody');
    try {
        const venues = await window.apiClient.get('/api/admin/venues');
        if (venues) {
            allVenues = venues;
            renderVenuesTable(venues);
        }
    } catch (err) {
        console.error('Lỗi tải danh sách địa điểm:', err);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-rose-500 font-bold">
                        <i class="fa-solid fa-circle-exclamation text-xl mb-2 block"></i>
                        Không thể kết nối đến máy chủ để lấy thông tin địa điểm. Vui lòng kiểm tra backend!
                    </td>
                </tr>
            `;
        }
    }
}

function renderVenuesTable(venues) {
    const tableBody = document.getElementById('venuesTableBody');
    if (!tableBody) return;

    if (!venues || venues.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-400">
                    <i class="fa-solid fa-map-location-dot text-3xl mb-2 block"></i>
                    Không tìm thấy địa điểm nào phù hợp.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = '';
    venues.forEach(v => {
        const id = v.venueId;
        const name = v.venueName;
        const address = v.address;
        
        // Format sức chứa
        const capacityStr = new Intl.NumberFormat('vi-VN').format(v.capacity || 0);

        // Định dạng thời gian đăng ký
        const dateOpt = { year: 'numeric', month: '2-digit', day: '2-digit' };
        const createdAtStr = v.createdAt ? new Date(v.createdAt).toLocaleDateString('vi-VN', dateOpt) : 'N/A';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition duration-150 font-semibold';
        tr.innerHTML = `
            <td class="px-6 py-4 text-gray-400 font-bold">#${id}</td>
            <td class="px-6 py-4 text-gray-900 font-bold">${name}</td>
            <td class="px-6 py-4 text-gray-500 font-medium">
                <i class="fa-solid fa-location-dot text-indigo-500 text-xs mr-1"></i> ${address}
            </td>
            <td class="px-6 py-4">
                <span class="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-xl text-xs font-black tracking-wide">
                    ${capacityStr} chỗ ngồi
                </span>
            </td>
            <td class="px-6 py-4 text-xs font-semibold text-gray-500">${createdAtStr}</td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="openEditModal(${id})" class="p-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg text-indigo-600 text-xs font-bold transition flex items-center justify-center w-8 h-8">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteVenueSubmit(${id})" class="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold transition flex items-center justify-center w-8 h-8">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// ==========================================
// 2. BỘ LỌC TÌM KIẾM DỮ LIỆU
// ==========================================
function handleSearchInput(e) {
    const kw = e.target.value.trim().toLowerCase();
    if (!kw) {
        renderVenuesTable(allVenues);
        return;
    }
    const filtered = allVenues.filter(v => 
        v.venueName.toLowerCase().includes(kw) || v.address.toLowerCase().includes(kw)
    );
    renderVenuesTable(filtered);
}

// ==========================================
// 3. THAO TÁC THÊM MỚI / CHỈNH SỬA / XÓA
// ==========================================
function openCreateModal() {
    activeVenueId = null;
    document.getElementById('modalTitle').innerText = 'Thêm Địa Điểm Tổ Chức';
    document.getElementById('venueForm').reset();
    document.getElementById('venueModal').classList.remove('hidden');
}

function openEditModal(id) {
    activeVenueId = id;
    document.getElementById('modalTitle').innerText = 'Chỉnh Sửa Địa Điểm';
    document.getElementById('venueForm').reset();
    
    const venue = allVenues.find(v => v.venueId === id);
    if (venue) {
        document.getElementById('venueName').value = venue.venueName;
        document.getElementById('venueAddress').value = venue.address;
        document.getElementById('venueCapacity').value = venue.capacity;
    }
    
    document.getElementById('venueModal').classList.remove('hidden');
}

function closeVenueModal() {
    document.getElementById('venueModal').classList.add('hidden');
    activeVenueId = null;
}

// Submit Form
async function handleFormSubmit(e) {
    e.preventDefault();

    const venueName = document.getElementById('venueName').value.trim();
    const address = document.getElementById('venueAddress').value.trim();
    const capacity = parseInt(document.getElementById('venueCapacity').value);

    if (!venueName || !address || isNaN(capacity) || capacity <= 0) {
        alert('❌ Vui lòng nhập đầy đủ các thông tin địa điểm hợp lệ!');
        return;
    }

    const payload = {
        venueName,
        address,
        capacity
    };

    try {
        if (activeVenueId === null) {
            // Thêm mới
            await window.apiClient.post('/api/admin/venues/add', payload);
            alert('🎉 Đăng ký địa điểm mới thành công!');
        } else {
            // Chỉnh sửa
            await window.apiClient.put(`/api/admin/venues/update/${activeVenueId}`, payload);
            alert('🎉 Đã cập nhật thông tin địa điểm thành công!');
        }
        
        closeVenueModal();
        loadVenues();
    } catch(err) {
        console.error('Lỗi khi gửi form địa điểm:', err);
        alert(`❌ Thao tác thất bại: ${err.message || 'Lỗi kết nối máy chủ.'}`);
    }
}

// Xóa địa điểm
async function deleteVenueSubmit(id) {
    const v = allVenues.find(item => item.venueId === id);
    const vName = v ? v.venueName : 'địa điểm này';
    
    if (confirm(`⚠️ Bạn thực sự muốn XÓA địa điểm "${vName}"? Điều này có thể ảnh hưởng đến các sự kiện đang được tổ chức tại đây.`)) {
        try {
            await window.apiClient.delete(`/api/admin/venues/delete/${id}`);
            alert('🗑️ Đã xóa địa điểm thành công!');
            loadVenues();
        } catch(err) {
            console.error('Lỗi xóa địa điểm:', err);
            alert(`❌ Không thể xóa địa điểm: ${err.message || 'Có sự kiện liên kết đang diễn ra.'}`);
        }
    }
}

// Debounce helper
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
