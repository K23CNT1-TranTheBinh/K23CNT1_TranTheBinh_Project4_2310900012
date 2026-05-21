/**
 * JavaScript logic for Promotions Management
 * BDHT Admin Portal
 */

let allPromotions = [];
let activePromoId = null; // null tức là đang Tạo mới, có ID là đang Sửa

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

    // Tải tài nguyên mã giảm giá
    loadPromotions();

    // Lắng nghe sự kiện tìm kiếm nhanh keyword
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    }
});

// ==========================================
// 1. TẢI DANH SÁCH MÃ GIẢM GIÁ (PROMOTIONS)
// ==========================================
async function loadPromotions() {
    const tableBody = document.getElementById('promoTableBody');
    try {
        const promos = await window.apiClient.get('/api/admin/promotions');
        if (promos) {
            allPromotions = promos;
            renderPromoTable(promos);
        }
    } catch (err) {
        console.error('Lỗi tải danh sách mã giảm giá:', err);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-8 text-center text-rose-500 font-bold">
                        <i class="fa-solid fa-circle-exclamation text-xl mb-2 block"></i>
                        Không thể kết nối đến máy chủ để lấy thông tin khuyến mãi. Vui lòng kiểm tra backend!
                    </td>
                </tr>
            `;
        }
    }
}

function renderPromoTable(promos) {
    const tableBody = document.getElementById('promoTableBody');
    const promoCountText = document.getElementById('promoCountText');
    if (!tableBody) return;

    if (promoCountText) {
        promoCountText.textContent = promos.length;
    }

    if (!promos || promos.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-12 text-center text-gray-400">
                    <i class="fa-solid fa-tags text-3xl mb-2 block"></i>
                    Không tìm thấy mã giảm giá nào phù hợp với bộ lọc hiện hành.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = '';
    promos.forEach(p => {
        const promoId = p.promotionId;
        const discountTypeStr = p.discountType === 'PERCENT' ? 'Phần trăm (%)' : 'Cố định (đ)';
        
        // Format mức giảm giá
        let discountValueStr = '';
        if (p.discountType === 'PERCENT') {
            discountValueStr = `${p.discountValue}%`;
        } else {
            discountValueStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.discountValue || 0);
        }

        // Format đơn hàng tối thiểu
        const minOrderValueStr = p.minOrderValue 
            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.minOrderValue)
            : 'Không có';

        // Lượt dùng
        const usageLimitStr = p.usageLimit ? `${p.usageLimit} lần` : 'Vô hạn';
        const usedCountStr = p.usedCount || 0;

        // Định dạng thời gian hết hạn
        const dateOpt = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        const validToStr = p.validTo ? new Date(p.validTo).toLocaleDateString('vi-VN', dateOpt) : 'N/A';

        // Kiểm tra xem đã quá hạn chưa để hiển thị cảnh báo
        const isExpired = p.validTo ? new Date(p.validTo) < new Date() : false;

        // Switch nút Toggle Kích hoạt nhanh
        let toggleBtn = '';
        if (p.isActive) {
            toggleBtn = `
                <button onclick="togglePromoStatusSubmit(${promoId})" class="w-11 h-6 bg-emerald-500 rounded-full p-0.5 transition-colors relative flex items-center outline-none">
                    <span class="w-5 h-5 bg-white rounded-full shadow-md transform translate-x-5 transition-transform"></span>
                </button>
            `;
        } else {
            toggleBtn = `
                <button onclick="togglePromoStatusSubmit(${promoId})" class="w-11 h-6 bg-gray-200 rounded-full p-0.5 transition-colors relative flex items-center outline-none">
                    <span class="w-5 h-5 bg-white rounded-full shadow-md transform translate-x-0 transition-transform"></span>
                </button>
            `;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition duration-150 font-semibold';
        tr.innerHTML = `
            <td class="px-6 py-4">
                <span class="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase">
                    ${p.code}
                </span>
            </td>
            <td class="px-6 py-4 text-gray-500 font-medium">${discountTypeStr}</td>
            <td class="px-6 py-4 text-indigo-600 font-extrabold">${discountValueStr}</td>
            <td class="px-6 py-4 text-gray-600 font-semibold">${minOrderValueStr}</td>
            <td class="px-6 py-4 text-gray-500 text-xs font-bold">
                <span class="text-indigo-600 font-extrabold">${usedCountStr}</span> / ${usageLimitStr}
            </td>
            <td class="px-6 py-4 text-xs font-semibold ${isExpired ? 'text-rose-500 font-bold' : 'text-gray-500'}">
                ${validToStr} ${isExpired ? '<span class="text-[9px] bg-rose-50 border border-rose-100 text-rose-600 px-1 py-0.5 rounded font-black ml-1">QUÁ HẠN</span>' : ''}
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center">
                    ${toggleBtn}
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="openEditModal(${promoId})" class="p-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg text-indigo-600 text-xs font-bold transition flex items-center justify-center w-8 h-8">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// ==========================================
// 2. BỘ LỌC TÌM KIẾM DỮ LIỆU (FILTERS)
// ==========================================
async function handleSearchInput(e) {
    const keyword = e.target.value.trim();
    loadFilteredPromotions(keyword);
}

async function loadFilteredPromotions(keywordOverride = null) {
    const keyword = keywordOverride !== null ? keywordOverride : document.getElementById('searchInput').value.trim();
    const isActive = document.getElementById('statusFilter').value;

    let query = [];
    if (keyword) {
        query.push(`keyword=${keyword}`);
    }
    if (isActive) {
        query.push(`isActive=${isActive}`);
    }

    const queryString = query.length > 0 ? `?${query.join('&')}` : '';

    try {
        const filtered = await window.apiClient.get(`/api/admin/promotions${queryString}`);
        if (filtered) {
            renderPromoTable(filtered);
        }
    } catch (err) {
        console.error('Lỗi lọc danh sách mã giảm giá:', err);
    }
}

function resetFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('searchInput').value = '';
    loadPromotions();
}

// ==========================================
// 3. THAO TÁC THÊM MỚI / CHỈNH SỬA
// ==========================================
function adjustValuePlaceholder() {
    const type = document.getElementById('promoDiscountType').value;
    const valueInput = document.getElementById('promoDiscountValue');
    if (type === 'PERCENT') {
        valueInput.placeholder = 'Nhập phần trăm (ví dụ: 10)';
    } else {
        valueInput.placeholder = 'Nhập số tiền mặt (ví dụ: 100000)';
    }
}

function openCreateModal() {
    activePromoId = null;
    document.getElementById('modalTitle').innerText = 'Thêm Mã Giảm Giá Mới';
    document.getElementById('promoForm').reset();
    adjustValuePlaceholder();
    
    // Đặt hạn chót mặc định là cuối năm nay
    const nextYear = new Date();
    nextYear.setMonth(11);
    nextYear.setDate(31);
    nextYear.setHours(23, 59, 0, 0);
    // Chuyển sang định dạng yyyy-MM-ddThh:mm để điền datetime-local
    const formatted = nextYear.toISOString().slice(0, 16);
    document.getElementById('promoValidTo').value = formatted;

    document.getElementById('promoModal').classList.remove('hidden');
}

async function openEditModal(promoId) {
    activePromoId = promoId;
    document.getElementById('modalTitle').innerText = 'Chỉnh Sửa Mã Giảm Giá';
    document.getElementById('promoForm').reset();
    
    try {
        const promo = await window.apiClient.get(`/api/admin/promotions/${promoId}`);
        if (promo) {
            document.getElementById('promoCode').value = promo.code;
            document.getElementById('promoDiscountType').value = promo.discountType;
            document.getElementById('promoDiscountValue').value = promo.discountValue;
            document.getElementById('promoMinOrderValue').value = promo.minOrderValue || '';
            document.getElementById('promoUsageLimit').value = promo.usageLimit || '';
            
            // Format ngày để điền datetime-local
            if (promo.validTo) {
                const formatted = new Date(promo.validTo).toISOString().slice(0, 16);
                document.getElementById('promoValidTo').value = formatted;
            }
            adjustValuePlaceholder();
        }
    } catch(err) {
        console.error('Lỗi lấy chi tiết mã giảm giá:', err);
    }
    
    document.getElementById('promoModal').classList.remove('hidden');
}

function closePromoModal() {
    document.getElementById('promoModal').classList.add('hidden');
    activePromoId = null;
}

// Submit Form thêm / sửa
async function handleFormSubmit(e) {
    e.preventDefault();

    const code = document.getElementById('promoCode').value.trim().toUpperCase();
    const discountType = document.getElementById('promoDiscountType').value;
    const discountValue = parseFloat(document.getElementById('promoDiscountValue').value);
    
    const minOrderValStr = document.getElementById('promoMinOrderValue').value;
    const minOrderValue = minOrderValStr ? parseFloat(minOrderValStr) : null;
    
    const usageLimitStr = document.getElementById('promoUsageLimit').value;
    const usageLimit = usageLimitStr ? parseInt(usageLimitStr) : null;
    
    const validTo = document.getElementById('promoValidTo').value;

    // Validate nhanh dữ liệu
    if (!code || isNaN(discountValue) || discountValue <= 0) {
        alert('❌ Vui lòng nhập đầy đủ các thông tin hợp lệ!');
        return;
    }
    if (discountType === 'PERCENT' && discountValue > 100) {
        alert('❌ Mức giảm phần trăm không thể vượt quá 100%!');
        return;
    }

    const payload = {
        code,
        discountType,
        discountValue,
        minOrderValue,
        usageLimit,
        validTo
    };

    try {
        if (activePromoId === null) {
            // Thêm mới
            await window.apiClient.post('/api/admin/promotions/add', payload);
            alert('🎉 Đã tạo mã giảm giá mới thành công!');
        } else {
            // Chỉnh sửa
            await window.apiClient.put(`/api/admin/promotions/update/${activePromoId}`, payload);
            alert('🎉 Đã lưu cập nhật thông tin mã giảm giá thành công!');
        }
        
        closePromoModal();
        loadPromotions();
    } catch(err) {
        console.error('Lỗi khi gửi form khuyến mại:', err);
        alert(`❌ Thao tác thất bại: ${err.message || 'Mã code có thể đã bị trùng!'}`);
    }
}

// Bật/Tắt trạng thái hoạt động nhanh
async function togglePromoStatusSubmit(promoId) {
    try {
        await window.apiClient.patch(`/api/admin/promotions/toggle-status/${promoId}`);
        loadFilteredPromotions(); // Tải lại bảng ngay lập tức
    } catch(err) {
        console.error('Lỗi kích hoạt nhanh mã giảm giá:', err);
        alert(`❌ Lỗi bật/tắt mã giảm giá: ${err.message}`);
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
