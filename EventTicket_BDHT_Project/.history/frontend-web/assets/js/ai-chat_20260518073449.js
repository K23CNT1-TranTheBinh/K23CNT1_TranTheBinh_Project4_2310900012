document.addEventListener('DOMContentLoaded', async () => {
    await window.pageUtils.loadHeader();
    initAiChat();
});

async function initAiChat() {
    const sessionInput = document.getElementById('session-code');
    const chatBox = document.getElementById('chat-box');
    const sendButton = document.getElementById('btn-send');
    const newSessionButton = document.getElementById('btn-new-session');
    const messageInput = document.getElementById('chat-message');

    if (!sessionInput || !chatBox || !sendButton || !newSessionButton || !messageInput) return;

    async function newSession() {
        try {
            const response = await window.apiClient.get('/api/vtd/public/ai-chat/generate-session');
            sessionInput.value = response.sessionCode || '';
            chatBox.innerHTML = '<div class="chat-message">Phiên chat mới đã được tạo. Hãy bắt đầu đặt câu hỏi.</div>';
        } catch (error) {
            chatBox.innerHTML = `<div class="chat-message" style="color:red;">Không thể tạo phiên chat: ${error.message}</div>`;
        }
    }

    newSessionButton.addEventListener('click', (e) => {
        e.preventDefault();
        newSession();
    });

    sendButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message) return;
        const sessionCode = sessionInput.value.trim();
        if (!sessionCode) {
            chatBox.innerHTML = '<div class="chat-message" style="color:red;">Vui lòng tạo phiên chat trước khi gửi tin nhắn.</div>';
            return;
        }

        appendChatMessage('Bạn', message, 'user');
        messageInput.value = '';

        try {
            const response = await window.apiClient.post('/api/vtd/public/ai-chat/message', {
                sessionCode,
                message
            });
            const aiText = response.aiResponse?.messageText || response.aiResponse?.message || response.aiResponse?.content || response.aiResponse?.response || 'AI chưa trả lời.';
            appendChatMessage('AI', aiText, 'ai');
        } catch (error) {
            appendChatMessage('AI', `Có lỗi: ${error.message}`, 'ai');
        }
    });

    function appendChatMessage(author, text, type) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${type}`;
        messageElement.innerHTML = `<div class="message-label"><strong>${author}:</strong> ${text}</div>`;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    await newSession();
}
