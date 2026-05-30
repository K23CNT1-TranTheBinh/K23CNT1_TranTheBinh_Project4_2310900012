let allTickets = [];
let currentPage = 1;
const pageSize = 10;
let filteredTicketsList = [];

document.addEventListener('DOMContentLoaded', () => {

    const currentUserStr = localStorage.getItem('currentUser');

    if (currentUserStr) {
        try {
            const user = JSON.parse(currentUserStr);

            document.getElementById('admin-display-name').innerText =
                user.fullName || 'Admin';

            document.getElementById('admin-avatar-char').innerText =
                (user.fullName || 'A').charAt(0).toUpperCase();

        } catch (e) { }
    }

    loadTickets();

    // Lắng nghe cả hai ô tìm kiếm (headerSearchInput và mainSearchInput)
    const mainSearchInput = document.getElementById('mainSearchInput');
    const headerSearchInput = document.getElementById('searchInput');

    const handleSearch = debounce((e) => {
        // Đồng bộ giá trị của cả hai thanh tìm kiếm
        if (mainSearchInput && e.target !== mainSearchInput) mainSearchInput.value = e.target.value;
        if (headerSearchInput && e.target !== headerSearchInput) headerSearchInput.value = e.target.value;
        
        currentPage = 1;
        filterAndRenderTickets();
    }, 300);

    if (mainSearchInput) mainSearchInput.addEventListener('input', handleSearch);
    if (headerSearchInput) headerSearchInput.addEventListener('input', handleSearch);

    document.getElementById('statusFilter')
        .addEventListener('change', () => {
            currentPage = 1;
            filterAndRenderTickets();
        });
});

async function loadTickets() {
    const tableBody = document.getElementById('ticketsTableBody');
    try {
        const tickets =
            await window.apiClient.get('/api/ttb/admin/tickets/all');

        if (tickets) {
            allTickets = tickets;
            console.log(tickets);
            filterAndRenderTickets();
        }

    } catch (err) {
        console.error('Lỗi tải vé:', err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7"
                    class="px-6 py-8 text-center text-rose-500 font-bold">
                    <i class="fa-solid fa-circle-exclamation text-xl mb-2 block"></i>
                    Không thể tải danh sách vé điện tử.
                </td>
            </tr>
        `;
    }
}

function filterAndRenderTickets() {
    const mainSearchInput = document.getElementById('mainSearchInput');
    const headerSearchInput = document.getElementById('searchInput');
    const query = (mainSearchInput?.value || headerSearchInput?.value || '').trim().toLowerCase();
    
    const status = document.getElementById('statusFilter').value;

    filteredTicketsList = allTickets.filter(t => {
        // Lọc theo trạng thái
        if (status !== '' && String(t.checkInStatus) !== status) {
            return false;
        }

        // Lọc theo từ khóa (tên khách hàng hoặc mã QR)
        if (query) {
            const customerName = (t.order?.user?.fullName || '').toLowerCase();
            const qrCode = (t.qrCode || '').toLowerCase();
            return customerName.includes(query) || qrCode.includes(query);
        }

        return true;
    });

    const totalCount = filteredTicketsList.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    if (currentPage > totalPages) currentPage = 1;

    const startIdx = (currentPage - 1) * pageSize;
    const paginatedTickets = filteredTicketsList.slice(startIdx, startIdx + pageSize);

    renderTicketsTable(paginatedTickets, totalCount);
}

function renderTicketsTable(tickets, totalCount) {
    const tableBody = document.getElementById('ticketsTableBody');
    if (!tableBody) return;

    document.getElementById('ticketCountText').textContent = totalCount;

    if (!tickets || tickets.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7"
                    class="px-6 py-12 text-center text-gray-400">
                    <i class="fa-solid fa-ticket text-3xl mb-2 block"></i>
                    Không tìm thấy vé phù hợp.
                </td>
            </tr>
        `;
        const paginationContainer = document.getElementById('adminPaginationBar');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    tableBody.innerHTML = '';

    tickets.forEach(t => {
        const checkedInBadge = t.checkInStatus
            ? `
                <span class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1 w-fit">
                    <i class="fa-solid fa-circle-check"></i>
                    Đã Check-in
                </span>
            `
            : `
                <span class="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-xs font-bold border border-amber-100 flex items-center gap-1 w-fit">
                    <i class="fa-solid fa-clock"></i>
                    Chưa Check-in
                </span>
            `;

        const checkinBtn = !t.checkInStatus
            ? `
                <button
                    onclick="checkInNow('${t.qrCode}')"
                    class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100 transition flex items-center gap-1">
                    <i class="fa-solid fa-qrcode"></i>
                    Check-in
                </button>
            `
            : `
                <button
                    disabled
                    class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-xs font-bold border border-gray-200 cursor-not-allowed">
                    Đã sử dụng
                </button>
            `;

        const checkedTime = t.checkedInAt
            ? new Date(t.checkedInAt).toLocaleString('vi-VN')
            : '---';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition duration-150 font-semibold';
        tr.innerHTML = `
            <td class="px-6 py-4 text-gray-400 font-bold">
                #${t.ticketId}
            </td>
            <td class="px-6 py-4">
                <span class="font-mono text-indigo-600 text-xs bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                    ${t.qrCode}
                </span>
            </td>
            <td class="px-6 py-4 text-gray-900 font-bold">
                ${t.order?.user?.fullName || 'N/A'}
            </td>
            <td class="px-6 py-4 text-gray-500 font-medium">
                ${t.ticketType?.event?.title || 'N/A'}
            </td>
            <td class="px-6 py-4">
                ${checkedInBadge}
            </td>
            <td class="px-6 py-4 text-xs text-gray-500">
                ${checkedTime}
            </td>
            <td class="px-6 py-4">
                <div class="flex justify-center">
                    ${checkinBtn}
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    renderPaginationControls(totalCount, filterAndRenderTickets);
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

async function handleSearchInput(e) {
    // Không dùng nữa vì đã gộp vào filterAndRenderTickets
}

async function loadFilteredTickets() {
    // Tải lại toàn bộ dữ liệu từ backend để nhận trạng thái check-in mới nhất, sau đó hiển thị theo bộ lọc
    try {
        const tickets = await window.apiClient.get('/api/ttb/admin/tickets/all');
        if (tickets) {
            allTickets = tickets;
            filterAndRenderTickets();
        }
    } catch (err) {
        filterAndRenderTickets();
    }
}

function openCheckinModal() {
    document.getElementById('qrInput').value = '';
    document.getElementById('checkinResult').classList.add('hidden');
    document.getElementById('checkinModal').classList.remove('hidden');
}

function closeCheckinModal() {
    document.getElementById('checkinModal').classList.add('hidden');
}

async function checkInNow(qrCode) {
    if (!confirm('Xác nhận check-in vé này?')) return;
    try {
        await window.apiClient.post(
            `/api/ttb/admin/tickets/process-checkin/${qrCode}`
        );
        alert('Check-in vé thành công!');
        loadFilteredTickets();
    } catch (err) {
        alert(err.message || 'Check-in thất bại.');
    }
}

async function processCheckin(e) {
    e.preventDefault();
    const qrCode = document.getElementById('qrInput').value.trim();
    const resultBox = document.getElementById('checkinResult');

    try {
        const res = await window.apiClient.post(
            `/api/ttb/admin/tickets/process-checkin/${qrCode}`
        );

        resultBox.className =
            'rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700';

        resultBox.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-circle-check text-lg mt-0.5"></i>
                <div>
                    <p class="font-extrabold">${res.message}</p>
                    <p class="mt-1 text-xs">Vé đã được xác nhận vào cổng.</p>
                </div>
            </div>
        `;
        resultBox.classList.remove('hidden');
        loadFilteredTickets();

    } catch (err) {
        resultBox.className =
            'rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700';

        resultBox.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-circle-xmark text-lg mt-0.5"></i>
                <div>
                    <p class="font-extrabold">Check-in thất bại</p>
                    <p class="mt-1 text-xs">${err.message || 'QR Code không hợp lệ'}</p>
                </div>
            </div>
        `;
        resultBox.classList.remove('hidden');
    }
}

function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}