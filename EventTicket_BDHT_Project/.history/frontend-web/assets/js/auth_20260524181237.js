document.addEventListener('DOMContentLoaded', () => {
    window.pageUtils.loadHeader();
    setupLogin();
    setupRegister();
    setupSocialLogin();
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
        window.location.href = window.pageUtils.resolveUrl('/pages/admin/lpth_dashboard.html');
    } else {
        window.location.href = window.pageUtils.resolveUrl('index.html');
    }
}

async function handleAuthSuccess(response) {
    if (!response || !response.user) {
        throw new Error('Khong nhan duoc du lieu user tu may chu.');
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
                window.location.href = window.pageUtils.resolveUrl('/pages/user/login.html');
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
            setLoginMessage('Hệ thống đang phát triển.', 'orange');

            const facebookDev = document.getElementById('facebook-dev');
            if (facebookDev) facebookDev.style.display = 'block';
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
        setLoginMessage('Vui long cau hinh Facebook App ID trong login.html truoc khi dung dang nhap Facebook.');
        return;
    }
    if (!window.FB) {
        setLoginMessage('Facebook SDK chua tai xong, vui long thu lai sau vai giay.');
        return;
    }

    // FB.login chỉ hoạt động khi trang chạy qua HTTPS.
    // Nếu đang chạy http, Facebook SDK sẽ chặn và có thể làm lỗi typeof asyncfunction.
    if (window.location.protocol !== 'https:') {
        setLoginMessage('Facebook chỉ cho phép đăng nhập khi trang chạy HTTPS. Vui lòng bật HTTPS (Live Server/Proxy) rồi thử lại.', 'orange');
        return;
    }

    FB.init({
        appId: SOCIAL_AUTH_CONFIG.facebookAppId,
        cookie: true,
        xfbml: false,
        version: 'v25.0'
    });


    setLoginMessage('Dang mo dang nhap Facebook...', 'blue');
    FB.login(async (fbResponse) => {
        if (!fbResponse || !fbResponse.authResponse || !fbResponse.authResponse.accessToken) {
            setLoginMessage('Ban da huy dang nhap Facebook hoac Facebook khong tra ve token.');
            return;
        }

        const accessToken = fbResponse.authResponse.accessToken;
        try {
            const response = await window.apiClient.post('/api/vtd/public/auth/social-login', {
                provider: 'facebook',
                accessToken
            });
            setLoginMessage(response.message || 'Dang nhap Facebook thanh cong! Dang chuyen huong...', 'green');
            setTimeout(() => handleAuthSuccess(response), 600);
        } catch (error) {
            // backend trả { error: '...' } hoặc status 400/500, api-client sẽ đưa message sang error.message
            setLoginMessage(error.message || 'Dang nhap Facebook that bai.');
        }
    }, { scope: 'public_profile,email' });

}
