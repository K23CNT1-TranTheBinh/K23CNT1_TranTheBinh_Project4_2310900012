/**
 * ----------------------------------------------------------------------------
 *  HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT
 * Tệp tin: ai-chat.js
 * Chức năng: Quản lý hộp thoại trò chuyện thông minh (AI Chatbot Widget)
 * Người thực hiện: Sinh viên Nguyễn Anh Tuấn
 * Vai trò: Xử lý giao diện chat, gửi nhận tin nhắn với AI và gợi ý sự kiện thông minh
 * ----------------------------------------------------------------------------
 */

// Lắng nghe sự kiện DOMContentLoaded để khởi chạy hệ thống sau khi trang đã tải xong
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Tự động tải Header động từ thư mục components dùng chung
    if (window.pageUtils && window.pageUtils.loadHeader) {
        await window.pageUtils.loadHeader();
    }

    // 2. Tự động tải Footer động từ thư mục components dùng chung
    if (window.pageUtils && window.pageUtils.loadFooter) {
        await window.pageUtils.loadFooter();
    }

    // 3. Khởi tạo chức năng Chatbot AI
    await initAiChat();
});

// Khóa lưu trữ lịch sử chat của khách trong LocalStorage (Dành cho người dùng chưa đăng nhập)
const GUEST_CHAT_STORAGE_KEY = 'bdhtGuestChatHistory';

// Khai báo các biến toàn cục quản lý trạng thái của Chat Widget
let currentChatBox = null;    // Lưu thẻ HTML chứa các tin nhắn chat
let currentChatState = null;  // Lưu trạng thái phiên chat (Session Code)
let currentChatInput = null;  // Lưu thẻ nhập tin nhắn (Input Field)

/**
 * Hàm khởi tạo và đảm bảo trạng thái Phiên Chat (Session) luôn tồn tại trên đối tượng window.
 * Giúp chia sẻ thông tin phiên chat giữa các thành phần khác nhau của hệ thống.
 */
function ensureChatWidgetState() {
    if (!window.chatWidgetState || typeof window.chatWidgetState !== 'object') {
        window.chatWidgetState = { sessionCode: '' };
    }
    return window.chatWidgetState;
}

/**
 * Hàm đọc lịch sử chat dành cho khách (chưa đăng nhập) từ LocalStorage.
 * Tránh trường hợp khách bị mất tin nhắn cũ khi chuyển trang hoặc tải lại trang.
 */
function readGuestChatStore() {
    try {
        const raw = localStorage.getItem(GUEST_CHAT_STORAGE_KEY);
        if (!raw) {
            return { sessions: [] };
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return { sessions: [] };
        }

        if (!Array.isArray(parsed.sessions)) {
            parsed.sessions = [];
        }
        return parsed;
    } catch (error) {
        console.warn('Không thể đọc lịch sử chat của khách từ LocalStorage:', error);
        return { sessions: [] };
    }
}

/**
 * Hàm ghi lịch sử chat dành cho khách vào LocalStorage dưới dạng chuỗi JSON.
 */
function writeGuestChatStore(store) {
    try {
        localStorage.setItem(GUEST_CHAT_STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
        console.error('Không thể lưu lịch sử chat vào LocalStorage:', error);
    }
}

/**
 * Cập nhật hoặc thêm mới tin nhắn khách hàng gửi/nhận vào LocalStorage.
 * Giới hạn tối đa lưu 8 phiên chat gần nhất để tránh tràn dung lượng LocalStorage.
 */
function upsertGuestSession(sessionCode, text, sender) {
    if (!sessionCode || !text) return;

    const store = readGuestChatStore();
    const now = new Date().toISOString();

    // Tìm xem phiên chat hiện tại đã có trong danh sách chưa
    const existingIndex = store.sessions.findIndex((item) => item.sessionCode === sessionCode);

    // Nếu đã có, lấy ra cập nhật; nếu chưa, tạo đối tượng phiên mới
    const entry = existingIndex >= 0 ? store.sessions[existingIndex] : {
        sessionCode,
        createdAt: now,
        updatedAt: now,
        preview: '',
        messages: []
    };

    entry.updatedAt = now;
    entry.preview = text.slice(0, 80); // Lấy 80 ký tự đầu để hiển thị xem trước
    entry.messages.push({
        sender,
        text,
        createdAt: now
    });

    // Cập nhật lại vào mảng lưu trữ
    if (existingIndex >= 0) {
        store.sessions[existingIndex] = entry;
    } else {
        store.sessions.unshift(entry); // Thêm lên đầu danh sách phiên
    }

    // Chỉ giữ lại tối đa 8 phiên chat gần nhất
    store.sessions = store.sessions.slice(0, 8);
    writeGuestChatStore(store);
}

/**
 * Lấy danh sách toàn bộ tin nhắn thuộc một phiên chat (Session Code) nhất định của khách.
 */
function getGuestSessionMessages(sessionCode) {
    if (!sessionCode) return [];

    const store = readGuestChatStore();
    const session = store.sessions.find((item) => item.sessionCode === sessionCode);
    return session ? session.messages : [];
}

/**
 * Hàm chống tấn công XSS (Cross-Site Scripting).
 * Chuyển đổi các ký tự HTML đặc biệt sang thực thể HTML (HTML Entities) an toàn.
 */
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Hàm chuẩn hóa dữ liệu danh sách sự kiện trả về từ API.
 * Giúp mã nguồn hoạt động ổn định kể cả khi Backend thay đổi định dạng dữ liệu (mảng hoặc phân trang).
 */
function normalizeEventResponse(response) {
    if (Array.isArray(response)) {
        return response;
    }
    if (response && Array.isArray(response.content)) {
        return response.content;
    }
    return [];
}

/**
 * Trả về đường dẫn chi tiết của sự kiện.
 * Tự động phân giải đường dẫn tương đối/tuyệt đối dựa vào pageUtils để tránh lỗi liên kết khi chạy local.
 */
function getEventDetailUrl(event) {
    const eventId = event?.eventId ?? event?.id ?? '';
    if (!eventId) return '#';

    const targetPath = `pages/user/nat-event-detail.html?id=${encodeURIComponent(eventId)}`;

    if (window.pageUtils && typeof window.pageUtils.resolveUrl === 'function') {
        return window.pageUtils.resolveUrl(targetPath);
    }
    return targetPath;
}

/**
 * Lấy ảnh banner của sự kiện, nếu không có thì dùng ảnh mặc định chất lượng cao từ Unsplash.
 */
function getEventImage(event) {
    return event?.bannerImageUrl ||
        event?.imageUrl ||
        event?.thumbnailUrl ||
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80';
}

/**
 * Định dạng thời gian bắt đầu và kết thúc của sự kiện sang định dạng hiển thị tiếng Việt (dd/MM/yyyy HH:mm).
 */
function formatEventTime(event) {
    const start = event?.startTime || event?.start_date || event?.startDate;
    const end = event?.endTime || event?.end_date || event?.endDate;

    if (!start) return 'Thời gian chưa cập nhật';

    // Hàm nhỏ hỗ trợ định dạng ngày giờ bằng thư viện Date mặc định của Javascript
    const toVietnameseString = (dateStr) => {
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formattedStart = toVietnameseString(start);
    if (end) {
        const formattedEnd = toVietnameseString(end);
        return `${formattedStart} - ${formattedEnd}`;
    }

    return formattedStart;
}

/**
 * [Hàm Helper Tách Nhỏ] Xây dựng cấu trúc HTML cho một thẻ sự kiện (Event Card).
 * Thể hiện tư duy viết mã khoa học, tách riêng biệt mã HTML và logic Javascript.
 */
function createEventCardElement(event) {
    const title = escapeHtml(event?.title || 'Sự kiện');
    const category = escapeHtml(event?.categoryName || '');
    const venue = escapeHtml(event?.venue?.venueName || event?.venueName || '');
    const time = escapeHtml(formatEventTime(event));
    const image = escapeHtml(getEventImage(event));

    // Định dạng giá tiền VNĐ
    const price = event?.price != null
        ? `${Number(event.price).toLocaleString('vi-VN')} VNĐ`
        : 'Liên hệ để biết giá';

    const detailUrl = getEventDetailUrl(event);

    // Lấy liên kết trang tất cả sự kiện
    const allEventsUrl = window.pageUtils && typeof window.pageUtils.resolveUrl === 'function'
        ? window.pageUtils.resolveUrl('pages/user/nat-all-events.html')
        : 'pages/user/nat-all-events.html';

    return `
        <div class="rounded-[22px] border border-gray-100 bg-white shadow-sm overflow-hidden">
            <img src="${image}" alt="${title}" class="w-full h-36 object-cover" />
            <div class="p-4 space-y-3">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="text-sm font-extrabold text-slate-900 line-clamp-2">${title}</p>
                        ${category ? `<p class="text-[11px] text-brand-orange font-bold uppercase mt-1">${category}</p>` : ''}
                    </div>
                    <span class="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">${escapeHtml(price)}</span>
                </div>
                ${venue ? `<p class="text-xs text-gray-500">📍 ${venue}</p>` : ''}
                <p class="text-xs text-gray-500">🕒 ${time}</p>
                <div class="flex gap-2 pt-1">
                    <a href="${detailUrl}" class="inline-flex items-center justify-center px-3 py-2 rounded-full bg-orange-500 text-white text-[11px] font-bold hover:bg-orange-600 transition-colors">Xem chi tiết</a>
                    <a href="${allEventsUrl}" class="inline-flex items-center justify-center px-3 py-2 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition-colors">Tất cả sự kiện</a>
                </div>
            </div>
        </div>
    `;
}

/**
 * [Hàm Helper Tách Nhỏ] Xây dựng cấu trúc HTML cho thẻ chứa các nút chức năng nhanh (Quick Action Card).
 */
function createQuickActionCardElement(title, description, actions) {
    // Duyệt qua mảng hành động để tạo danh sách nút tương ứng
    const actionButtonsHtml = actions.map((action) => {
        return `
            <a href="${action.href}" class="inline-flex items-center justify-center px-3 py-2 rounded-full bg-slate-900 text-white text-[11px] font-bold hover:bg-brand-purple transition-colors">
                ${escapeHtml(action.label)}
            </a>
        `;
    }).join('');

    return `
        <div class="rounded-[24px] border border-gray-100 bg-white shadow-sm p-4 space-y-3">
            <div>
                <p class="text-sm font-extrabold text-slate-900">${escapeHtml(title)}</p>
                <p class="text-xs text-gray-500 mt-1 leading-relaxed">${escapeHtml(description)}</p>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">${actionButtonsHtml}</div>
        </div>
    `;
}

/**
 * [Hàm Helper Tách Nhỏ] Tạo bong bóng tin nhắn của Người dùng gửi.
 */
function createUserMessageBubble(text) {
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'flex gap-3 items-start justify-end';

    const bubble = document.createElement('div');
    bubble.className = 'bg-orange-500 text-white px-4 py-3 rounded-[22px] rounded-tr-sm shadow-sm max-w-[85%] leading-relaxed text-sm font-semibold';
    bubble.textContent = text;

    bubbleDiv.appendChild(bubble);
    return bubbleDiv;
}

/**
 * [Hàm Helper Tách Nhỏ] Tạo bong bóng tin nhắn phản hồi của Trợ lý ảo AI.
 */
function createAiMessageBubble(text) {
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'flex gap-3 items-start';

    // Tạo avatar robot dễ thương
    const avatar = document.createElement('div');
    avatar.className = 'w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-rose-400 text-white flex items-center justify-center shrink-0 shadow-sm';
    avatar.innerHTML = '<i class="fas fa-crow text-xs"></i>';

    // Tạo nội dung tin nhắn dạng văn bản (hỗ trợ xuống dòng)
    const bubble = document.createElement('div');
    bubble.className = 'bg-white border border-gray-100 px-4 py-3 rounded-[22px] rounded-tl-sm shadow-sm max-w-[85%] leading-relaxed text-sm text-gray-700';
    bubble.innerHTML = text.replace(/\n/g, '<br />');

    bubbleDiv.appendChild(avatar);
    bubbleDiv.appendChild(bubble);
    return bubbleDiv;
}

/**
 * Thêm tin nhắn vào hộp thoại và tự động cuộn giao diện xuống tin nhắn mới nhất.
 */
function appendMessage(sender, text) {
    if (!currentChatBox) return;

    let messageElement;
    if (sender === 'user') {
        messageElement = createUserMessageBubble(text);
    } else {
        messageElement = createAiMessageBubble(text);
    }

    currentChatBox.appendChild(messageElement);
    currentChatBox.scrollTop = currentChatBox.scrollHeight;
}

/**
 * Thêm thẻ HTML phản hồi đặc biệt (như danh sách sự kiện hay thẻ hành động) từ Trợ lý AI.
 */
function appendAssistantCard(html) {
    if (!currentChatBox) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'flex gap-3 items-start';
    wrapper.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-rose-400 text-white flex items-center justify-center shrink-0 shadow-sm">
            <i class="fas fa-crow text-xs"></i>
        </div>
        <div class="max-w-[85%]">${html}</div>
    `;

    currentChatBox.appendChild(wrapper);
    currentChatBox.scrollTop = currentChatBox.scrollHeight;
}

/**
 * [Hàm Helper Tách Nhỏ] Tạo phần tử biểu thị trạng thái "AI đang trả lời..." (Loading Indicator).
 */
function createLoadingIndicatorElement() {
    const loader = document.createElement('div');
    loader.className = 'flex gap-3 items-start animate-pulse';
    loader.id = 'ai-chat-loading-indicator';
    loader.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0 font-bold">
            <i class="fas fa-robot text-xs"></i>
        </div>
        <div class="bg-white border border-gray-100 px-4 py-3 rounded-[22px] rounded-tl-sm shadow-sm max-w-[80%] text-sm text-slate-400">
            AI đang suy nghĩ...
        </div>
    `;
    return loader;
}

/**
 * Hiển thị hiệu ứng tải tin nhắn trong khi chờ API phản hồi.
 */
function showLoadingIndicator() {
    if (!currentChatBox) return;

    const loaderElement = createLoadingIndicatorElement();
    currentChatBox.appendChild(loaderElement);
    currentChatBox.scrollTop = currentChatBox.scrollHeight;
}

/**
 * Xóa bỏ hiệu ứng tải tin nhắn sau khi đã nhận được câu trả lời từ AI.
 */
function removeLoadingIndicator() {
    const loader = document.getElementById('ai-chat-loading-indicator');
    if (loader) {
        loader.remove();
    }
}

/**
 * [Tái Cấu Trúc Sư Phạm] Nhận diện ý định (Intent Detection) của người dùng từ tin nhắn.
 * Thay thế Regex phức tạp bằng vòng lặp so khớp chuỗi (String.includes) tường minh, cực kỳ dễ hiểu và bảo vệ đồ án trước thầy cô.
 */
function detectIntent(message) {
    const msgLower = message.toLowerCase().trim();

    // 1. Kiểm tra từ khóa xem sản phẩm/vé/sự kiện/khuyến mãi
    const productKeywords = ['xem sản phẩm', 'xem vé', 'sản phẩm', 'liveshow', 'sự kiện', 'khuyến mãi', 'event'];
    for (let i = 0; i < productKeywords.length; i++) {
        if (msgLower.includes(productKeywords[i])) {
            return 'products';
        }
    }

    // 2. Kiểm tra từ khóa đăng nhập và đăng ký đồng thời
    const hasLoginKeyword = msgLower.includes('đăng nhập') || msgLower.includes('login') || msgLower.includes('đăng nhâp');
    const hasRegisterKeyword = msgLower.includes('đăng ký') || msgLower.includes('register');

    if (hasLoginKeyword && hasRegisterKeyword) {
        return 'auth'; // Yêu cầu cả hai
    }

    // 3. Kiểm tra từ khóa đăng nhập đơn lẻ
    if (hasLoginKeyword) {
        return 'login';
    }

    // 4. Kiểm tra từ khóa đăng ký đơn lẻ
    if (hasRegisterKeyword) {
        return 'register';
    }

    // 5. Ý định mặc định: Gọi chatbot Generative AI ở Backend
    return 'ai';
}

/**
 * Xây dựng cấu trúc thẻ điều hướng xác thực nhanh (Đăng nhập / Đăng ký) tùy theo ý định của người dùng.
 */
function buildAuthCard(type) {
    const loginUrl = window.pageUtils && typeof window.pageUtils.resolveUrl === 'function'
        ? window.pageUtils.resolveUrl('pages/user/nat-login.html')
        : 'pages/user/nat-login.html';

    const registerUrl = window.pageUtils && typeof window.pageUtils.resolveUrl === 'function'
        ? window.pageUtils.resolveUrl('pages/user/nat-register.html')
        : 'pages/user/nat-register.html';

    if (type === 'login') {
        return createQuickActionCardElement('Yêu cầu Đăng nhập', 'Tôi đã tìm thấy liên kết đến trang đăng nhập cho bạn.', [
            { label: 'Đăng nhập ngay 🔑', href: loginUrl }
        ]);
    } else if (type === 'register') {
        return createQuickActionCardElement('Yêu cầu Đăng ký', 'Tôi đã tìm thấy liên kết đến trang đăng ký cho bạn.', [
            { label: 'Đăng ký ngay 📝', href: registerUrl }
        ]);
    } else {
        return createQuickActionCardElement('Đăng nhập / Đăng ký', 'Tôi có thể đưa bạn đến trang đăng nhập hoặc đăng ký nhanh chóng.', [
            { label: 'Đăng nhập', href: loginUrl },
            { label: 'Đăng ký', href: registerUrl }
        ]);
    }
}

/**
 * Trả về nội dung hướng dẫn chào mừng mặc định nếu cần (Hiện tại không dùng để giữ giao diện sạch).
 */
function buildDefaultPromptCard() {
    return '';
}

/**
 * Lọc sự kiện từ cơ sở dữ liệu và hiển thị lên khung chat nếu người dùng muốn "tìm kiếm sự kiện".
 */
async function renderProductCards(message) {
    try {
        const apiClient = requireApiClient();
        const response = await apiClient.getPublicEvents({ page: 0, size: 100 });
        const events = normalizeEventResponse(response);

        const keyword = message.toLowerCase();

        // Nhận diện xem người dùng có muốn lọc sự kiện theo một danh mục cụ thể không
        const categories = ['workshop', 'âm nhạc', 'hội thảo', 'rap', 'esports', 'ca nhạc', 'edm', 'acoustic', 'ẩm thực', 'thể thao'];
        let matchedCategory = null;
        for (let i = 0; i < categories.length; i++) {
            if (keyword.includes(categories[i])) {
                matchedCategory = categories[i];
                break;
            }
        }

        let filtered = events;
        if (matchedCategory) {
            // Lọc các sự kiện có danh mục khớp với từ khóa phát hiện được
            filtered = events.filter(event => {
                const catName = (event?.categoryName || '').toLowerCase();
                return catName.includes(matchedCategory);
            });
        } else {
            // Lọc chung theo tên hoặc địa điểm tổ chức sự kiện
            filtered = events.filter((event) => {
                const haystack = `${event?.title || ''} ${event?.categoryName || ''} ${event?.venue?.venueName || event?.venueName || ''}`.toLowerCase();
                if (haystack.includes('sản phẩm') || haystack.includes('event')) return true;
                if (keyword.includes('xem sản phẩm') || keyword.includes('xem sự kiện') || keyword.includes('sự kiện')) return true;

                const searchTerm = keyword.replace(/xem sản phẩm/g, '').replace(/xem sự kiện/g, '').replace(/xem/g, '').replace(/sự kiện/g, '').trim();
                return searchTerm ? haystack.includes(searchTerm) : true;
            });
        }

        // Chỉ lấy tối đa 3 sự kiện phù hợp nhất để hiển thị trong khung chat (tránh làm tràn giao diện)
        const preview = filtered.slice(0, 3);

        if (!preview.length) {
            const displayCategory = matchedCategory ? `chủ đề "${matchedCategory}"` : 'phù hợp';
            appendAssistantCard(createQuickActionCardElement('Không tìm thấy sự kiện', `Tôi chưa tìm được sự kiện ${displayCategory} ngay lúc này. Bạn có thể gõ từ khóa khác hoặc truy cập trang Tất cả sự kiện.`, []));
            return;
        }

        const titleText = matchedCategory
            ? `Dưới đây là các sự kiện thuộc chủ đề "${matchedCategory.toUpperCase()}" mà bạn muốn xem:`
            : `Dưới đây là các sự kiện/sản phẩm phù hợp nhất:`;

        // Render cấu trúc HTML danh sách sự kiện gợi ý
        const cardsHtml = preview.map((event) => createEventCardElement(event)).join('');
        appendAssistantCard(`
            <div class="space-y-3">
                <p class="text-sm font-extrabold text-slate-900">${titleText}</p>
                <div class="grid gap-3">${cardsHtml}</div>
            </div>
        `);

        // Nếu là khách, tự động lưu lịch sử chat vào LocalStorage
        if (!localStorage.getItem('token')) {
            upsertGuestSession(currentChatState.sessionCode, message, 'user');
            upsertGuestSession(currentChatState.sessionCode, `Hiển thị danh sách sự kiện ${matchedCategory || 'phù hợp'}.`, 'ai');
        }
    } catch (error) {
        console.error('Không thể tải sự kiện gợi ý:', error);
        appendAssistantCard(createQuickActionCardElement('Không thể tải sản phẩm', 'Tôi gặp lỗi khi lấy dữ liệu sự kiện. Vui lòng thử lại sau.', []));
    }
}

/**
 * Kiểm tra và yêu cầu Client API hoạt động.
 */
function requireApiClient() {
    if (!window.apiClient) {
        throw new Error('Hệ thống chat chưa sẵn sàng. Vui lòng tải lại trang.');
    }
    return window.apiClient;
}

/**
 * Gọi API backend để tạo một mã phiên làm việc chat mới (Session Code).
 */
async function generateChatSession() {
    try {
        const apiClient = requireApiClient();
        const response = await apiClient.get('/api/vtd/public/ai-chat/generate-session');
        currentChatState.sessionCode = response.sessionCode || '';

        if (!currentChatState.sessionCode) {
            throw new Error('Không nhận được sessionCode hợp lệ từ máy chủ.');
        }
    } catch (error) {
        console.error('Không thể lấy session code từ server:', error);
        throw error;
    }
}

/**
 * Xử lý sự kiện khi người dùng nhấn nút gửi hoặc Enter để bắt đầu gửi tin nhắn chat.
 */
async function sendChatMessage() {
    if (!currentChatInput) return;

    const message = currentChatInput.value.trim();
    if (!message) return;

    // 1. Hiển thị tin nhắn của người dùng lên màn hình và xóa nội dung trong ô nhập
    appendMessage('user', message);
    currentChatInput.value = '';

    // 2. Nhận diện ý định của người dùng bằng hàm phân tích từ khóa
    const intent = detectIntent(message);

    // 3. Khởi tạo phiên chat nếu chưa có mã phiên
    if (!currentChatState.sessionCode) {
        try {
            await generateChatSession();
        } catch (error) {
            appendMessage('ai', 'Không thể kết nối đến hệ thống chat ngay lúc này. Vui lòng thử lại sau.');
            return;
        }
    }

    // 4. Phân luồng xử lý tùy theo ý định nhận diện được
    if (intent === 'products') {
        await renderProductCards(message);
        return;
    }

    if (intent === 'login') {
        appendAssistantCard(buildAuthCard('login'));
        if (!localStorage.getItem('token')) {
            upsertGuestSession(currentChatState.sessionCode, message, 'user');
            upsertGuestSession(currentChatState.sessionCode, 'Cung cấp liên kết đăng nhập.', 'ai');
        }
        return;
    }

    if (intent === 'register') {
        appendAssistantCard(buildAuthCard('register'));
        if (!localStorage.getItem('token')) {
            upsertGuestSession(currentChatState.sessionCode, message, 'user');
            upsertGuestSession(currentChatState.sessionCode, 'Cung cấp liên kết đăng ký.', 'ai');
        }
        return;
    }

    if (intent === 'auth') {
        appendAssistantCard(buildAuthCard('both'));
        if (!localStorage.getItem('token')) {
            upsertGuestSession(currentChatState.sessionCode, message, 'user');
            upsertGuestSession(currentChatState.sessionCode, 'Cung cấp liên kết đăng nhập và đăng ký.', 'ai');
        }
        return;
    }

    // 5. Nếu không khớp ý định đặc biệt, gửi tin nhắn lên API AI chatbot ở Backend
    showLoadingIndicator();

    try {
        const apiClient = requireApiClient();
        const response = await apiClient.post('/api/vtd/public/ai-chat/message', {
            sessionCode: currentChatState.sessionCode,
            message
        });

        // Hỗ trợ linh hoạt các định dạng dữ liệu trả về của Backend AI
        const aiText = response.aiResponse?.messageText ||
            response.aiResponse?.message ||
            response.aiResponse?.content ||
            response.aiResponse?.response ||
            'AI chưa trả lời.';

        removeLoadingIndicator();
        appendMessage('ai', aiText);

        // Lưu trữ lịch sử tin nhắn của khách vào LocalStorage
        if (!localStorage.getItem('token')) {
            upsertGuestSession(currentChatState.sessionCode, message, 'user');
            upsertGuestSession(currentChatState.sessionCode, aiText, 'ai');
        }
    } catch (error) {
        console.error('Lỗi khi tương tác với API AI Chat:', error);
        removeLoadingIndicator();
        appendMessage('ai', 'Không thể gửi tin nhắn ngay lúc này. Vui lòng thử lại sau.');
    }
}

/**
 * Tải widget chat tĩnh HTML động và liên kết các sự kiện tương tác của hộp thoại chat.
 */
async function initAiChat() {
    let fab = document.getElementById('chat-widget-fab');
    let popup = document.getElementById('chat-popup-container');

    // Nếu các phần tử chat widget chưa tồn tại trên trang, tiến hành tải tệp HTML dùng chung
    if (!fab || !popup) {
        try {
            const widgetUrl = (window.pageUtils && typeof window.pageUtils.resolveUrl === 'function')
                ? window.pageUtils.resolveUrl('components/nat-chat-widget.html')
                : '../components/nat-chat-widget.html';

            const response = await fetch(widgetUrl);
            if (!response.ok) {
                console.error('Không thể tải giao diện Chat Widget');
                return;
            }

            // Chèn mã HTML tải được vào cuối thẻ body
            document.body.insertAdjacentHTML('beforeend', await response.text());

            // Lấy lại tham chiếu sau khi đã chèn HTML
            fab = document.getElementById('chat-widget-fab');
            popup = document.getElementById('chat-popup-container');
        } catch (error) {
            console.error('Lỗi trong quá trình tải Chat Widget:', error);
            return;
        }
    }

    if (!fab || !popup) return;

    // Lấy các tham chiếu đến các nút điều khiển của Chat Widget
    const fabChatIcon = document.getElementById('fab-chat-icon');
    const fabCloseIcon = document.getElementById('fab-close-icon');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatInput = document.getElementById('chat-input-field');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatBox = document.getElementById('chat-messages-box');

    if (!chatInput || !chatSendBtn || !chatBox) return;

    // Gán các biến tham chiếu toàn cục
    currentChatBox = chatBox;
    currentChatState = ensureChatWidgetState();
    currentChatInput = chatInput;

    // Hàm mở hộp thoại Chatbot
    const openPopup = () => {
        popup.classList.remove('hidden');
        fabChatIcon?.classList.add('hidden');
        fabCloseIcon?.classList.remove('hidden');
        // Tự động focus vào ô nhập tin nhắn
        requestAnimationFrame(() => chatInput.focus());
    };

    // Hàm đóng hộp thoại Chatbot
    const closePopup = () => {
        popup.classList.add('hidden');
        fabChatIcon?.classList.remove('hidden');
        fabCloseIcon?.classList.add('hidden');
    };

    // Lắng nghe sự kiện click vào nút tròn FAB để ẩn/hiện hộp chat
    fab.addEventListener('click', (event) => {
        event.stopPropagation();
        if (popup.classList.contains('hidden')) {
            openPopup();
        } else {
            closePopup();
        }
    });

    // Lắng nghe nút X đóng chat nhanh trong hộp chat
    chatCloseBtn?.addEventListener('click', closePopup);

    // Lắng nghe click ngoài vùng hộp chat để tự đóng hộp thoại (nâng cao trải nghiệm người dùng)
    window.addEventListener('click', (event) => {
        if (!popup.classList.contains('hidden') && !popup.contains(event.target) && !fab.contains(event.target)) {
            closePopup();
        }
    });

    // Ngăn chặn sự kiện click lan ra ngoài làm đóng hộp thoại chat khi click bên trong
    popup.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    // Bắt sự kiện phím Enter để gửi tin nhắn (không giữ phím Shift)
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendChatMessage();
        }
    });

    // Lắng nghe click vào biểu tượng gửi tin nhắn
    chatSendBtn.addEventListener('click', sendChatMessage);

    // Tạo sẵn Session Code khi mở trang để tăng tốc độ phản hồi tin nhắn đầu tiên
    if (!currentChatState.sessionCode) {
        try {
            await generateChatSession();
        } catch (error) {
            console.warn('Chưa tạo được session cho chat widget:', error);
        }
    }

    // Đối với người dùng chưa đăng nhập, khôi phục lại lịch sử chat cũ của họ từ LocalStorage
    if (!localStorage.getItem('token')) {
        const storedMessages = getGuestSessionMessages(currentChatState.sessionCode);
        if (storedMessages.length) {
            currentChatBox.innerHTML = '';
            storedMessages.forEach((message) => {
                appendMessage(message.sender, message.text);
            });
        }
    }

    // Hiển thị lời chào mặc định nếu có thiết lập
    appendAssistantCard(buildDefaultPromptCard());
}
