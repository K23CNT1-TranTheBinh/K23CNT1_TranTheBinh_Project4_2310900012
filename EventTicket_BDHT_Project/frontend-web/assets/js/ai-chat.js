document.addEventListener('DOMContentLoaded', async () => {
    // Nếu có hàm pageUtils, load Header/Footer dùng chung
    if (window.pageUtils && window.pageUtils.loadHeader) {
        await window.pageUtils.loadHeader();
    }
    if (window.pageUtils && window.pageUtils.loadFooter) {
        await window.pageUtils.loadFooter();
    }
    
    initAiChat();
    loadChatHistory();
});

function initAiChat() {
    // 1. DOM Elements
    const fab = document.getElementById('chat-widget-fab');
    const popup = document.getElementById('chat-popup-container');
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
    
    let sessionCode = "";

    if (!fab || !popup) return;

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

    // ==========================================
    // C. SESSION GENERATION & CHAT CORE LOGIC
    // ==========================================
    async function generateChatSession() {
        try {
            if (window.apiClient) {
                const response = await window.apiClient.get('/api/nat/public/ai-chat/generate-session');
                sessionCode = response.sessionCode || '';
            } else {
                sessionCode = "MOCK-SESSION-" + Date.now();
            }
        } catch (error) {
            console.error("Không thể lấy session code từ server, sử dụng mock session:", error);
            sessionCode = "MOCK-SESSION-" + Date.now();
        }
    }

    async function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // 1. Render tin nhắn User
        appendMessage('user', message);
        chatInput.value = '';

        // 2. Tạo session nếu chưa có
        if (!sessionCode) {
            await generateChatSession();
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
            let aiText = "Xin lỗi, tôi chưa kết nối được hệ thống.";
            if (window.apiClient) {
                const response = await window.apiClient.post('/api/nat/public/ai-chat/message', {
                    sessionCode,
                    message
                });
                aiText = response.aiResponse?.messageText || response.aiResponse?.message || response.aiResponse?.content || response.aiResponse?.response || 'AI chưa trả lời.';
            } else {
                aiText = "Đây là câu trả lời thử nghiệm từ trợ lý ảo BDHT. Chúng tôi đã nhận được thông điệp: " + message;
            }
            
            // Xóa loading dots
            const loader = document.getElementById('ai-chat-loading-indicator');
            if (loader) loader.remove();

            // Render tin nhắn AI
            appendMessage('ai', aiText);

        } catch (error) {
            console.error("Lỗi gửi tin nhắn AI:", error);
            const loader = document.getElementById('ai-chat-loading-indicator');
            if (loader) loader.remove();
            appendMessage('ai', `Có lỗi xảy ra: ${error.message}. Hãy thử lại.`);
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
    
    const btnRefreshHistory = document.getElementById('btn-refresh-history');
    if (btnRefreshHistory) {
        btnRefreshHistory.addEventListener('click', loadChatHistory);
    }
}

// ==========================================
// D. LOAD CHAT HISTORY
// ==========================================
async function loadChatHistory() {
    const container = document.getElementById('chat-history-container');
    if (!container) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        const loginUrl = (window.pageUtils && typeof window.pageUtils.resolveUrl === 'function') 
            ? window.pageUtils.resolveUrl('pages/user/login.html') 
            : 'pages/user/login.html';
        container.innerHTML = `
            <div class="bg-orange-50 border border-orange-100 p-4 rounded-xl flex flex-col items-center gap-2 text-center">
                <i class="fas fa-lock text-orange-400 text-lg"></i>
                <span class="text-xs font-bold text-orange-800">Đăng nhập để xem lịch sử</span>
                <a href="${loginUrl}" class="mt-1 text-[10px] font-black uppercase text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-full transition-colors">Đăng nhập ngay</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '<div class="text-center py-4 text-[10px] font-bold text-gray-400"><i class="fas fa-spinner fa-spin mr-1"></i> Đang tải lịch sử...</div>';
    
    try {
        const response = await fetch('http://localhost:8080/api/nat/member/ai-chat/my-history', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load history');
        
        const historyData = await response.json();
        
        if (!historyData || historyData.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-[10px] font-bold text-gray-400 border border-gray-100 rounded-xl bg-gray-50">Chưa có lịch sử trò chuyện.</div>';
            return;
        }
        
        // Group by sessionCode (or just render the last 3-5 sessions)
        // Lấy danh sách session duy nhất
        const sessions = [...new Set(historyData.map(msg => msg.sessionCode))].slice(0, 3);
        
        container.innerHTML = sessions.map(code => {
            // Lấy tin nhắn đầu tiên của session làm preview
            const firstMsg = historyData.find(m => m.sessionCode === code);
            const previewText = firstMsg ? (firstMsg.messageText.substring(0, 40) + '...') : 'Phiên trò chuyện';
            
            return `
                <button type="button" class="w-full text-left bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:border-orange-300 hover:shadow-md transition-all flex items-center justify-between group">
                    <div class="flex flex-col gap-1 overflow-hidden">
                        <span class="text-xs font-bold text-gray-800 truncate">${previewText}</span>
                        <span class="text-[9px] text-gray-400 font-medium font-mono uppercase">${code.substring(0,8)}...</span>
                    </div>
                    <div class="w-6 h-6 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors">
                        <i class="fas fa-chevron-right text-[10px]"></i>
                    </div>
                </button>
            `;
        }).join('');
        
    } catch (error) {
        console.error("Lỗi tải lịch sử chat:", error);
        container.innerHTML = '<div class="text-center py-4 text-[10px] font-bold text-red-400 bg-red-50 rounded-xl">Không thể tải lịch sử lúc này.</div>';
    }
}
