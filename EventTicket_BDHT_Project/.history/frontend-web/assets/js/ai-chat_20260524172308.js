window.openAiChatWidget = async function () {
    const fab = document.getElementById('chat-widget-fab');
    if (fab) {
        fab.click();
        return true;
    }

    if (window.pageUtils && window.pageUtils.loadFooter) {
        await window.pageUtils.loadFooter();
        const retryFab = document.getElementById('chat-widget-fab');
        if (retryFab) {
            retryFab.click();
            return true;
        }
    }

    return false;
};

document.addEventListener('DOMContentLoaded', async () => {
    // Nếu có hàm pageUtils, load Header/Footer dùng chung
    if (window.pageUtils && window.pageUtils.loadHeader) {
        await window.pageUtils.loadHeader();
    }
    if (window.pageUtils && window.pageUtils.loadFooter) {
        await window.pageUtils.loadFooter();
    }
    
    await initAiChat();
    loadChatHistory();
});

async function initAiChat() {
    // 1. DOM Elements
    let fab = document.getElementById('chat-widget-fab');
    let popup = document.getElementById('chat-popup-container');

    // Nếu chưa có Widget Chat trong DOM (do đang ở trang khác index.html), load động từ component
    if (!fab || !popup) {
        try {
            const widgetUrl = (window.pageUtils && typeof window.pageUtils.resolveUrl === 'function')
                ? window.pageUtils.resolveUrl('components/chat-widget.html')
                : '../components/chat-widget.html';
                
            const response = await fetch(widgetUrl);
            if (response.ok) {
                const html = await response.text();
                // Inject widget vào cuối body
                document.body.insertAdjacentHTML('beforeend', html);
                
                // Cập nhật lại các DOM element
                fab = document.getElementById('chat-widget-fab');
                popup = document.getElementById('chat-popup-container');
            }
        } catch (e) {
            console.error('Không thể load chat widget:', e);
            return;
        }
    }

    if (!fab || !popup) return;

    const fabChatIcon = document.getElementById('fab-chat-icon');
    const fabCloseIcon = document.getElementById('fab-close-icon');

    const homeView = document.getElementById('chat-home-view');
    const chatView = document.getElementById('chat-messages-view');
    
    const startConvBtn = document.getElementById('start-conversation-btn');
    const chatBackBtn = document.getElementById('chat-back-to-home');
    
    const navBtnHome = document.getElementById('nav-btn-home');
    const navBtnMessages = document.getElementById('nav-btn-messages');
    
    const chatInput = document.getElementById('chat-input-field');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatBox = document.getElementById('chat-messages-box');

    const contextualHints = {
        booking: {
            title: 'Bạn đang đặt vé',
            description: 'Hỏi tôi về loại vé, số lượng, thời gian sự kiện, hoặc để tôi hướng dẫn từng bước đặt vé nhanh và rõ ràng.',
            placeholder: 'Hỏi về đặt vé, loại vé hoặc bước tiếp theo...'
        },
        payment: {
            title: 'Bạn đang thanh toán',
            description: 'Hỏi tôi về phương thức thanh toán, trạng thái đơn hàng, mã đơn, hoặc cách tiếp tục thanh toán khi gặp sự cố.',
            placeholder: 'Hỏi về thanh toán, mã đơn hoặc lỗi giao dịch...'
        },
        reset: {
            title: 'Bạn đang quên mật khẩu',
            description: 'Hỏi tôi về gửi liên kết đặt lại, kiểm tra email spam, hoặc xử lý lỗi đổi mật khẩu.',
            placeholder: 'Hỏi về quên mật khẩu hoặc đặt lại mật khẩu...'
        },
        guest: {
            title: 'Khách vãng lai',
            description: 'Hỏi tôi về đăng ký tài khoản, đăng nhập, tìm sự kiện, lọc theo địa điểm/ngày, hoặc xem ưu đãi và hướng dẫn đặt vé.',
            placeholder: 'Hỏi về đăng ký, đăng nhập hoặc tìm sự kiện...'
        },
        discovery: {
            title: 'Bạn đang khám phá sự kiện',
            description: 'Hỏi tôi về sự kiện nổi bật, loại sự kiện, địa điểm, ngày, ngân sách hoặc gợi ý phù hợp cho bạn.',
            placeholder: 'Tìm sự kiện theo loại, địa điểm hoặc ưu đãi...'
        }
    };

    const headerContainer = chatBackBtn ? chatBackBtn.parentElement : null;
    let aiStatusPill = null;
    let aiStatusText = null;

    function ensureAiStatusBadge() {
        if (!headerContainer) {
            return null;
        }

        let badge = document.getElementById('ai-status-pill');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'ai-status-pill';
            badge.className = 'flex items-center gap-2 rounded-full px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-bold hidden';
            badge.innerHTML = `
                <span class="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span id="ai-status-text">AI chưa được cấu hình</span>
            `;
            headerContainer.appendChild(badge);
        }

        aiStatusPill = badge;
        aiStatusText = document.getElementById('ai-status-text');
        return badge;
    }

    function setAiStatusMode(isActive, text) {
        if (!aiStatusPill || !aiStatusText) {
            return;
        }

        aiStatusText.textContent = text || 'AI chưa được cấu hình';
        aiStatusPill.classList.remove('hidden');

        if (isActive) {
            aiStatusPill.classList.remove('bg-amber-50', 'text-amber-700', 'border-amber-100');
            aiStatusPill.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-100');
            aiStatusPill.querySelector('span')?.classList.remove('bg-amber-500');
            aiStatusPill.querySelector('span')?.classList.add('bg-emerald-500');
        } else {
            aiStatusPill.classList.remove('bg-emerald-50', 'text-emerald-700', 'border-emerald-100');
            aiStatusPill.classList.add('bg-amber-50', 'text-amber-700', 'border-amber-100');
            aiStatusPill.querySelector('span')?.classList.remove('bg-emerald-500');
            aiStatusPill.querySelector('span')?.classList.add('bg-amber-500');
        }
    }

    async function syncAiStatus() {
        const badge = ensureAiStatusBadge();
        if (!badge) {
            return;
        }

        try {
            if (!window.apiClient) {
                setAiStatusMode(false, 'AI chưa được cấu hình');
                return;
            }

            const status = await window.apiClient.get('/api/vtd/public/ai-chat/status');
            const configured = status?.configured === true;
            setAiStatusMode(configured, status?.statusText || (configured ? 'AI thật đang hoạt động' : 'AI chưa được cấu hình'));
        } catch (error) {
            console.error('Không thể tải trạng thái AI:', error);
            setAiStatusMode(false, 'AI chưa sẵn sàng');
        }
    }

    function getFriendlyFallbackMessage() {
        return 'AI hiện chưa được bật trên hệ thống, nhưng bạn vẫn có thể dùng trợ lý này để đăng ký/đăng nhập, tìm sự kiện, và làm quen với quy trình đặt vé. Nếu muốn bật AI thật, hãy cấu hình AI_CHAT_API_KEY và provider (openai, azure-openai hoặc gemini), sau đó khởi động lại backend.';
    }

    function getCurrentContextHint() {
        const pathname = window.location.pathname.toLowerCase();

        if (
            pathname.includes('login.html') ||
            pathname.includes('register.html') ||
            pathname.includes('/login') ||
            pathname.includes('/register')
        ) {
            return contextualHints.guest;
        }

        if (
            pathname.includes('all-events.html') ||
            pathname.includes('venues.html') ||
            pathname.includes('index.html') ||
            pathname === '/' ||
            pathname.includes('/all-events') ||
            pathname.includes('/venues')
        ) {
            return contextualHints.discovery;
        }

        if (pathname.includes('payment.html') || pathname.includes('/payment')) {
            return contextualHints.payment;
        }

        if (
            pathname.includes('forgot-password-link.html') ||
            pathname.includes('reset-password.html') ||
            pathname.includes('reset-password-token.html') ||
            pathname.includes('/forgot-password') ||
            pathname.includes('/reset-password')
        ) {
            return contextualHints.reset;
        }

        if (
            pathname.includes('event-detail.html') ||
            pathname.includes('cart.html') ||
            pathname.includes('/event-detail') ||
            pathname.includes('/cart')
        ) {
            return contextualHints.booking;
        }

        return contextualHints.guest;
    }

    function applyContextualHints() {
        const context = getCurrentContextHint();
        const helperCard = homeView?.querySelector('.bg-white.rounded-2xl.p-5');
        const helperTitle = helperCard?.querySelector('span.text-sm.font-bold');
        const helperDesc = helperCard?.querySelector('span.text-xs.text-gray-500.font-medium.leading-relaxed');

        if (context && helperTitle && helperDesc) {
            helperTitle.textContent = context.title;
            helperDesc.textContent = context.description;
        }

        if (chatInput) {
            chatInput.placeholder = context?.placeholder || 'Gửi tin nhắn...';
            chatInput.title = context?.description || '';
        }
    }

    let sessionCode = "";

    // ==========================================
    // A. POPUP VISIBILITY TOGGLE (OPEN / CLOSE)
    // ==========================================
    fab.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = popup.classList.contains('hidden');
        if (isHidden) {
            popup.classList.remove('hidden');
            fabChatIcon.classList.add('hidden');
            fabCloseIcon.classList.remove('hidden');
        } else {
            popup.classList.add('hidden');
            fabChatIcon.classList.remove('hidden');
            fabCloseIcon.classList.add('hidden');
        }
    });

    // Close on clicking outside
    window.addEventListener('click', (e) => {
        if (popup && !popup.classList.contains('hidden') && !popup.contains(e.target) && !fab.contains(e.target)) {
            popup.classList.add('hidden');
            fabChatIcon.classList.remove('hidden');
            fabCloseIcon.classList.add('hidden');
        }
    });

    popup.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // ==========================================
    // B. NAVIGATION & VIEW SWITCHING
    // ==========================================
    const switchToHomeView = () => {
        homeView.classList.remove('hidden');
        chatView.classList.add('hidden');
        
        // Active Navigation highlights
        navBtnHome.classList.add('text-orange-500');
        navBtnHome.classList.remove('text-slate-405', 'hover:text-orange-500');
        navBtnMessages.classList.remove('text-orange-500');
        navBtnMessages.classList.add('text-slate-400', 'hover:text-orange-500');
    };

    const switchToChatView = () => {
        homeView.classList.add('hidden');
        chatView.classList.remove('hidden');
        applyContextualHints();
        
        // Active Navigation highlights
        navBtnMessages.classList.add('text-orange-500');
        navBtnMessages.classList.remove('text-slate-400', 'hover:text-orange-500');
        navBtnHome.classList.remove('text-orange-500');
        navBtnHome.classList.add('text-slate-400', 'hover:text-orange-500');

        // Khởi tạo phiên làm việc mới nếu chưa có
        if (!sessionCode) {
            generateChatSession();
        }
    };

    if (startConvBtn) startConvBtn.addEventListener('click', switchToChatView);
    if (chatBackBtn) chatBackBtn.addEventListener('click', switchToHomeView);
    if (navBtnHome) navBtnHome.addEventListener('click', switchToHomeView);
    if (navBtnMessages) navBtnMessages.addEventListener('click', switchToChatView);

    applyContextualHints();

    // ==========================================
    // C. SESSION GENERATION & CHAT CORE LOGIC
    // ==========================================
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
            sessionCode = response.sessionCode || '';

            if (!sessionCode) {
                throw new Error('Không nhận được sessionCode hợp lệ từ máy chủ.');
            }
        } catch (error) {
            console.error('Không thể lấy session code từ server:', error);
            throw error;
        }
    }

    async function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // 1. Render tin nhắn User
        appendMessage('user', message);
        chatInput.value = '';

        try {
            if (!window.apiClient) {
                appendMessage('ai', getFriendlyFallbackMessage());
                return;
            }

            const status = await window.apiClient.get('/api/vtd/public/ai-chat/status');
            if (status?.configured !== true) {
                appendMessage('ai', getFriendlyFallbackMessage());
                return;
            }
        } catch (error) {
            console.warn('Không thể kiểm tra trạng thái AI trước khi gửi tin nhắn:', error);
        }

        // 2. Tạo session nếu chưa có
        if (!sessionCode) {
            try {
                await generateChatSession();
            } catch (error) {
                appendMessage('ai', 'Không thể kết nối đến hệ thống chat ngay lúc này. Vui lòng thử lại sau.');
                return;
            }
        }

        // 3. Render biểu tượng AI đang xử lý (loading dots)
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'flex gap-2.5 items-start animate-pulse';
        loadingDiv.id = 'ai-chat-loading-indicator';
        loadingDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center flex-shrink-0 font-bold"><i class="fas fa-robot text-xs"></i></div>
            <div class="bg-white border border-gray-150 p-3 rounded-2xl shadow-sm max-w-[80%] leading-relaxed font-semibold text-slate-400">
                AI đang suy nghĩ...
            </div>
        `;
        chatBox.appendChild(loadingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        // 4. Gọi API
        try {
            const apiClient = requireApiClient();
            const response = await apiClient.post('/api/vtd/public/ai-chat/message', {
                sessionCode,
                message
            });

            const aiText = response.aiResponse?.messageText || response.aiResponse?.message || response.aiResponse?.content || response.aiResponse?.response || 'AI chưa trả lời.';

            // Xóa loading dots
            const loader = document.getElementById('ai-chat-loading-indicator');
            if (loader) loader.remove();

            // Render tin nhắn AI
            appendMessage('ai', aiText);

        } catch (error) {
            console.error('Lỗi gửi tin nhắn AI:', error);
            const loader = document.getElementById('ai-chat-loading-indicator');
            if (loader) loader.remove();
            appendMessage('ai', 'Không thể gửi tin nhắn ngay lúc này. Vui lòng thử lại sau.');
        }
    }

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'flex gap-2.5 items-start';
        
        if (sender === 'user') {
            msgDiv.className += ' justify-end';
            msgDiv.innerHTML = `
                <div class="bg-orange-500 text-white p-3 rounded-2xl shadow-sm max-w-[85%] leading-relaxed font-semibold rounded-tr-none">
                    ${text}
                </div>
            `;
        } else {
            msgDiv.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center flex-shrink-0 font-bold"><i class="fas fa-robot text-xs"></i></div>
                <div class="bg-white border border-gray-150 p-3 rounded-2xl shadow-sm max-w-[85%] leading-relaxed font-semibold text-slate-800 rounded-tl-none">
                    ${text}
                </div>
            `;
        }
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }

    await syncAiStatus();

    const btnRefreshHistory = document.getElementById('btn-refresh-history');
    if (btnRefreshHistory) {
        btnRefreshHistory.addEventListener('click', loadChatHistory);
    }
}

// ==========================================
// D. LOAD CHAT HISTORY & SESSIONS
// ==========================================
async function loadChatHistory() {
    const homeContainer = document.getElementById('chat-history-container');
    const sidebarContainer = document.getElementById('chat-sidebar-sessions');
    
    const token = localStorage.getItem('token');
    if (!token) {
        const loginUrl = (window.pageUtils && typeof window.pageUtils.resolveUrl === 'function') 
            ? window.pageUtils.resolveUrl('pages/user/login.html') 
            : 'pages/user/login.html';
            
        const unauthMsg = `
            <div class="bg-orange-50 border border-orange-100 p-4 rounded-xl flex flex-col items-center gap-2 text-center mx-2 my-4">
                <i class="fas fa-lock text-orange-400 text-lg"></i>
                <span class="text-xs font-bold text-orange-800">Đăng nhập để xem lịch sử</span>
                <a href="${loginUrl}" class="mt-1 text-[10px] font-black uppercase text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-full transition-colors">Đăng nhập ngay</a>
            </div>
        `;
        if (homeContainer) homeContainer.innerHTML = unauthMsg;
        if (sidebarContainer) sidebarContainer.innerHTML = unauthMsg;
        return;
    }

    if (!window.apiClient) {
        const errorMsg = '<div class="text-center py-4 text-[10px] font-bold text-red-400 bg-red-50 rounded-xl mx-2">Không thể tải lịch sử chat lúc này.</div>';
        if (homeContainer) homeContainer.innerHTML = errorMsg;
        if (sidebarContainer) sidebarContainer.innerHTML = errorMsg;
        return;
    }
    
    const loadingHtml = '<div class="text-center py-4 text-[10px] font-bold text-gray-400"><i class="fas fa-spinner fa-spin mr-1"></i> Đang tải...</div>';
    if (homeContainer) homeContainer.innerHTML = loadingHtml;
    if (sidebarContainer) sidebarContainer.innerHTML = loadingHtml;
    
    try {
        const sessions = await window.apiClient.get('/api/vtd/member/ai-chat/sessions');
        
        if (!sessions || sessions.length === 0) {
            const emptyMsg = '<div class="text-center py-4 text-[10px] font-bold text-gray-400 border border-gray-100 rounded-xl bg-gray-50 mx-2">Chưa có lịch sử trò chuyện.</div>';
            if (homeContainer) homeContainer.innerHTML = emptyMsg;
            if (sidebarContainer) sidebarContainer.innerHTML = emptyMsg;
            return;
        }
        
        // Render danh sách session
        const renderSessions = (limit) => sessions.slice(0, limit).map(session => {
            const dateStr = session.createdAt ? new Date(session.createdAt).toLocaleDateString('vi-VN') : '';
            return `
                <button type="button" onclick="loadSessionHistory('${session.sessionCode}')" class="w-full text-left bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:border-brand-orange hover:shadow-md transition-all flex items-center justify-between group mb-2">
                    <div class="flex flex-col gap-1 overflow-hidden">
                        <span class="text-xs font-bold text-gray-800 truncate"><i class="far fa-comment-dots text-gray-400 mr-1 group-hover:text-brand-orange"></i> Phiên ${session.sessionCode.substring(0,8)}</span>
                        <span class="text-[9px] text-gray-400 font-medium">${dateStr}</span>
                    </div>
                    <div class="w-6 h-6 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors">
                        <i class="fas fa-chevron-right text-[10px]"></i>
                    </div>
                </button>
            `;
        }).join('');
        
        if (homeContainer) homeContainer.innerHTML = renderSessions(3); // Home chỉ hiện 3 cái mới nhất
        if (sidebarContainer) sidebarContainer.innerHTML = renderSessions(sessions.length); // Sidebar hiện tất cả
        
    } catch (error) {
        console.error("Lỗi tải danh sách session:", error);
        const errorMsg = '<div class="text-center py-4 text-[10px] font-bold text-red-400 bg-red-50 rounded-xl mx-2">Không thể tải lịch sử.</div>';
        if (homeContainer) homeContainer.innerHTML = errorMsg;
        if (sidebarContainer) sidebarContainer.innerHTML = errorMsg;
    }
}

// ==========================================
// E. LOAD A SPECIFIC SESSION'S HISTORY
// ==========================================
window.loadSessionHistory = async function(code) {
    if (!code) return;

    if (!window.apiClient) {
        console.error('Không thể tải lịch sử phiên vì apiClient chưa sẵn sàng.');
        return;
    }
    
    // Đổi view sang Chat
    const homeView = document.getElementById('chat-home-view');
    const chatView = document.getElementById('chat-messages-view');
    const chatBox = document.getElementById('chat-messages-box');
    if (homeView && chatView) {
        homeView.classList.add('hidden');
        chatView.classList.remove('hidden');
    }
    
    // Đặt sessionCode hiện tại
    sessionCode = code;
    
    // Clear chat box và hiển thị loading
    if (chatBox) {
        chatBox.innerHTML = `
            <div class="flex items-center justify-center h-full flex-col gap-3">
                <i class="fas fa-spinner fa-spin text-3xl text-brand-orange"></i>
                <span class="text-xs font-bold text-gray-400">Đang tải lịch sử phiên...</span>
            </div>
        `;
    }
    
    // Ẩn sidebar trên mobile nếu đang mở
    const sidebar = document.getElementById('chat-sidebar');
    if (sidebar && sidebar.classList.contains('flex') && !sidebar.classList.contains('hidden')) {
        if (window.innerWidth < 640) {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('flex', 'absolute', 'z-50', 'h-full');
        }
    }
    
    try {
        const historyData = await window.apiClient.get(`/api/vtd/member/ai-chat/history/${code}`);
        chatBox.innerHTML = ''; // Clear loading
        
        if (!historyData || historyData.length === 0) {
            // Render welcome message
            chatBox.innerHTML = `
                <div class="flex gap-3 items-start">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-rose-400 text-white flex items-center justify-center flex-shrink-0 font-bold shadow-sm"><i class="fas fa-crow text-xs"></i></div>
                    <div class="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm max-w-[85%] leading-relaxed rounded-tl-sm text-gray-700">
                        Phiên chat rỗng. Bạn cần hỗ trợ gì?
                    </div>
                </div>
            `;
            return;
        }
        
        // Sắp xếp theo ID hoặc thời gian nếu cần (API thường trả về tăng dần)
        historyData.forEach(msg => {
            const role = msg.senderRole.toLowerCase(); // 'user' hoặc 'ai'
            
            const msgDiv = document.createElement('div');
            msgDiv.className = 'flex gap-2.5 items-start';
            
            if (role === 'user') {
                msgDiv.className += ' justify-end';
                msgDiv.innerHTML = `
                    <div class="bg-orange-500 text-white p-3 rounded-2xl shadow-sm max-w-[85%] leading-relaxed font-semibold rounded-tr-none">
                        ${msg.messageText}
                    </div>
                `;
            } else {
                msgDiv.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center flex-shrink-0 font-bold"><i class="fas fa-robot text-xs"></i></div>
                    <div class="bg-white border border-gray-150 p-3 rounded-2xl shadow-sm max-w-[85%] leading-relaxed font-semibold text-slate-800 rounded-tl-none">
                        ${msg.messageText}
                    </div>
                `;
            }
            chatBox.appendChild(msgDiv);
        });
        
        chatBox.scrollTop = chatBox.scrollHeight;
        
    } catch (error) {
        console.error("Lỗi tải chi tiết phiên:", error);
        chatBox.innerHTML = `
            <div class="flex items-center justify-center h-full flex-col gap-3">
                <div class="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center"><i class="fas fa-exclamation-triangle"></i></div>
                <span class="text-xs font-bold text-gray-400">Không thể tải lịch sử phiên này.</span>
            </div>
        `;
    }
};

// Toggle Sidebar trên Mobile
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('chat-sidebar');
    const chatBox = document.getElementById('chat-messages-box');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            if (sidebar.classList.contains('hidden')) {
                sidebar.classList.remove('hidden');
                sidebar.classList.add('flex', 'absolute', 'z-50', 'h-full', 'shadow-2xl');
            } else {
                sidebar.classList.add('hidden');
                sidebar.classList.remove('flex', 'absolute', 'z-50', 'h-full', 'shadow-2xl');
            }
        });
    }
    
    const newSessionBtn = document.getElementById('btn-new-session');
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', () => {
            // Reset session code để tạo phiên mới
            sessionCode = null;
            if (chatBox) {
                chatBox.innerHTML = `
                    <div class="flex gap-3 items-start">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-rose-400 text-white flex items-center justify-center flex-shrink-0 font-bold shadow-sm"><i class="fas fa-crow text-xs"></i></div>
                        <div class="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm max-w-[85%] leading-relaxed rounded-tl-sm text-gray-700">
                            Phiên mới đã được tạo. Bạn cần hỗ trợ đặt vé hay tìm kiếm sự kiện nào hôm nay?
                        </div>
                    </div>
                `;
            }
            // Ẩn sidebar trên mobile
            if (window.innerWidth < 640 && sidebar && !sidebar.classList.contains('hidden')) {
                sidebar.classList.add('hidden');
                sidebar.classList.remove('flex', 'absolute', 'z-50', 'h-full', 'shadow-2xl');
            }
        });
    }
});