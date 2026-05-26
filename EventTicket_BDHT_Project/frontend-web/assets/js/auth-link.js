document.addEventListener('DOMContentLoaded', () => {
    // Tải Header
    if (window.pageUtils && typeof window.pageUtils.loadHeader === 'function') {
        window.pageUtils.loadHeader();
    }

    // 1. XỬ LÝ FORM GỬI LINK (forgot-password-link.html)
    const forgotPassLinkForm = document.getElementById('forgotPassLinkForm');
    if (forgotPassLinkForm) {
        forgotPassLinkForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('emailLink').value.trim();
            const msgBox = document.getElementById('link-msg');
            const btnSubmit = document.getElementById('btn-send-link');
            
            if (!email) return;
            
            // UI Loading state
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
            btnSubmit.disabled = true;
            msgBox.classList.add('hidden');
            
            try {
                // Gọi API gửi link (POST /auth/forgot-password-link)
                const response = await window.apiClient.post('/api/vtd/public/auth/forgot-password-link', { email });
                
                // Thành công
                msgBox.className = 'font-bold text-sm p-4 rounded-xl text-center bg-green-50 text-green-600 border border-green-100 mb-4 block';
                msgBox.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Link khôi phục đã được gửi. Vui lòng kiểm tra email của bạn!';
                forgotPassLinkForm.reset();
            } catch (error) {
                // Thất bại
                msgBox.className = 'font-bold text-sm p-4 rounded-xl text-center bg-red-50 text-red-600 border border-red-100 mb-4 block';
                msgBox.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i> ${error.message || 'Có lỗi xảy ra, vui lòng thử lại sau.'}`;
            } finally {
                // Khôi phục nút
                btnSubmit.innerHTML = '<span>Gửi Link Khôi Phục</span>';
                btnSubmit.disabled = false;
            }
        });
    }

    // 2. XỬ LÝ TRANG TẠO MẬT KHẨU MỚI TỪ LINK (reset-password-token.html)
    const resetPassTokenForm = document.getElementById('resetPassTokenForm');
    const invalidTokenMsg = document.getElementById('invalid-token-msg');
    
    if (resetPassTokenForm || invalidTokenMsg) {
        // Lấy token từ URL: ?token=xyz
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (!token) {
            // Không có token trong URL
            if (resetPassTokenForm) resetPassTokenForm.classList.add('hidden');
            if (invalidTokenMsg) invalidTokenMsg.classList.remove('hidden');
        } else {
            // Có token, hiện form
            if (resetPassTokenForm) resetPassTokenForm.classList.remove('hidden');
            if (invalidTokenMsg) invalidTokenMsg.classList.add('hidden');
            
            // Xử lý submit form
            resetPassTokenForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const msgBox = document.getElementById('reset-msg');
                const btnSubmit = document.getElementById('btn-reset-token');
                
                msgBox.classList.remove('hidden');
                
                if (newPassword !== confirmPassword) {
                    msgBox.className = 'font-bold text-sm p-4 rounded-xl text-center bg-red-50 text-red-600 border border-red-100 mb-4 block';
                    msgBox.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> Mật khẩu xác nhận không khớp!';
                    return;
                }
                
                if (newPassword.length < 6) {
                    msgBox.className = 'font-bold text-sm p-4 rounded-xl text-center bg-amber-50 text-amber-600 border border-amber-100 mb-4 block';
                    msgBox.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i> Mật khẩu phải có ít nhất 6 ký tự!';
                    return;
                }
                
                // UI Loading state
                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đổi mật khẩu...';
                btnSubmit.disabled = true;
                
                try {
                    // Gọi API đổi mật khẩu bằng token (POST /auth/reset-password-token)
                    await window.apiClient.post('/api/vtd/public/auth/reset-password-token', {
                        token: token,
                        newPassword: newPassword
                    });
                    
                    // Thành công
                    msgBox.className = 'font-bold text-sm p-4 rounded-xl text-center bg-green-50 text-green-600 border border-green-100 mb-4 block';
                    msgBox.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Đổi mật khẩu thành công! Tự động chuyển trang...';
                    resetPassTokenForm.reset();
                    
                    // Chuyển hướng về login sau 2 giây
                    setTimeout(() => {
                        const loginUrl = (window.pageUtils && typeof window.pageUtils.resolveUrl === 'function') 
                            ? window.pageUtils.resolveUrl('pages/user/login.html') 
                            : 'login.html';
                        window.location.href = loginUrl;
                    }, 2000);
                    
                } catch (error) {
                    // Thất bại
                    msgBox.className = 'font-bold text-sm p-4 rounded-xl text-center bg-red-50 text-red-600 border border-red-100 mb-4 block';
                    msgBox.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i> ${error.message || 'Token không hợp lệ hoặc đã hết hạn.'}`;
                    
                    // Khôi phục nút
                    btnSubmit.innerHTML = '<span>Đổi Mật Khẩu</span>';
                    btnSubmit.disabled = false;
                }
            });
        }
    }
});
