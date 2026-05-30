/**
 * JavaScript logic for Users Management
 * BDHT Admin Portal
 */

let allUsers = [];
let currentPage = 1;
const pageSize = 10;
let usersToDisplay = [];

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

    // Tải tài nguyên ban đầu
    loadUsers();

    // Lắng nghe sự kiện ô tìm kiếm nhanh
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    }

    // Lắng nghe thay đổi bộ lọc phân quyền & trạng thái
    document.getElementById('roleFilter').addEventListener('change', loadFilteredUsers);
    document.getElementById('statusFilter').addEventListener('change', loadFilteredUsers);

    // Lắng nghe submit form tạo người dùng
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', handleCreateUserSubmit);
    }
});

// ==========================================
// 1. TẢI DỮ LIỆU NGƯỜI DÙNG (USERS)
// ==========================================
async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    try {
        const users = await window.apiClient.get('/api/lpth/admin/users');
        if (users) {
            allUsers = users;
            renderUsersTable(users);
        }
    } catch (err) {
        console.error('Lỗi tải danh sách người dùng:', err);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-rose-500 font-bold">
                        <i class="fa-solid fa-circle-exclamation text-xl mb-2 block"></i>
                        Không thể kết nối đến máy chủ để lấy thông tin thành viên.
                    </td>
                </tr>
            `;
        }
    }
}

function renderUsersTable(users) {
    usersToDisplay = users || [];

    const totalPages = Math.ceil(usersToDisplay.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * pageSize;
    const paginatedUsers = usersToDisplay.slice(startIdx, startIdx + pageSize);

    const tableBody = document.getElementById('usersTableBody');
    const userCountText = document.getElementById('userCountText');
    if (!tableBody) return;

    if (userCountText) {
        userCountText.textContent = usersToDisplay.length;
    }

    if (!usersToDisplay || usersToDisplay.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-400">
                    <i class="fa-solid fa-users-slash text-3xl mb-2 block"></i>
                    Không tìm thấy thành viên nào phù hợp bộ lọc.
                </td>
            </tr>
        `;
        const paginationContainer = document.getElementById('adminPaginationBar');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    tableBody.innerHTML = '';
    paginatedUsers.forEach(u => {
        // Phân quyền badge
        let roleBadge = '';
        if (u.role === 'ADMIN' || u.role === 'ROLE_ADMIN') {
            roleBadge = '<span class="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-100 flex items-center gap-1 w-fit"><i class="fa-solid fa-shield-halved text-[10px]"></i> ADMIN</span>';
        } else {
            roleBadge = '<span class="bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg text-xs font-bold border border-gray-150 flex items-center gap-1 w-fit"><i class="fa-solid fa-user text-[10px]"></i> USER</span>';
        }

        // Trạng thái badge
        let statusBadge = '';
        if (u.isActive) {
            statusBadge = '<span class="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md text-xs font-bold border border-emerald-100 flex items-center gap-1 w-fit"><i class="fa-solid fa-circle-check"></i> Hoạt động</span>';
        } else {
            statusBadge = '<span class="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md text-xs font-bold border border-rose-100 flex items-center gap-1 w-fit"><i class="fa-solid fa-ban"></i> Đang Khóa</span>';
        }

        // Nút khóa/mở khóa nhanh
        let toggleBlockBtn = '';
        if (u.isActive) {
            toggleBlockBtn = `
                <button onclick="blockUser(${u.userId})" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold border border-rose-100 transition flex items-center gap-1" title="Khóa tài khoản">
                    <i class="fa-solid fa-user-lock"></i> Khóa
                </button>
            `;
        } else {
            toggleBlockBtn = `
                <button onclick="unblockUser(${u.userId})" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100 transition flex items-center gap-1" title="Mở khóa tài khoản">
                    <i class="fa-solid fa-user-shield"></i> Mở Khóa
                </button>
            `;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition duration-150 font-semibold';
        tr.innerHTML = `
            <td class="px-6 py-4 text-gray-400 font-bold">#${u.userId}</td>
            <td class="px-6 py-4 text-gray-900 font-bold">${u.fullName}</td>
            <td class="px-6 py-4 text-gray-500 font-medium">${u.email}</td>
            <td class="px-6 py-4 text-gray-500 font-medium">${u.phoneNumber || 'N/A'}</td>
            <td class="px-6 py-4">${roleBadge}</td>
            <td class="px-6 py-4">${statusBadge}</td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                    ${toggleBlockBtn}
                    <!-- Nút xóa -->
                    <button onclick="deleteUser(${u.userId})" class="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-gray-400 hover:text-rose-600 transition" title="Xóa tài khoản vĩnh viễn">
                        <i class="fa-solid fa-trash-can text-sm"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    renderPaginationControls(usersToDisplay.length, () => renderUsersTable(usersToDisplay));
}

function renderPaginationControls(totalItems, onPageChange) {
    const table = document.querySelector('table');
    if (!table) return;

    let paginationContainer = document.getElementById('adminPaginationBar');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'adminPaginationBar';
        paginationContainer.className = 'bg-white border-t border-gray-250 px-6 py-4 flex items-center justify-between mt-0';
        
        const tableContainer = table.parentElement;
        tableContainer.appendChild(paginationContainer);
    }

    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, totalItems);

    paginationContainer.innerHTML = `
        <div class="text-xs text-gray-500 font-semibold">
            Hiển thị từ <span class="text-slate-800 font-extrabold">${startIdx}</span> đến <span class="text-slate-800 font-extrabold">${endIdx}</span> trong tổng số <span class="text-indigo-600 font-extrabold">${totalItems}</span> mục
        </div>
        <div class="flex items-center gap-2">
            <button type="button" id="adminBtnPrev" ${currentPage === 1 ? 'disabled' : ''} class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg text-xs font-bold border border-gray-200 transition">
                <i class="fa-solid fa-chevron-left mr-1"></i> Trước
            </button>
            <span class="text-xs font-bold text-gray-700 mx-2">Trang ${currentPage} / ${totalPages}</span>
            <button type="button" id="adminBtnNext" ${currentPage === totalPages ? 'disabled' : ''} class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg text-xs font-bold border border-gray-200 transition">
                Sau <i class="fa-solid fa-chevron-right ml-1"></i>
            </button>
        </div>
    `;

    document.getElementById('adminBtnPrev')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            onPageChange();
        }
    });

    document.getElementById('adminBtnNext')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            onPageChange();
        }
    });
}

// ==========================================
// 2. TÌM KIẾM & BỘ LỌC DỮ LIỆU
// ==========================================
async function handleSearchInput(e) {
    currentPage = 1;
    const val = e.target.value.trim();
    if (!val) {
        loadFilteredUsers(); // Nạp theo lọc hiện hành
        return;
    }

    try {
        const results = await window.apiClient.get(`/api/lpth/admin/users?keyword=${encodeURIComponent(val)}`);
        if (results) {
            renderUsersTable(results);
        }
    } catch (err) {
        console.error('Lỗi tìm kiếm:', err);
    }
}

async function loadFilteredUsers() {
    currentPage = 1;
    const role = document.getElementById('roleFilter').value;
    const isActive = document.getElementById('statusFilter').value;

    let query = [];
    if (role) query.push(`role=${role}`);
    if (isActive !== '') query.push(`isActive=${isActive}`);

    const queryString = query.length > 0 ? `?${query.join('&')}` : '';

    try {
        const filtered = await window.apiClient.get(`/api/lpth/admin/users${queryString}`);
        if (filtered) {
            renderUsersTable(filtered);
        }
    } catch (err) {
        console.error('Lỗi lọc người dùng:', err);
    }
}

// ==========================================
// 3. KHÓA / MỞ KHÓA / XÓA NGƯỜI DÙNG
// ==========================================
async function blockUser(id) {
    if (confirm('🔒 Bạn chắc chắn muốn KHÓA tài khoản người dùng này? Người dùng sẽ không thể đăng nhập hoặc thanh toán vé.')) {
        try {
            await window.apiClient.put(`/api/lpth/admin/users/block/${id}`);
            alert('🔒 Đã khóa tài khoản thành viên thành công.');
            loadFilteredUsers();
        } catch (err) {
            console.error('Lỗi khóa user:', err);
            alert(`❌ Không thể khóa: ${err.message}`);
        }
    }
}

async function unblockUser(id) {
    try {
        await window.apiClient.put(`/api/lpth/admin/users/unblock/${id}`);
        alert('🔓 Đã mở khóa tài khoản thành viên thành công.');
        loadFilteredUsers();
    } catch (err) {
        console.error('Lỗi mở khóa user:', err);
        alert(`❌ Không thể mở khóa: ${err.message}`);
    }
}

async function deleteUser(id) {
    if (confirm('⚠️ CẢNH BÁO: Bạn thực sự muốn XÓA VĨNH VIỄN tài khoản người dùng này khỏi cơ sở dữ liệu? Hành động này không thể hoàn tác!')) {
        try {
            await window.apiClient.delete(`/api/lpth/admin/users/delete/${id}`);
            alert('🗑️ Xóa người dùng vĩnh viễn thành công!');
            loadFilteredUsers();
        } catch (err) {
            console.error('Lỗi xóa user:', err);
            alert(`❌ Không thể xóa tài khoản: ${err.message}`);
        }
    }
}

// ==========================================
// 4. TẠO MỚI NGƯỜI DÙNG (POST)
// ==========================================
function openCreateUserModal() {
    document.getElementById('userForm').reset();
    document.getElementById('userModal').classList.remove('hidden');
}

function closeCreateUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

async function handleCreateUserSubmit(e) {
    e.preventDefault();

    const payload = {
        fullName: document.getElementById('fullNameInput').value.trim(),
        email: document.getElementById('emailInput').value.trim(),
        passwordHash: document.getElementById('passwordInput').value, // Sẽ được Backend mã hóa
        phoneNumber: document.getElementById('phoneNumberInput').value.trim(),
        role: document.getElementById('roleInput').value,
        isActive: document.getElementById('isActiveInput').value === 'true'
    };

    try {
        await window.apiClient.post('/api/lpth/admin/users/add', payload);
        alert('🎉 Đã khởi tạo và đăng ký tài khoản thành viên thành công!');
        closeCreateUserModal();
        loadFilteredUsers(); // Tải lại bảng dữ liệu
    } catch (err) {
        console.error('Lỗi tạo tài khoản mới:', err);
        alert(`❌ Có lỗi xảy ra: ${err.message || 'Không thể tạo tài khoản.'}`);
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
