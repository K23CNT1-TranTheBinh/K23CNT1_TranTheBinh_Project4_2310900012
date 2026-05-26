let allTickets = [];

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

    const searchInput = document.getElementById('searchInput');

    if (searchInput) {
        searchInput.addEventListener(
            'input',
            debounce(handleSearchInput, 300)
        );
    }

    document.getElementById('statusFilter')
        .addEventListener('change', loadFilteredTickets);
});

async function loadTickets() {

    const tableBody = document.getElementById('ticketsTableBody');
    try {
        const tickets =
            await window.apiClient.get('/api/lpth/admin/tickets/all');

        if (tickets) {
            allTickets = tickets;
            console.log(tickets)
            renderTicketsTable(tickets);
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

function renderTicketsTable(tickets) {

    const tableBody = document.getElementById('ticketsTableBody');

    document.getElementById('ticketCountText').textContent =
        tickets.length;

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

        tr.className =
            'hover:bg-gray-50/50 transition duration-150 font-semibold';

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
}

async function handleSearchInput(e) {

    const qr = e.target.value.trim();

    if (!qr) {
        loadFilteredTickets();
        return;
    }

    try {

        const ticket =
            await window.apiClient.get(`/api/lpth/admin/tickets/qr/${qr}`);

        renderTicketsTable(ticket ? [ticket] : []);

    } catch (err) {

        renderTicketsTable([]);
    }
}

async function loadFilteredTickets() {

    const status =
        document.getElementById('statusFilter').value;

    try {

        if (status === '') {
            loadTickets();
            return;
        }

        const tickets =
            await window.apiClient.get(
                `/api/lpth/admin/tickets/status/${status}`
            );

        renderTicketsTable(tickets);

    } catch (err) {

        console.error('Lỗi lọc vé:', err);
    }
}

function openCheckinModal() {

    document.getElementById('qrInput').value = '';

    document.getElementById('checkinResult')
        .classList.add('hidden');

    document.getElementById('checkinModal')
        .classList.remove('hidden');
}

function closeCheckinModal() {

    document.getElementById('checkinModal')
        .classList.add('hidden');
}

async function checkInNow(qrCode) {

    if (!confirm('Xác nhận check-in vé này?')) return;

    try {

        await window.apiClient.post(
            `/api/lpth/admin/tickets/process-checkin/${qrCode}`
        );

        alert('Check-in vé thành công!');

        loadFilteredTickets();

    } catch (err) {

        alert(err.message || 'Check-in thất bại.');
    }
}

async function processCheckin(e) {

    e.preventDefault();

    const qrCode =
        document.getElementById('qrInput').value.trim();

    const resultBox =
        document.getElementById('checkinResult');

    try {

        const res =
            await window.apiClient.post(
                `/api/lpth/admin/tickets/process-checkin/${qrCode}`
            );

        resultBox.className =
            'rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700';

        resultBox.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-circle-check text-lg mt-0.5"></i>

                <div>
                    <p class="font-extrabold">
                        ${res.message}
                    </p>

                    <p class="mt-1 text-xs">
                        Vé đã được xác nhận vào cổng.
                    </p>
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
                    <p class="font-extrabold">
                        Check-in thất bại
                    </p>

                    <p class="mt-1 text-xs">
                        ${err.message || 'QR Code không hợp lệ'}
                    </p>
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

        timeout =
            setTimeout(() => func.apply(this, args), delay);
    };
}