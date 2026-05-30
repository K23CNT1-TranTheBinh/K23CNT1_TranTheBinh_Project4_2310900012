/**
 * =========================================================================
 * DỰ ÁN HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT - PHÂN HỆ KHÁCH HÀNG (MEMBER)
 * FILE: nat-ticket-qr.js
 * CHỨC NĂNG: Quản lý modal hiển thị Vé điện tử (E-ticket) & QR Code.
 *            Hỗ trợ tải xuống QR, in vé chuyên nghiệp, chọn vé khi đặt nhiều vé.
 *            BỔ SUNG: Cho phép người dùng Đăng Bán Lại (Resell) chính chiếc vé đã đặt!
 * =========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initQrModal();
});

// Đối tượng lưu trữ toàn cục danh sách vé đang hiển thị trong modal
let currentModalTickets = [];
let activeTicketIndex = 0;
let qrCodeInstance = null;

// Tên định danh riêng của từng user
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
 * Khởi tạo các sự kiện cho Modal QR
 */
function initQrModal() {
    const modalOverlay = document.getElementById('qr-modal-overlay');
    const closeBtn = document.getElementById('qr-modal-close');
    const downloadBtn = document.getElementById('qr-download-btn');
    const printBtn = document.getElementById('qr-print-btn');

    if (!modalOverlay) return;

    // Đóng modal khi bấm nút X
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideQrModal();
        });
    }

    // Đóng modal khi bấm ra vùng ngoài
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            hideQrModal();
        }
    });

    // Sự kiện tải xuống mã QR Code
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            downloadActiveTicketQr();
        });
    }

    // Sự kiện in vé điện tử
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            printActiveTicket();
        });
    }

    // Thiết lập các sự kiện cho panel Đăng bán lại
    setupResellActions();

    // Sử dụng event delegation để bắt các sự kiện click "Xem QR" từ bảng
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-view-qr');
        if (btn) {
            const orderId = parseInt(btn.dataset.orderId);
            if (orderId && !isNaN(orderId)) {
                openQrModalForOrder(orderId);
            }
        }
    });
}

/**
 * Thiết lập các sự kiện click phục vụ cho tính năng Đăng Bán Lại vé
 */
function setupResellActions() {
    const resellContainer = document.getElementById('qr-resell-container');
    const resellFormPanel = document.getElementById('qr-resell-form-panel');
    const cancelResellFormBtn = document.getElementById('qr-resell-cancel');
    const submitResellBtn = document.getElementById('qr-resell-submit');

    // Hủy bỏ nhập giá bán lại
    if (cancelResellFormBtn && resellFormPanel && resellContainer) {
        cancelResellFormBtn.addEventListener('click', () => {
            resellFormPanel.classList.add('hidden');
            resellFormPanel.classList.remove('flex');
            resellContainer.classList.remove('hidden');
        });
    }

    // Xác nhận đăng bán lại vé
    if (submitResellBtn) {
        submitResellBtn.addEventListener('click', async () => {
            await handleResellSubmit();
        });
    }

    // Bắt sự kiện click nút Đăng bán hoặc Hủy đăng bán (Event Delegation)
    if (resellContainer) {
        resellContainer.addEventListener('click', async (e) => {
            const resellBtn = e.target.closest('#qr-resell-btn');
            const cancelBtn = e.target.closest('#qr-cancel-resell-btn');

            if (resellBtn && resellFormPanel) {
                // Hiện form nhập giá
                resellContainer.classList.add('hidden');
                resellFormPanel.classList.remove('hidden');
                resellFormPanel.classList.add('flex');
                const priceInput = document.getElementById('qr-resell-price');
                if (priceInput) {
                    const ticket = currentModalTickets[activeTicketIndex];
                    // Gợi ý giá vé gốc làm mặc định
                    priceInput.value = ticket?.ticketType?.price || '';
                    priceInput.focus();
                }
            } else if (cancelBtn) {
                const resaleId = parseInt(cancelBtn.dataset.resaleId);
                if (resaleId && confirm('Bạn có chắc muốn hủy đăng bán lại chiếc vé này không?')) {
                    await handleCancelResell(resaleId);
                }
            }
        });
    }
}

/**
 * Hiển thị Modal QR và tải dữ liệu vé theo mã đơn hàng
 * @param {number} orderId 
 */
async function openQrModalForOrder(orderId) {
    const modalOverlay = document.getElementById('qr-modal-overlay');
    const loadingEl = document.getElementById('qr-loading');
    const canvasContainer = document.getElementById('qr-code-canvas');
    const ticketSelector = document.getElementById('qr-ticket-selector');
    const ticketTabs = document.getElementById('qr-ticket-tabs');
    const orderTitle = document.getElementById('qr-order-title');
    const orderDateEl = document.getElementById('qr-order-date');
    const ticketCodeEl = document.getElementById('qr-ticket-code');
    const badgeChecked = document.getElementById('qr-checked-badge');

    if (!modalOverlay) return;

    // Hiển thị modal ở chế độ tải dữ liệu
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('flex');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (badgeChecked) badgeChecked.classList.add('hidden');
    if (ticketSelector) ticketSelector.classList.add('hidden');
    if (ticketCodeEl) ticketCodeEl.innerText = '---';
    if (orderTitle) orderTitle.innerText = `Đơn hàng #BDHT${orderId}`;

    // Ẩn panel bán lại khi bắt đầu
    const resellFormPanel = document.getElementById('qr-resell-form-panel');
    if (resellFormPanel) {
        resellFormPanel.classList.add('hidden');
        resellFormPanel.classList.remove('flex');
    }

    // Xóa QR cũ nếu có
    clearQrCanvas();

    try {
        // Tải danh sách vé của người dùng từ API
        const response = await window.apiClient.get('/api/vtd/member/my-tickets');
        const tickets = Array.isArray(response) ? response : (response?.content || []);
        
        // Lọc lấy các vé thuộc đơn hàng được chọn
        currentModalTickets = tickets.filter(t => t.order && t.order.orderId === orderId);

        if (currentModalTickets.length === 0) {
            // Không tìm thấy vé, hiển thị thông báo lỗi
            if (loadingEl) loadingEl.classList.add('hidden');
            if (canvasContainer) {
                canvasContainer.innerHTML = `
                    <div class="text-center text-red-500 font-extrabold text-[10px] p-2 flex flex-col items-center gap-2">
                        <i class="fas fa-exclamation-circle text-2xl"></i>
                        <span>Chưa tạo được vé cho đơn hàng này. Vui lòng liên hệ hỗ trợ!</span>
                    </div>
                `;
            }
            return;
        }

        // Cập nhật thông tin ngày đặt
        const firstTicket = currentModalTickets[0];
        if (firstTicket.order && orderDateEl) {
            const dateVal = firstTicket.order.createdAt || firstTicket.order.orderDate;
            const dateStr = dateVal ? new Date(dateVal).toLocaleString('vi-VN') : 'Chưa rõ';
            orderDateEl.innerHTML = `📅 Đặt ngày: ${dateStr}`;
        }

        // Thiết lập bộ chọn vé (nếu có nhiều hơn 1 vé)
        if (ticketSelector && ticketTabs) {
            if (currentModalTickets.length > 1) {
                ticketSelector.classList.remove('hidden');
                ticketTabs.innerHTML = currentModalTickets.map((t, idx) => {
                    const typeName = t.ticketType?.typeName || 'Hạng vé';
                    return `
                        <button type="button" 
                            class="qr-tab-btn px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition border text-slate-500 border-slate-200 bg-slate-50 hover:bg-slate-100"
                            data-index="${idx}">
                            Vé ${idx + 1} (${typeName})
                        </button>
                    `;
                }).join('');

                // Gắn sự kiện chuyển đổi vé
                ticketTabs.querySelectorAll('.qr-tab-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const index = parseInt(btn.dataset.index);
                        switchActiveTicket(index);
                    });
                });
            } else {
                ticketSelector.classList.add('hidden');
            }
        }

        // Mở hiển thị vé đầu tiên
        await switchActiveTicket(0);

    } catch (err) {
        console.error('Lỗi khi tải mã QR đơn hàng:', err);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (canvasContainer) {
            canvasContainer.innerHTML = `
                <div class="text-center text-red-500 font-extrabold text-[10px] p-2 flex flex-col items-center gap-2">
                    <i class="fas fa-wifi text-2xl"></i>
                    <span>Lỗi kết nối tới hệ thống vé. Vui lòng thử lại!</span>
                </div>
            `;
        }
    }
}

/**
 * Chuyển đổi hiển thị vé đang xem trong modal
 * @param {number} index 
 */
async function switchActiveTicket(index) {
    if (index < 0 || index >= currentModalTickets.length) return;
    
    activeTicketIndex = index;
    const ticket = currentModalTickets[index];
    const canvasContainer = document.getElementById('qr-code-canvas');
    const loadingEl = document.getElementById('qr-loading');
    const ticketCodeEl = document.getElementById('qr-ticket-code');
    const badgeChecked = document.getElementById('qr-checked-badge');
    const resellContainer = document.getElementById('qr-resell-container');
    const resellFormPanel = document.getElementById('qr-resell-form-panel');

    // Cập nhật tab active styles nếu có nhiều vé
    const tabs = document.querySelectorAll('.qr-tab-btn');
    tabs.forEach((tab, idx) => {
        if (idx === index) {
            tab.className = "qr-tab-btn px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition border border-theme-brandOrange bg-orange-500 text-white shadow-sm shadow-orange-500/25";
        } else {
            tab.className = "qr-tab-btn px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition border text-slate-500 border-slate-200 bg-slate-50 hover:bg-slate-100";
        }
    });

    // Ẩn form bán lại, hiện nút bấm chính
    if (resellFormPanel) {
        resellFormPanel.classList.add('hidden');
        resellFormPanel.classList.remove('flex');
    }
    if (resellContainer) resellContainer.classList.remove('hidden');

    // Ẩn spinner
    if (loadingEl) loadingEl.classList.add('hidden');

    // Cập nhật mã code và trạng thái check-in
    if (ticketCodeEl) ticketCodeEl.innerText = ticket.qrCode || 'N/A';
    if (badgeChecked) {
        if (ticket.checkInStatus === true || ticket.checkInStatus === 'true') {
            badgeChecked.classList.remove('hidden');
        } else {
            badgeChecked.classList.add('hidden');
        }
    }

    // Xóa canvas cũ
    clearQrCanvas();

    // Sinh QR Code mới từ thư viện QRCodeJS
    if (canvasContainer && ticket.qrCode) {
        qrCodeInstance = new QRCode(canvasContainer, {
            text: ticket.qrCode,
            width: 176,
            height: 176,
            colorDark: "#0f172a", // Màu đen phiến đá trầm slate-900 sang trọng
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // --- XỬ LÝ TRẠNG THÁI ĐĂNG BÁN LẠI (DỰA TRÊN TICKET TYPE BACKEND) ---
    await updateResellStatusUI(ticket);
}

/**
 * Tra cứu trạng thái Đăng Bán Lại thực tế của vé từ Backend
 * @param {object} ticket 
 */
async function updateResellStatusUI(ticket) {
    const resellContainer = document.getElementById('qr-resell-container');
    const downloadBtn = document.getElementById('qr-download-btn');
    const printBtn = document.getElementById('qr-print-btn');
    if (!resellContainer) return;

    // Reset lại trạng thái các nút tải và in vé
    if (downloadBtn) downloadBtn.style.display = '';
    if (printBtn) printBtn.style.display = '';

    const eventId = ticket.ticketType?.event?.eventId;
    if (!eventId) return;

    try {
        // Tải danh sách tất cả các hạng vé của sự kiện này từ Backend để đối chiếu
        const ticketTypes = await window.apiClient.get(`/api/ttb/admin/ticket-types/event/${eventId}`);

        // Tìm hạng vé có định dạng tên: "[Resale] {Tên gốc} (#{Mã vé})"
        const expectedName = `[Resale] ${ticket.ticketType.typeName} (#${ticket.ticketId})`;
        const resaleType = ticketTypes.find(tt => tt.typeName === expectedName);

        if (resaleType) {
            const isSold = (resaleType.soldQuantity || 0) >= 1;
            if (isSold) {
                // ĐÃ BÁN LẠI THÀNH CÔNG cho người khác!
                resellContainer.innerHTML = `
                    <div class="w-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-black text-center py-3.5 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 animate-pulse">
                        <i class="fas fa-check-circle"></i> Vé này đã được bán lại thành công!
                    </div>
                `;
                // Ẩn quyền xem QR và In vé vì quyền sở hữu đã chuyển giao!
                if (downloadBtn) downloadBtn.style.display = 'none';
                if (printBtn) printBtn.style.display = 'none';
                
                // Hiển thị thông điệp khóa vé ở giữa thay cho QR
                const canvasContainer = document.getElementById('qr-code-canvas');
                if (canvasContainer) {
                    canvasContainer.innerHTML = `
                        <div class="text-center text-slate-400 font-extrabold text-[10px] p-2 flex flex-col items-center justify-center h-full gap-2">
                            <i class="fas fa-lock text-3xl text-slate-350"></i>
                            <span>Vé đã được bán lại. QR code đã bị khóa bảo mật.</span>
                        </div>
                    `;
                }
            } else {
                // ĐANG RAO BÁN TRÊN WEB
                resellContainer.innerHTML = `
                    <div class="flex flex-col gap-2.5 w-full">
                        <div class="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black text-center py-2.5 rounded-xl flex items-center justify-center gap-1.5 uppercase tracking-wide">
                            <i class="fas fa-spinner fa-spin text-xs"></i> Đang đăng bán lại: ${Number(resaleType.price).toLocaleString('vi-VN')} đ
                        </div>
                        <button id="qr-cancel-resell-btn" type="button" 
                            class="w-full bg-slate-650 hover:bg-slate-700 text-white font-extrabold text-[11px] py-3 rounded-xl transition hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5 uppercase tracking-wider" 
                            data-resale-id="${resaleType.ticketTypeId}">
                            <i class="fas fa-times-circle"></i> Hủy đăng bán lại
                        </button>
                    </div>
                `;
            }
        } else {
            // VÉ BÌNH THƯỜNG - CHO PHÉP ĐĂNG BÁN LẠI
            resellContainer.innerHTML = `
                <button id="qr-resell-btn" type="button"
                    class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-black text-xs py-3.5 rounded-xl transition shadow-lg shadow-rose-500/25 hover:scale-[1.02] active:scale-[0.98]">
                    <i class="fas fa-tags text-xs"></i> Đăng bán lại vé này
                </button>
            `;
        }
    } catch (err) {
        console.error('Lỗi khi tải trạng thái bán lại của vé:', err);
    }
}

/**
 * Xử lý sự kiện đăng bán lại chiếc vé đang xem lên sàn
 */
async function handleResellSubmit() {
    const ticket = currentModalTickets[activeTicketIndex];
    if (!ticket) return;

    const priceInput = document.getElementById('qr-resell-price');
    const resellPrice = parseFloat(priceInput?.value) || 0;

    if (resellPrice <= 0 || isNaN(resellPrice)) {
        alert('⚠️ Vui lòng nhập giá bán lại hợp lệ lớn hơn 0đ!');
        return;
    }

    const eventId = ticket.ticketType?.event?.eventId;
    if (!eventId) return;

    const submitBtn = document.getElementById('qr-resell-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng...';
    }

    try {
        // Tạo một hạng vé "Resale" mới trực thuộc EventId này thông qua Admin Endpoint
        const expectedName = `[Resale] ${ticket.ticketType.typeName} (#${ticket.ticketId})`;
        const payload = {
            typeName: expectedName,
            price: resellPrice,
            totalQuantity: 1, // Chỉ bán duy nhất 1 vé của chính mình
            soldQuantity: 0
        };

        await window.apiClient.post(`/api/ttb/admin/ticket-types/add?eventId=${eventId}`, payload);

        alert(`🎉 Chúc mừng! Vé của bạn đã được đăng bán lại thành công lên trang chủ với giá ${resellPrice.toLocaleString('vi-VN')} đ.`);
        
        // Reload lại giao diện chiếc vé hiện tại
        await switchActiveTicket(activeTicketIndex);
    } catch (err) {
        console.error('Lỗi khi đăng bán lại vé:', err);
        alert('❌ Đăng bán lại thất bại. Vui lòng kết nối máy chủ!');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Xác nhận bán';
        }
    }
}

/**
 * Xử lý hủy đăng bán lại vé
 * @param {number} resaleId 
 */
async function handleCancelResell(resaleId) {
    try {
        await window.apiClient.delete(`/api/ttb/admin/ticket-types/delete/${resaleId}`);

        alert('✅ Đã gỡ vé khỏi trạng thái rao bán lại thành công!');
        
        // Reload lại giao diện chiếc vé hiện tại
        await switchActiveTicket(activeTicketIndex);
    } catch (err) {
        console.error('Lỗi hủy đăng bán lại:', err);
        alert('❌ Không thể hủy đăng bán lại. Vui lòng thử lại sau!');
    }
}

/**
 * Dọn sạch canvas vẽ QR
 */
function clearQrCanvas() {
    const canvasContainer = document.getElementById('qr-code-canvas');
    if (!canvasContainer) return;
    
    // Giữ lại spinner tải
    const loadingHtml = `
        <div id="qr-loading" class="flex flex-col items-center gap-2 text-slate-300 hidden">
            <i class="fas fa-spinner fa-spin text-3xl"></i>
            <span class="text-[10px] font-bold">Đang tạo QR...</span>
        </div>
    `;
    canvasContainer.innerHTML = loadingHtml;
}

/**
 * Ẩn Modal QR
 */
function hideQrModal() {
    const modalOverlay = document.getElementById('qr-modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('flex');
        modalOverlay.classList.add('hidden');
    }
    currentModalTickets = [];
    activeTicketIndex = 0;
    clearQrCanvas();
    
    // Đồng bộ lại bảng số liệu Dashboard ngoài màn hình
    if (typeof loadDashboardMetrics === 'function') {
        loadDashboardMetrics();
    }
}

/**
 * Tải xuống ảnh mã QR Code của vé đang hoạt động
 */
function downloadActiveTicketQr() {
    if (currentModalTickets.length === 0) return;
    const ticket = currentModalTickets[activeTicketIndex];
    if (!ticket || !ticket.qrCode) return;

    // Tìm thẻ img hoặc canvas sinh bởi QRCodeJS
    const canvas = document.querySelector('#qr-code-canvas canvas');
    const img = document.querySelector('#qr-code-canvas img');

    let dataUrl = '';
    if (img && img.src && img.src.startsWith('data:image')) {
        dataUrl = img.src;
    } else if (canvas) {
        dataUrl = canvas.toDataURL('image/png');
    }

    if (!dataUrl) {
        alert('⚠️ Chưa kịp tạo xong ảnh QR Code, vui lòng chờ giây lát!');
        return;
    }

    // Tạo link tải giả lập
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `bdht-qr-ve-${ticket.qrCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Thực hiện in vé điện tử chuyên nghiệp
 */
function printActiveTicket() {
    if (currentModalTickets.length === 0) return;
    const ticket = currentModalTickets[activeTicketIndex];
    if (!ticket) return;

    const event = ticket.ticketType?.event || {};
    const eventTitle = event.title || 'Sự kiện âm nhạc nghệ thuật BDHT';
    const typeName = ticket.ticketType?.typeName || 'Vé vào cổng';
    const priceStr = ticket.ticketType?.price ? Number(ticket.ticketType.price).toLocaleString('vi-VN') + ' đ' : 'Miễn phí';
    const startDate = event.startTime ? new Date(event.startTime).toLocaleString('vi-VN') : 'Chưa xác định';
    const venueName = event.venue?.venueName || 'Địa điểm đối tác liên kết';
    const address = event.venue?.address || '';

    // Tìm ảnh QR Code
    const canvas = document.querySelector('#qr-code-canvas canvas');
    const img = document.querySelector('#qr-code-canvas img');
    let qrDataUrl = '';
    if (img && img.src && img.src.startsWith('data:image')) {
        qrDataUrl = img.src;
    } else if (canvas) {
        qrDataUrl = canvas.toDataURL('image/png');
    }

    // Tạo cửa sổ in đặc biệt
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        alert('⚠️ Trình duyệt đã chặn popup. Vui lòng cấp quyền mở tab mới để in vé!');
        return;
    }

    printWindow.document.write(`
        <html>
        <head>
            <title>In Vé Điện Tử BDHT - ${ticket.qrCode}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800;900&display=swap');
                body {
                    font-family: 'Montserrat', sans-serif;
                    background-color: #f1f5f9;
                    margin: 0;
                    padding: 40px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .ticket-card {
                    background: #ffffff;
                    width: 450px;
                    border-radius: 24px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                    border: 2px solid #e2e8f0;
                    overflow: hidden;
                    padding: 0;
                }
                .ticket-header {
                    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
                    color: white;
                    padding: 25px;
                    text-align: center;
                }
                .ticket-header h1 {
                    margin: 0;
                    font-size: 16px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    font-weight: 900;
                    color: #f97316;
                }
                .ticket-header p {
                    margin: 5px 0 0 0;
                    font-size: 10px;
                    color: #94a3b8;
                    font-weight: 600;
                }
                .ticket-body {
                    padding: 30px 25px;
                    text-align: center;
                    display: flex;
                    flex-col;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }
                .event-title {
                    font-size: 14px;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0 0 10px 0;
                    line-height: 1.4;
                }
                .info-grid {
                    width: 100%;
                    text-align: left;
                    font-size: 10px;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                .info-grid td {
                    padding: 6px 0;
                    color: #475569;
                    font-weight: 600;
                }
                .info-grid td.label {
                    color: #94a3b8;
                    width: 35%;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .qr-img {
                    width: 180px;
                    height: 180px;
                    border: 4px dashed #ffedd5;
                    border-radius: 16px;
                    padding: 10px;
                    background: #ffffff;
                }
                .ticket-code {
                    background: #f1f5f9;
                    padding: 8px 15px;
                    border-radius: 8px;
                    font-family: monospace;
                    font-size: 11px;
                    color: #334155;
                    font-weight: bold;
                    margin-top: 10px;
                }
                .ticket-footer {
                    border-top: 1px dashed #e2e8f0;
                    padding: 20px;
                    text-align: center;
                    font-size: 9px;
                    color: #94a3b8;
                    font-weight: 600;
                }
                @media print {
                    body {
                        background: none;
                        padding: 0;
                    }
                    .ticket-card {
                        box-shadow: none;
                        border: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="ticket-card">
                <div class="ticket-header">
                    <h1>Vé Điện Tử BDHT</h1>
                    <p>Hệ thống phân phối vé soát vé QR Code</p>
                </div>
                <div class="ticket-body">
                    <div class="event-title">${eventTitle}</div>
                    
                    <img src="${qrDataUrl}" class="qr-img" />

                    <div class="ticket-code">MÃ BẢO MẬT: ${ticket.qrCode}</div>

                    <table class="info-grid">
                        <tr>
                            <td class="label">Hạng Vé</td>
                            <td style="color: #f97316; font-weight: 800;">${typeName}</td>
                        </tr>
                        <tr>
                            <td class="label">Giá Vé</td>
                            <td>${priceStr}</td>
                        </tr>
                        <tr>
                            <td class="label">Thời Gian</td>
                            <td>${startDate}</td>
                        </tr>
                        <tr>
                            <td class="label">Địa Điểm</td>
                            <td>${venueName}<br/><span style="font-size: 8px; color: #94a3b8;">${address}</span></td>
                        </tr>
                    </table>
                </div>
                <div class="ticket-footer">
                    * Vé điện tử hợp lệ chỉ quét mã 01 lần tại quầy kiểm soát ra vào.
                </div>
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        window.close();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
}