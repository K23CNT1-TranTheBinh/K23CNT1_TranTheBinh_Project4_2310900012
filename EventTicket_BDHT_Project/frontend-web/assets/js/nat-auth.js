/**
 * ----------------------------------------------------------------------------
 *  HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT
 * Tệp tin: auth.js
 * Chức năng: Xử lý Đăng nhập, Đăng ký, Xác thực mạng xã hội và Đăng xuất toàn cục
 * Người thực hiện: Sinh viên Nguyễn Anh Tuấn
 * Vai trò: Bảo mật thông tin đầu vào, tương tác API xác thực và phân quyền chuyển hướng
 * ----------------------------------------------------------------------------
 */

// Chạy khởi tạo sau khi trang web đã tải xong toàn bộ cấu trúc giao diện DOM
document.addEventListener('DOMContentLoaded', () => {
    // 1. Nạp Header động cho trang xác thực
    if (window.pageUtils && window.pageUtils.loadHeader) {
        window.pageUtils.loadHeader();
    }

    // 2. Thiết lập lắng nghe sự kiện đăng nhập và đăng ký
    setupLogin();
    setupRegister();
    setupSocialLogin();
    setupGlobalLogout();

    // 3. Tự động kiểm tra và đăng nhập nếu nhận phản hồi Redirect thành công kèm Token từ Facebook
    checkFacebookCallback();
});

// Đối tượng cấu hình liên kết mạng xã hội (được định nghĩa trong các tệp HTML)
const SOCIAL_AUTH_CONFIG = window.SOCIAL_AUTH_CONFIG || {};

/**
 * Kiểm tra xem tham số cấu hình Client ID của mạng xã hội đã được điền dữ liệu thực tế chưa.
 * Giúp tránh gọi SDK lỗi khi sinh viên chưa cấu hình thông số của mình.
 */
function isConfigured(value) {
    return value && !value.startsWith('YOUR_');
}

/**
 * Hiển thị thông báo trạng thái đăng nhập (lỗi hoặc thành công) lên giao diện người dùng.
 */
function setLoginMessage(message, color = 'red') {
    const msgBox = document.getElementById('login-msg') || document.getElementById('login-error');
    if (!msgBox) return;
    msgBox.style.display = 'block';
    msgBox.innerHTML = `<span style="color: ${color};">${message}</span>`;
}

/**
 * Điều hướng người dùng sau khi đăng nhập thành công dựa vào quyền hạn của họ (Role-based Routing).
 * ADMIN chuyển đến Dashboard quản trị, USER chuyển về trang chủ mua vé.
 */
function redirectAfterLogin(user) {
    const userRole = user.role || 'USER';
    if (userRole === 'ADMIN' || userRole === 'ROLE_ADMIN') {
        // Chuyển sang trang quản lý tổng quan của ban quản trị
        window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('pages/admin/lpth_dashboard.html') : '../admin/lpth_dashboard.html';
    } else {
        // Người dùng thông thường được đưa về trang chủ
        window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('pages/index.html') : '../../index.html';
    }
}

/**
 * Hàm trung gian xử lý lưu trữ mã Token bảo mật và dữ liệu người dùng khi đăng nhập thành công.
 */
async function handleAuthSuccess(response) {
    if (!response || !response.user) {
        throw new Error('Không nhận được dữ liệu phản hồi người dùng hợp lệ từ máy chủ.');
    }

    // 1. Lưu mã Token bảo mật JWT vào lớp ApiClient
    if (response.token) {
        window.apiClient.setToken(response.token);
    }

    // 2. Lưu trữ đối tượng người dùng hiện tại dưới dạng JSON vào LocalStorage
    localStorage.setItem('currentUser', JSON.stringify(response.user));

    // 3. Thực hiện chuyển hướng trang phù hợp
    redirectAfterLogin(response.user);
}

// ============================================================================
// 1. ĐĂNG NHẬP TRUYỀN THỐNG (CREDENTIALS LOGIN)
// ============================================================================
function setupLogin() {
    const loginForm = document.getElementById('loginForm') || document.getElementById('login-form');
    if (!loginForm) return;

    // Lắng nghe sự kiện submit của Form Đăng nhập
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Ngăn hành động tải lại trang mặc định của trình duyệt

        const emailInput = document.getElementById('email') || document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const errorMsg = document.getElementById('login-msg') || document.getElementById('login-error');

        if (!errorMsg) return;
        errorMsg.style.display = 'block';
        errorMsg.innerHTML = '<span style="color: blue;">Đang kết nối xác thực thông tin tài khoản...</span>';

        try {
            // Gửi thông tin đăng nhập lên API bảo mật Backend
            const response = await window.apiClient.post('/api/vtd/public/auth/login', {
                email: emailInput.value,
                password: passwordInput.value
            });

            if (response && response.user) {
                // Đăng nhập thành công, hiển thị thông điệp và chuyển hướng sau 800ms
                errorMsg.innerHTML = `<span style="color: green;">${response.message || 'Đăng nhập thành công! Đang chuyển hướng...'}</span>`;
                setTimeout(() => {
                    handleAuthSuccess(response);
                }, 800);
            } else if (response && response.error) {
                throw new Error(response.error);
            } else {
                throw new Error('Không nhận được dữ liệu xác thực từ máy chủ.');
            }
        } catch (error) {
            console.error('Lỗi khi thực hiện đăng nhập:', error);
            const errorText = (error.message || '').toLowerCase();

            // Xử lý các thông báo lỗi đặc biệt (Ví dụ tài khoản bị khóa)
            if (errorText.includes('khoa') || errorText.includes('locked')) {
                errorMsg.innerHTML = '<span style="color: orange;">Tài khoản của bạn đã bị khóa! Vui lòng liên hệ quản trị viên để mở lại.</span>';
            } else {
                errorMsg.innerHTML = `<span style="color: red;">${error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.'}</span>`;
            }
        }
    });
}

// ============================================================================
// 2. ĐĂNG KÝ TÀI KHOẢN MỚI (MEMBER REGISTRATION)
// ============================================================================
function setupRegister() {
    const registerForm = document.getElementById('registerForm') || document.getElementById('register-form');
    if (!registerForm) return;

    // Lắng nghe sự kiện submit của Form Đăng ký
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Thu thập thông tin từ các ô nhập liệu
        const fullName = document.getElementById('fullName')?.value || document.getElementById('reg-username')?.value;
        const email = document.getElementById('email')?.value || document.getElementById('reg-email')?.value;
        const phoneNumber = document.getElementById('phoneNumber')?.value || '';
        const password = document.getElementById('password')?.value || document.getElementById('reg-password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const msgBox = document.getElementById('register-msg');

        if (!msgBox) return;
        msgBox.style.display = 'block';

        // Bảo vệ Frontend: Xác nhận khớp mật khẩu trước khi gửi request mạng
        if (confirmPassword && password !== confirmPassword) {
            msgBox.innerHTML = '<span style="color: red;">Mật khẩu xác nhận không trùng khớp! Vui lòng kiểm tra lại.</span>';
            return;
        }

        msgBox.innerHTML = '<span style="color: blue;">Đang tạo hồ sơ tài khoản mới...</span>';

        try {
            // Gửi dữ liệu đăng ký thành viên lên API công khai Backend
            const response = await window.apiClient.post('/api/vtd/public/auth/register', {
                fullName: fullName,
                email: email,
                phoneNumber: phoneNumber,
                password: password
            });

            // Hiển thị thông báo thành công và chuyển hướng sang trang đăng nhập sau 1.2 giây
            msgBox.innerHTML = `<span style="color: green;">${response.message || 'Đăng ký thành viên thành công! Đang chuyển hướng sang Đăng nhập...'}</span>`;
            setTimeout(() => {
                window.location.href = './nat-login.html';
            }, 1200);
        } catch (error) {
            console.error('Lỗi khi đăng ký thành viên:', error);
            msgBox.innerHTML = `<span style="color: red;">${error.message || 'Đăng ký thất bại. Email có thể đã tồn tại trên hệ thống.'}</span>`;
        }
    });
}

// ============================================================================
// 3. ĐĂNG NHẬP QUA MẠNG XÃ HỘI (GOOGLE & FACEBOOK SOCIAL LOGIN)
// ============================================================================
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

/**
 * Gọi SDK Google Identity Service để lấy mã Token Đăng nhập và gửi lên Backend.
 */
function loginWithGoogle() {
    if (!isConfigured(SOCIAL_AUTH_CONFIG.googleClientId)) {
        setLoginMessage('Vui lòng cấu hình tham số Google Client ID trong tệp nat-login.html để sử dụng tính năng này.');
        return;
    }
    if (!window.google || !google.accounts || !google.accounts.oauth2) {
        setLoginMessage('Thư viện SDK Google đang tải, vui lòng thử lại sau vài giây.');
        return;
    }

    setLoginMessage('Đang mở hộp thoại đăng nhập Google...', 'blue');

    // Khởi tạo tiến trình xác thực Google OAuth
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: SOCIAL_AUTH_CONFIG.googleClientId,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
            if (!tokenResponse || !tokenResponse.access_token) {
                setLoginMessage('Đăng nhập Google thất bại hoặc không nhận được Token xác minh.');
                return;
            }

            try {
                // Gửi Access Token nhận được từ Google lên Backend để giải mã và tạo tài khoản/login
                const response = await window.apiClient.post('/api/vtd/public/auth/social-login', {
                    provider: 'google',
                    accessToken: tokenResponse.access_token
                });

                setLoginMessage(response.message || 'Đăng nhập bằng tài khoản Google thành công!', 'green');
                setTimeout(() => handleAuthSuccess(response), 600);
            } catch (error) {
                setLoginMessage(error.message || 'Đăng nhập mạng xã hội Google gặp sự cố.');
            }
        }
    });

    // Kích hoạt hiển thị popup đăng nhập Google tài khoản
    tokenClient.requestAccessToken();
}

/**
 * Gọi API xác thực Facebook để tiến hành đăng nhập đồng bộ.
 */
function loginWithFacebook() {
    if (!isConfigured(SOCIAL_AUTH_CONFIG.facebookAppId)) {
        setLoginMessage('Vui lòng cấu hình Facebook App ID trong tệp nat-login.html để sử dụng đăng nhập Facebook.');
        return;
    }
    if (!window.FB) {
        setLoginMessage('SDK Facebook đang tải, vui lòng mở lại sau giây lát.');
        return;
    }

    const appId = SOCIAL_AUTH_CONFIG.facebookAppId;
    let redirectUri = window.location.href.split('#')[0]; // Chuẩn hóa URL hiện tại
    if (redirectUri.includes('127.0.0.1')) {
        redirectUri = redirectUri.replace('127.0.0.1', 'localhost');
    }

    // [GIẢI PHÁP CHO LOCAL DEV] 
    // Nếu chạy qua giao thức HTTP thường ở localhost, sử dụng phương thức Direct Redirect để không bị SDK Facebook chặn HTTPS
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
            setLoginMessage('Bạn đã hủy thao tác đăng nhập Facebook hoặc Facebook gặp sự cố.');
            return;
        }

        const accessToken = fbResponse.authResponse.accessToken;
        try {
            // Gửi mã Access Token nhận được sang Backend để đăng nhập đồng bộ
            const response = await window.apiClient.post('/api/vtd/public/auth/social-login', {
                provider: 'facebook',
                accessToken
            });
            setLoginMessage(response.message || 'Đăng nhập bằng tài khoản Facebook thành công!', 'green');
            setTimeout(() => handleAuthSuccess(response), 600);
        } catch (error) {
            setLoginMessage(error.message || 'Đăng nhập mạng xã hội Facebook thất bại.');
        }
    }, { scope: 'public_profile,email' });
}

/**
 * Lắng nghe và xử lý tự động khi Facebook Redirect ngược về kèm Token (#access_token=...) trên thanh URL.
 */
async function checkFacebookCallback() {
    if (window.location.hash && window.location.hash.includes('access_token=')) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');

        if (accessToken) {
            // Xóa dấu hash trên thanh URL để tăng tính thẩm mỹ và an toàn thông tin
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

// ============================================================================
// 4. ĐĂNG XUẤT TOÀN CỤC (GLOBAL LOGOUT)
// ============================================================================
function setupGlobalLogout() {
    // Sử dụng Event Delegation để bắt click của các nút đăng xuất kể cả khi Header được nạp động chậm hơn
    document.body.addEventListener('click', async (e) => {
        const logoutBtn = e.target.closest('#btn-logout, .logout-btn');

        if (logoutBtn) {
            e.preventDefault();

            // 1. Dọn dẹp sạch toàn bộ dữ liệu token và user khỏi localStorage cục bộ
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentOrderId'); // Xóa giỏ hàng tạm nếu có

            alert('👋 Bạn đã đăng xuất khỏi hệ thống thành công! Hẹn gặp lại bạn.');

            // 2. Chuyển hướng người dùng an toàn về trang chủ
            window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('pages/index.html') : './pages/index.html';
        }
    });
}
