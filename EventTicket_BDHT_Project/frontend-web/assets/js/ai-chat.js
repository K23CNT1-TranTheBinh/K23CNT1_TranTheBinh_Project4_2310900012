document.addEventListener('DOMContentLoaded', async () => {
    if (window.pageUtils && window.pageUtils.loadHeader) {
        await window.pageUtils.loadHeader();
    }
    if (window.pageUtils && window.pageUtils.loadFooter) {
        await window.pageUtils.loadFooter();
    }

    await initAiChat();
});

const GUEST_CHAT_STORAGE_KEY = 'bdhtGuestChatHistory';
let currentChatBox = null;
let currentChatState = null;
let currentChatInput = null;

function ensureChatWidgetState() {
    if (!window.chatWidgetState || typeof window.chatWidgetState !== 'object') {
        window.chatWidgetState = { sessionCode: '' };
    }
    return window.chatWidgetState;
}

function readGuestChatStore() {
    try {
        const raw = localStorage.getItem(GUEST_CHAT_STORAGE_KEY);
        if (!raw) return { sessions: [] };

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return { sessions: [] };
        if (!Array.isArray(parsed.sessions)) parsed.sessions = [];
        return parsed;
    } catch (error) {
        console.warn('Không thể đọc lịch sử chat khách:', error);
        return { sessions: [] };
    }
}

function writeGuestChatStore(store) {
    localStorage.setItem(GUEST_CHAT_STORAGE_KEY, JSON.stringify(store));
}

function upsertGuestSession(sessionCode, text, sender) {
    if (!sessionCode || !text) return;

    const store = readGuestChatStore();
    const now = new Date().toISOString();
    const existingIndex = store.sessions.findIndex((item) => item.sessionCode === sessionCode);

    const entry = existingIndex >= 0 ? store.sessions[existingIndex] : {
        sessionCode,
        createdAt: now,
        updatedAt: now,
        preview: '',
        messages: []
    };

    entry.updatedAt = now;
    entry.preview = text.slice(0, 80);
    entry.messages.push({
        sender,
        text,
        createdAt: now
    });

    if (existingIndex >= 0) {
        store.sessions[existingIndex] = entry;
    } else {
        store.sessions.unshift(entry);
    }

    store.sessions = store.sessions.slice(0, 8);
    writeGuestChatStore(store);
}

function getGuestSessionMessages(sessionCode) {
    if (!sessionCode) return [];

    const store = readGuestChatStore();
    const session = store.sessions.find((item) => item.sessionCode === sessionCode);
    return session?.messages || [];
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeEventResponse(response) {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.content)) return response.content;
    return [];
}

function getEventDetailUrl(event) {
    const eventId = event?.eventId ?? event?.id ?? '';
    if (!eventId) return '#';

    if (window.pageUtils && typeof window.pageUtils.resolveUrl === 'function') {
        return window.pageUtils.resolveUrl(`pages/user/event-detail.html?id=${encodeURIComponent(eventId)}`);
    }

    return `pages/user/event-detail.html?id=${encodeURIComponent(eventId)}`;
}

function getEventImage(event) {
    return event?.bannerImageUrl || event?.imageUrl || event?.thumbnailUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80';
}

function formatEventTime(event) {
    const start = event?.startTime || event?.start_date || event?.startDate;
    const end = event?.endTime || event?.end_date || event?.endDate;

    if (!start) return 'Thời gian chưa cập nhật';
    const formatted = new Date(start).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    if (end) {
        const endFormatted = new Date(end).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        return `${formatted} - ${endFormatted}`;
    }

    return formatted;
}

function buildEventCardHtml(event) {
    const title = escapeHtml(event?.title || 'Sự kiện');
    const category = escapeHtml(event?.categoryName || '');
    const venue = escapeHtml(event?.venue?.venueName || event?.venueName || '');
    const time = escapeHtml(formatEventTime(event));
    const image = escapeHtml(getEventImage(event));
    const price = event?.price != null ? `${Number(event.price).toLocaleString('vi-VN')} VNĐ` : 'Liên hệ để biết giá';
    const detailUrl = getEventDetailUrl(event);

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
                <div class="flex gap-2">
                    <a href="${detailUrl}" class="inline-flex items-center justify-center px-3 py-2 rounded-full bg-orange-500 text-white text-[11px] font-bold hover:bg-orange-600 transition-colors">Xem chi tiết</a>
                    <a href="${window.pageUtils && typeof window.pageUtils.resolveUrl === 'function' ? window.pageUtils.resolveUrl('pages/user/all-events.html') : 'pages/user/all-events.html'}" class="inline-flex items-center justify-center px-3 py-2 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition-colors">Tất cả sự kiện</a>
                </div>
            </div>
        </div>
    `;
}

function buildQuickActionCard(title, description, actions) {
    const actionButtons = actions.map((action) => `
        <a href="${action.href}" class="inline-flex items-center justify-center px-3 py-2 rounded-full bg-slate-900 text-white text-[11px] font-bold hover:bg-brand-purple transition-colors">${escapeHtml(action.label)}</a>
    `).join('');

    return `
        <div class="rounded-[24px] border border-gray-100 bg-white shadow-sm p-4 space-y-3">
            <div>
                <p class="text-sm font-extrabold text-slate-900">${escapeHtml(title)}</p>
                <p class="text-xs text-gray-500 mt-1 leading-relaxed">${escapeHtml(description)}</p>
            </div>
            <div class="flex flex-wrap gap-2">${actionButtons}</div>
        </div>
    `;
}

function appendMessage(sender, text) {
    if (!currentChatBox) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = 'flex gap-3 items-start';

    if (sender === 'user') {
        msgDiv.className += ' justify-end';
        const bubble = document.createElement('div');
        bubble.className = 'bg-orange-500 text-white px-4 py-3 rounded-[22px] rounded-tr-sm shadow-sm max-w-[85%] leading-relaxed text-sm font-semibold';
        bubble.textContent = text;
        msgDiv.appendChild(bubble);
    } else {
        const avatar = document.createElement('div');
        avatar.className = 'w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-rose-400 text-white flex items-center justify-center shrink-0 shadow-sm';
        avatar.innerHTML = '<i class="fas fa-crow text-xs"></i>';

        const bubble = document.createElement('div');
        bubble.className = 'bg-white border border-gray-100 px-4 py-3 rounded-[22px] rounded-tl-sm shadow-sm max-w-[85%] leading-relaxed text-sm text-gray-700';
        bubble.innerHTML = text.replace(/\n/g, '<br />');

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
    }

    currentChatBox.appendChild(msgDiv);
    currentChatBox.scrollTop = currentChatBox.scrollHeight;
}

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

function showLoadingIndicator() {
    if (!currentChatBox) return;

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
    currentChatBox.appendChild(loader);
    currentChatBox.scrollTop = currentChatBox.scrollHeight;
}

function removeLoadingIndicator() {
    const loader = document.getElementById('ai-chat-loading-indicator');
    if (loader) loader.remove();
}

function detectIntent(message) {
    const msg = message.toLowerCase();

    if (/(xem\s+sản\s+phẩm|xem\s+vé|sản\s+phẩm|liveshow|sự\s+kiện|khuyến\s+mãi|event)/i.test(msg)) {
        return 'products';
    }

    if (/(đăng\s+nhập|login|đăng nhâp)/i.test(msg) && !/(đăng\s+ký|register)/i.test(msg)) {
        return 'login';
    }

    if (/(đăng\s+ký|register)/i.test(msg) && !/(đăng\s+nhập|login)/i.test(msg)) {
        return 'register';
    }

    if (/(đăng\s+nhập|login).*(đăng\s+ký|register)| (đăng\s+ký|register).*(đăng\s+nhập|login)/i.test(msg)) {
        return 'auth';
    }

    return 'ai';
}

function buildAuthCard() {
    const loginUrl = window.pageUtils && typeof window.pageUtils.resolveUrl === 'function'
        ? window.pageUtils.resolveUrl('pages/user/login.html')
        : 'pages/user/login.html';
    const registerUrl = window.pageUtils && typeof window.pageUtils.resolveUrl === 'function'
        ? window.pageUtils.resolveUrl('pages/user/register.html')
        : 'pages/user/register.html';

    return buildQuickActionCard('Đăng nhập / Đăng ký', 'Tôi có thể đưa bạn đến trang đăng nhập hoặc đăng ký nhanh chóng.', [
        { label: 'Đăng nhập', href: loginUrl },
        { label: 'Đăng ký', href: registerUrl }
    ]);
}

function buildDefaultPromptCard() {
    return buildQuickActionCard('Bạn có thể hỏi tôi về', 'Tìm sự kiện, xem vé, đăng nhập hoặc đăng ký một cách nhanh chóng.', [
        { label: 'Xem sự kiện', href: window.pageUtils && typeof window.pageUtils.resolveUrl === 'function' ? window.pageUtils.resolveUrl('pages/user/all-events.html') : 'pages/user/all-events.html' },
        { label: 'Đăng nhập', href: window.pageUtils && typeof window.pageUtils.resolveUrl === 'function' ? window.pageUtils.resolveUrl('pages/user/login.html') : 'pages/user/login.html' },
        { label: 'Đăng ký', href: window.pageUtils && typeof window.pageUtils.resolveUrl === 'function' ? window.pageUtils.resolveUrl('pages/user/register.html') : 'pages/user/register.html' }
    ]);
}

async function renderProductCards(message) {
    try {
        const apiClient = requireApiClient();
        const response = await apiClient.getPublicEvents({ page: 0, size: 100 });
        const events = normalizeEventResponse(response).slice(0, 6);

        const keyword = message.toLowerCase();
        const filtered = events.filter((event) => {
            const haystack = `${event?.title || ''} ${event?.categoryName || ''} ${event?.venue?.venueName || event?.venueName || ''}`.toLowerCase();
            if (haystack.includes('sản phẩm') || haystack.includes('event')) return true;
            if (keyword.includes('xem sản phẩm')) return true;
            const searchTerm = keyword.replace(/xem sản phẩm/g, '').replace(/xem sự kiện/g, '').replace(/xem/g, '').trim();
            return searchTerm ? haystack.includes(searchTerm) : true;
        });

        const source = filtered.length ? filtered : events;
        const preview = source.slice(0, 3);

        if (!preview.length) {
            appendAssistantCard(buildQuickActionCard('Không tìm thấy sản phẩm', 'Tôi chưa tìm được sự kiện phù hợp ngay lúc này. Hãy thử câu hỏi cụ thể hơn như “xem concert”, “xem show” hoặc “xem sự kiện gần đây”.', []));
            return;
        }

        appendAssistantCard(`
            <div class="space-y-3">
                <p class="text-sm font-extrabold text-slate-900">Dưới đây là các sản phẩm/sự kiện phù hợp nhất:</p>
                <div class="grid gap-3">${preview.map((event) => buildEventCardHtml(event)).join('')}</div>
            </div>
        `);

        if (!localStorage.getItem('token')) {
            upsertGuestSession(currentChatState.sessionCode, message, 'user');
            upsertGuestSession(currentChatState.sessionCode, 'Hiển thị sản phẩm/sự kiện phù hợp.', 'ai');
        }
    } catch (error) {
        console.error('Không thể tải sản phẩm:', error);
        appendAssistantCard(buildQuickActionCard('Không thể tải sản phẩm', 'Tôi gặp lỗi khi lấy dữ liệu sự kiện. Vui lòng thử lại sau.', []));
    }
}

function requireApiClient() {
    if (!window.apiClient) {
        throw new Error('Hệ thống chat chưa sẵn sàng. Vui lòng tải lại trang.');
    }
    return window.apiClient;
}

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

async function sendChatMessage() {
    if (!currentChatInput) return;

    const message = currentChatInput.value.trim();
    if (!message) return;

    appendMessage('user', message);
    currentChatInput.value = '';

    const intent = detectIntent(message);

    if (!currentChatState.sessionCode) {
        try {
            await generateChatSession();
        } catch (error) {
            appendMessage('ai', 'Không thể kết nối đến hệ thống chat ngay lúc này. Vui lòng thử lại sau.');
            return;
        }
    }

    if (intent === 'products') {
        await renderProductCards(message);
        return;
    }

    if (intent === 'login' || intent === 'register' || intent === 'auth') {
        appendAssistantCard(buildAuthCard());
        if (!localStorage.getItem('token')) {
            upsertGuestSession(currentChatState.sessionCode, message, 'user');
            upsertGuestSession(currentChatState.sessionCode, 'Cung cấp link đăng nhập và đăng ký.', 'ai');
        }
        return;
    }

    showLoadingIndicator();

    try {
        const apiClient = requireApiClient();
        const response = await apiClient.post('/api/vtd/public/ai-chat/message', {
            sessionCode: currentChatState.sessionCode,
            message
        });

        const aiText = response.aiResponse?.messageText || response.aiResponse?.message || response.aiResponse?.content || response.aiResponse?.response || 'AI chưa trả lời.';
        removeLoadingIndicator();
        appendMessage('ai', aiText);

        if (!localStorage.getItem('token')) {
            upsertGuestSession(currentChatState.sessionCode, message, 'user');
            upsertGuestSession(currentChatState.sessionCode, aiText, 'ai');
        }
    } catch (error) {
        console.error('Lỗi gửi tin nhắn AI:', error);
        removeLoadingIndicator();
        appendMessage('ai', 'Không thể gửi tin nhắn ngay lúc này. Vui lòng thử lại sau.');
    }
}

async function initAiChat() {
    let fab = document.getElementById('chat-widget-fab');
    let popup = document.getElementById('chat-popup-container');

    if (!fab || !popup) {
        try {
            const widgetUrl = (window.pageUtils && typeof window.pageUtils.resolveUrl === 'function')
                ? window.pageUtils.resolveUrl('components/chat-widget.html')
                : '../components/chat-widget.html';

            const response = await fetch(widgetUrl);
            if (!response.ok) {
                console.error('Không thể tải chat widget');
                return;
            }

            document.body.insertAdjacentHTML('beforeend', await response.text());
            fab = document.getElementById('chat-widget-fab');
            popup = document.getElementById('chat-popup-container');
        } catch (error) {
            console.error('Không thể load chat widget:', error);
            return;
        }
    }

    if (!fab || !popup) return;

    const fabChatIcon = document.getElementById('fab-chat-icon');
    const fabCloseIcon = document.getElementById('fab-close-icon');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatInput = document.getElementById('chat-input-field');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatBox = document.getElementById('chat-messages-box');

    if (!chatInput || !chatSendBtn || !chatBox) return;

    currentChatBox = chatBox;
    currentChatState = ensureChatWidgetState();
    currentChatInput = chatInput;

    const openPopup = () => {
        popup.classList.remove('hidden');
        fabChatIcon?.classList.add('hidden');
        fabCloseIcon?.classList.remove('hidden');
        requestAnimationFrame(() => chatInput.focus());
    };

    const closePopup = () => {
        popup.classList.add('hidden');
        fabChatIcon?.classList.remove('hidden');
        fabCloseIcon?.classList.add('hidden');
    };

    fab.addEventListener('click', (event) => {
        event.stopPropagation();
        if (popup.classList.contains('hidden')) {
            openPopup();
        } else {
            closePopup();
        }
    });

    chatCloseBtn?.addEventListener('click', closePopup);

    window.addEventListener('click', (event) => {
        if (!popup.classList.contains('hidden') && !popup.contains(event.target) && !fab.contains(event.target)) {
            closePopup();
        }
    });

    popup.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendChatMessage();
        }
    });

    chatSendBtn.addEventListener('click', sendChatMessage);

    if (!currentChatState.sessionCode) {
        try {
            await generateChatSession();
        } catch (error) {
            console.warn('Chưa tạo được session cho chat widget:', error);
        }
    }

    if (!localStorage.getItem('token')) {
        const storedMessages = getGuestSessionMessages(currentChatState.sessionCode);
        if (storedMessages.length) {
            currentChatBox.innerHTML = '';
            storedMessages.forEach((message) => {
                appendMessage(message.sender, message.text);
            });
        }
    }

    appendAssistantCard(buildDefaultPromptCard());
}
