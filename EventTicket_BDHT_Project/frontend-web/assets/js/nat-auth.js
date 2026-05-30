document.addEventListener('DOMContentLoaded', () => {
    window.pageUtils.loadHeader();
    setupLogin();
    setupRegister();
    setupSocialLogin();
    setupGlobalLogout();
    checkFacebookCallback(); // Tự động xử lý khi được Redirect từ Facebook về
});

const SOCIAL_AUTH_CONFIG = window.SOCIAL_AUTH_CONFIG || {};

function isConfigured(value) {
    return value && !value.startsWith('YOUR_');
}

function setLoginMessage(message, color = 'red') {
    const msgBox = document.getElementById('login-msg') || document.getElementById('login-error');
    if (!msgBox) return;
    msgBox.style.display = 'block';
    msgBox.innerHTML = `<span style="color: ${color};">${message}</span>`;
}

function redirectAfterLogin(user) {
    const userRole = user.role || 'USER';
    if (userRole === 'ADMIN' || userRole === 'ROLE_ADMIN') {
        window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('pages/admin/lpth_dashboard.html') : '../admin/lpth_dashboard.html';
    } else {
        window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('pages/nat-index.html') : '../../index.html';
    }
}

async function handleAuthSuccess(response) {
    if (!response || !response.user) {
        throw new Error('Khong nhan duoc du lieu user tu may chu.');
    }

    const previousUserKey = window.cartSession ? window.cartSession.getUserKey() : null;
    const nextUserKey = window.cartSession ? window.cartSession.getUserKey(response.user) : null;
    if (previousUserKey && nextUserKey && previousUserKey !== nextUserKey) {
        window.cartSession.clear();
    }

    if (response.token) {
        window.apiClient.setToken(response.token);
    }
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    redirectAfterLogin(response.user);
}

// ==========================================
// 1. LOGIN
// ==========================================
function setupLogin() {
    const loginForm = document.getElementById('loginForm') || document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('email') || document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const errorMsg = document.getElementById('login-msg') || document.getElementById('login-error');

        if (!errorMsg) return;
        errorMsg.style.display = 'block';
        errorMsg.innerHTML = '<span style="color: blue;">Dang kiem tra thong tin xac thuc...</span>';

        try {
            const response = await window.apiClient.post('/api/vtd/public/auth/login', {
                email: emailInput.value,
                password: passwordInput.value
            });

            if (response && response.user) {
                errorMsg.innerHTML = `<span style="color: green;">${response.message || 'Dang nhap thanh cong! Dang chuyen huong...'}</span>`;
                setTimeout(() => {
                    handleAuthSuccess(response);
                }, 800);
            } else if (response && response.error) {
                throw new Error(response.error);
            } else {
                throw new Error('Khong nhan duoc du lieu user tu may chu.');
            }
        } catch (error) {
            console.error('Loi dang nhap:', error);
            const errorText = (error.message || '').toLowerCase();
            if (errorText.includes('khoa') || errorText.includes('locked')) {
                errorMsg.innerHTML = '<span style="color: orange;">Tai khoan cua ban da bi khoa! Lien he quan tri vien.</span>';
            } else {
                errorMsg.innerHTML = `<span style="color: red;">${error.message || 'Dang nhap that bai.'}</span>`;
            }
        }
    });
}

// ==========================================
// 2. REGISTER
// ==========================================
function setupRegister() {
    const registerForm = document.getElementById('registerForm') || document.getElementById('register-form');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullName')?.value || document.getElementById('reg-username')?.value;
        const email = document.getElementById('email')?.value || document.getElementById('reg-email')?.value;
        const phoneNumber = document.getElementById('phoneNumber')?.value || '';
        const password = document.getElementById('password')?.value || document.getElementById('reg-password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const msgBox = document.getElementById('register-msg');

        if (!msgBox) return;
        msgBox.style.display = 'block';

        if (confirmPassword && password !== confirmPassword) {
            msgBox.innerHTML = '<span style="color: red;">Mat khau xac nhan khong khop!</span>';
            return;
        }

        msgBox.innerHTML = '<span style="color: blue;">Dang tao tai khoan...</span>';

        try {
            const response = await window.apiClient.post('/api/vtd/public/auth/register', {
                fullName: fullName,
                email: email,
                phoneNumber: phoneNumber,
                password: password
            });

            msgBox.innerHTML = `<span style="color: green;">${response.message || 'Dang ky thanh cong! Dang chuyen huong...'}</span>`;
            setTimeout(() => {
                window.location.href = './nat-login.html';
            }, 1200);
        } catch (error) {
            msgBox.innerHTML = `<span style="color: red;">${error.message || 'Dang ky that bai. Vui long thu lai.'}</span>`;
        }
    });
}



function setupSocialLogin() {
    const btnGoogle = document.getElementById('btn-google');
    const btnFacebook = document.getElementById('btn-facebook');

    if (btnGoogle) {
        btnGoogle.addEventListener('click', loginWithGoogle);
    }
    if (btnFacebook) {
        btnFacebook.addEventListener('click', (e) => {
            e.preventDefault();
            loginWithFacebook();
        });
    }


}

function loginWithGoogle() {
    if (!isConfigured(SOCIAL_AUTH_CONFIG.googleClientId)) {
        setLoginMessage('Vui long cau hinh Google Client ID trong login.html truoc khi dung dang nhap Google.');
        return;
    }
    if (!window.google || !google.accounts || !google.accounts.oauth2) {
        setLoginMessage('Google SDK chua tai xong, vui long thu lai sau vai giay.');
        return;
    }

    setLoginMessage('Dang mo dang nhap Google...', 'blue');
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: SOCIAL_AUTH_CONFIG.googleClientId,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
            if (!tokenResponse || !tokenResponse.access_token) {
                setLoginMessage('Google khong tra ve token dang nhap.');
                return;
            }

            try {
                const response = await window.apiClient.post('/api/vtd/public/auth/social-login', {
                    provider: 'google',
                    accessToken: tokenResponse.access_token
                });
                setLoginMessage(response.message || 'Dang nhap Google thanh cong! Dang chuyen huong...', 'green');
                setTimeout(() => handleAuthSuccess(response), 600);
            } catch (error) {
                setLoginMessage(error.message || 'Dang nhap Google that bai.');
            }
        }
    });
    tokenClient.requestAccessToken();
}

function loginWithFacebook() {
    if (!isConfigured(SOCIAL_AUTH_CONFIG.facebookAppId)) {
        setLoginMessage('Vui lòng cấu hình Facebook App ID trong login.html trước khi dùng đăng nhập Facebook.');
        return;
    }
    if (!window.FB) {
        setLoginMessage('Facebook SDK chưa tải xong, vui lòng thử lại sau vài giây.');
        return;
    }

    const appId = SOCIAL_AUTH_CONFIG.facebookAppId;
    let redirectUri = window.location.href.split('#')[0]; // URL trang hiện tại
    if (redirectUri.includes('127.0.0.1')) {
        redirectUri = redirectUri.replace('127.0.0.1', 'localhost');
    }

    // [GIẢI PHÁP ĐẶC BIỆT CHO LOCAL DEV] 
    // Nếu chạy qua giao thức HTTP thường ở localhost/127.0.0.1, sử dụng phương thức Direct Redirect để không bị SDK chặn HTTPS
    if (window.location.protocol !== 'https:' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        setLoginMessage('Đang chuyển hướng sang trang đăng nhập của Facebook...', 'blue');
        
        const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=public_profile,email`;
        
        setTimeout(() => {
            window.location.href = oauthUrl;
        }, 500);
        return;
    }

    // Nếu chạy trên HTTPS thực tế (Production), mở Popup SDK mượt mà
    setLoginMessage('Đang mở đăng nhập Facebook...', 'blue');
    FB.login(async (fbResponse) => {
        if (!fbResponse || !fbResponse.authResponse || !fbResponse.authResponse.accessToken) {
            setLoginMessage('Bạn đã hủy đăng nhập Facebook hoặc Facebook không trả về token.');
            return;
        }

        const accessToken = fbResponse.authResponse.accessToken;
        try {
            const response = await window.apiClient.post('/api/vtd/public/auth/social-login', {
                provider: 'facebook',
                accessToken
            });
            setLoginMessage(response.message || 'Đăng nhập Facebook thành công! Đang chuyển hướng...', 'green');
            setTimeout(() => handleAuthSuccess(response), 600);
        } catch (error) {
            setLoginMessage(error.message || 'Đăng nhập Facebook thất bại.');
        }
    }, { scope: 'public_profile,email' });
}

/**
 * Lắng nghe và xử lý tự động khi Facebook Redirect ngược về kèm Token (#access_token=...)
 */
async function checkFacebookCallback() {
    if (window.location.hash && window.location.hash.includes('access_token=')) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        
        if (accessToken) {
            // Xóa dấu hash trên thanh URL để tăng tính thẩm mỹ
            window.history.replaceState(null, null, window.location.pathname);
            
            setLoginMessage('Đang xác thực thông tin đăng nhập từ Facebook...', 'blue');
            try {
                const response = await window.apiClient.post('/api/vtd/public/auth/social-login', {
                    provider: 'facebook',
                    accessToken
                });
                setLoginMessage(response.message || 'Đăng nhập Facebook thành công! Đang chuyển hướng...', 'green');
                setTimeout(() => handleAuthSuccess(response), 600);
            } catch (error) {
                setLoginMessage(error.message || 'Đăng nhập Facebook thất bại.');
            }
        }
    }
}

// ==========================================
// 4. LOGOUT (ĐĂNG XUẤT)
// ==========================================
function setupGlobalLogout() {
    // Dùng Event Delegation để bắt sự kiện click ngay cả khi Header được load động
    document.body.addEventListener('click', async (e) => {
        // Tìm phần tử được click có id là 'btn-logout' hoặc class 'logout-btn'
        const logoutBtn = e.target.closest('#btn-logout, .logout-btn');
        
        if (logoutBtn) {
            e.preventDefault();
            
            // Tùy chọn: Gọi API backend để blacklist token nếu Backend có hỗ trợ chức năng này
            // try { await window.apiClient.post('/api/vtd/public/auth/logout', {}); } catch(err) {}

            // 1. Dọn dẹp toàn bộ dữ liệu xác thực khỏi bộ nhớ cục bộ
            if (window.cartSession) {
                window.cartSession.clear();
            }
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentOrderId'); // Dọn dẹp luôn giỏ hàng nếu muốn
            
            alert('👋 Bạn đã đăng xuất thành công!');
            
            // 2. Chuyển hướng người dùng về trang chủ
            window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('pages/nat-index.html') : './pages/nat-index.html';
        }
    });
}
