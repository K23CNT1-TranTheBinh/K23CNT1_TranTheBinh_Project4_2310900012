/**
 * Admin Security Guard - BDHT Ticketing Platform
 * Ngăn chặn tuyệt đối các truy cập trái phép vào trang quản trị Admin.
 */
(function () {
    // 1. Kiểm tra nhanh (Đồng bộ): Tránh hiện tượng nháy giao diện (Flash content)
    const token = localStorage.getItem('token');
    const currentUserStr = localStorage.getItem('currentUser');

    let isAuthorized = false;
    if (token && currentUserStr) {
        try {
            const user = JSON.parse(currentUserStr);
            // Hỗ trợ cả vai trò ADMIN và ROLE_ADMIN
            if (user.role === 'ADMIN' || user.role === 'ROLE_ADMIN') {
                isAuthorized = true;
            }
        } catch (e) {
            console.error('[Admin Auth Guard] Lỗi phân tích thông tin người dùng:', e);
        }
    }

    if (!isAuthorized) {
        alert('⛔ Cảnh báo bảo mật: Bạn không có quyền truy cập khu vực Quản trị viên!');
        // Chuyển hướng ngay lập tức về trang đăng nhập
        window.location.href = '../user/login.html';
        return;
    }

    // 2. Xác thực thời gian thực (Bất đồng bộ): Gọi API Backend để kiểm tra token còn sống và vai trò chuẩn xác
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            // Tận dụng địa chỉ API cơ sở từ apiClient hoặc dùng mặc định
            const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:8080';
            const response = await fetch(`${apiBase}/api/vtd/member/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Xác thực token thất bại! HTTP Status: ${response.status}`);
            }

            const activeUser = await response.json();
            
            // Xác thực xem vai trò lấy từ Backend có thực sự là ADMIN không
            if (activeUser.role !== 'ADMIN' && activeUser.role !== 'ROLE_ADMIN') {
                throw new Error('Vai trò của người dùng không phải là Quản trị viên.');
            }

            // Đồng bộ lại thông tin người dùng mới nhất từ server
            localStorage.setItem('currentUser', JSON.stringify(activeUser));
            console.log('[Admin Auth Guard] Xác thực quản trị viên thành công. Chào mừng', activeUser.fullName);
        } catch (error) {
            console.error('[Admin Auth Guard] Từ chối quyền truy cập do lỗi xác thực:', error);
            alert('🔒 Phiên làm việc đã hết hạn hoặc tài khoản không có quyền Admin. Vui lòng đăng nhập lại.');
            
            // Xóa sạch thông tin cũ để tránh vòng lặp lỗi
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            
            window.location.href = '../user/login.html';
        }
    });
})();
