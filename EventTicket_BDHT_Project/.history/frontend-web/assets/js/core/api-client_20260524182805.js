// API Client - Core module for making requests to backend
// Attach JWT token to all requests

const API_BASE_URL = 'http://localhost:8080';

function getFrontendBasePath() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const marker = '/frontend-web/';
    const markerIndex = path.indexOf(marker);

    if (markerIndex !== -1) {
        return path.substring(0, markerIndex + marker.length - 1);
    }

    return '';
}

function resolveAppUrl(path) {
    if (!path || path.startsWith('http') || path.startsWith('javascript:') || path.startsWith('#') || path.startsWith('data:') || path.startsWith('mailto:') || path.startsWith('tel:')) {
        return path;
    }

    const cleanPath = path.startsWith('./') ? path.slice(2) : path;
    const appPath = cleanPath.replace(/^\/+/, '');

    if (appPath === 'index.html') {
        return `${getFrontendBasePath()}/pages/index.html`;
    }

    const appRootRelative = appPath.startsWith('pages/') || appPath.startsWith('components/') || appPath.startsWith('assets/');

    if (appRootRelative) {
        return `${getFrontendBasePath()}/${appPath}`;
    }

    return new URL(cleanPath, window.location.href).href;
}

function rewriteInternalUrls(html) {
    return html.replace(/\b(href|src)="([^"]*)"/g, (match, attr, value) => {
        if (!value || value.startsWith('http') || value.startsWith('javascript:') || value.startsWith('#') || value.startsWith('data:') || value.startsWith('mailto:') || value.startsWith('tel:')) {
            return match;
        }

        return `${attr}="${resolveAppUrl(value)}"`;
    });
}

class ApiClient {
    // Lấy JWT token từ localStorage
    getToken() {
        return localStorage.getItem('token');
    }

    // Lưu JWT token
    setToken(token) {
        localStorage.setItem('token', token);
    }

    // Xóa token và thông tin user (đăng xuất)
    clearToken() {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
    }

    // Make authenticated request
    async request(endpoint, options = {}) {
        const token = this.getToken();
        const url = `${API_BASE_URL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Gắn token vào header nếu có
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            
            // Nếu lỗi 401 (chưa đăng nhập hoặc token hết hạn)
            if (response.status === 401) {
                this.clearToken();
                window.location.href = window.pageUtils.resolveUrl('pages/user/login.html');
                return null;
            }

            // Chống lỗi "Unexpected end of JSON input"
            // Khi Backend trả về code 200 nhưng body rỗng (ví dụ xóa thành công), response.json() sẽ làm sập web.
            const text = await response.text();
            let data = {};
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = text; // Nếu trả về string thuần thì lấy string
                }
            }

            // Lấy câu thông báo lỗi thực tế từ Spring Boot trả về
            if (!response.ok) {
                const errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error);
            throw error; // Ném lỗi ra ngoài để các file khác (như auth.js) bắt được
        }
    }

    // GET request
    async get(endpoint) {
        return this.request(endpoint);
    }

    // POST request
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // PATCH request
    async patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined
        });
    }
}

// Khởi tạo biến toàn cục để xài ở mọi file HTML
window.apiClient = new ApiClient();

window.pageUtils = {
    getBasePath: getFrontendBasePath,
    resolveUrl: resolveAppUrl,
    rewriteInternalUrls,


    async loadHeader() {
        try {
            const response = await fetch(this.resolveUrl('components/header.html'));
            let headerHTML = rewriteInternalUrls(await response.text());
            const headerContainer = document.getElementById('header-container');
           
        } catch (error) {
            console.error('Lỗi khi load header:', error);
        }
    },

 
    async loadFooter() {
            try {
                const response = await fetch(this.resolveUrl('components/footer.html'));
                let footerHTML = rewriteInternalUrls(await response.text());
                
                const footerContainer = document.getElementById('footer-container');
                if (footerContainer) {
                    footerContainer.innerHTML = footerHTML;
                    this.setupFooterEvents();
                 
                  
                }
            } catch (error) {
                console.error('Lỗi khi load footer:', error);
            }
        },

    setupFooterEvents() {
        const subscribeBtn = document.getElementById('subscribe-btn');
        const emailInput = document.getElementById('subscribe-email-input');
        if (subscribeBtn && emailInput) {
            subscribeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const email = emailInput.value.trim();
                if (!email) {
                    alert('Vui lòng nhập địa chỉ email hợp lệ để nhận bản tin!');
                    return;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    alert('Email không đúng định dạng. Vui lòng kiểm tra lại!');
                    return;
                }
                alert(`🎉 Đăng ký nhận bản tin thành công!\nEmail: ${email}\n\nBDHT sẽ gửi các thông tin sự kiện & ưu đãi mới nhất tới hòm thư của bạn.`);
                emailInput.value = '';
            });
        }
    },
        
    setupAuthMenu() {
        const token = window.apiClient ? window.apiClient.getToken() : null;
        const storedUser = localStorage.getItem('currentUser');
        const isLoggedIn = token || storedUser;

        const guestMenu = document.getElementById('guest-menu');
        const userMenu = document.getElementById('user-menu');
        const btnLogout = document.getElementById('btn-logout');

        if (isLoggedIn) {
            if (guestMenu) guestMenu.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';

            // Cập nhật thông tin User động trong Header nếu có dữ liệu lưu trữ
            const userDisplayName = document.getElementById('header-user-display-name');
            const userAvatarChar = document.getElementById('header-user-avatar-char');
            let userObj = null;
            if (storedUser) {
                try { userObj = JSON.parse(storedUser); } catch(e) {}
            }
            // Fallback sang dữ liệu checkout
            if (!userObj) {
                const checkoutDataStr = localStorage.getItem('checkoutData');
                if (checkoutDataStr) {
                    try {
                        const checkoutData = JSON.parse(checkoutDataStr);
                        if (checkoutData.customer) {
                            userObj = { fullName: checkoutData.customer.name };
                        }
                    } catch(e) {}
                }
            }
            if (userObj && userObj.fullName) {
                if (userDisplayName) userDisplayName.innerText = userObj.fullName;
                if (userAvatarChar) userAvatarChar.innerText = userObj.fullName.charAt(0).toUpperCase();
            }

            // Gắn sự kiện click mở Dropdown
            const trigger = document.getElementById('user-dropdown-trigger');
            const menu = document.getElementById('user-dropdown-menu');
            if (trigger && menu) {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menu.classList.toggle('hidden');
                });

                // Đóng dropdown khi click ra bên ngoài
                window.addEventListener('click', () => {
                    if (!menu.classList.contains('hidden')) {
                        menu.classList.add('hidden');
                    }
                });

                // Ngăn sự kiện nổi bong bóng khi click trong menu
                menu.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }

            if (btnLogout) {
                btnLogout.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        await window.apiClient.post('/api/vtd/member/auth/logout', {});
                    } catch (error) {
                        console.warn('Logout API khong thanh cong, tiep tuc xoa token local:', error);
                    }
                    window.apiClient.clearToken();
                    window.location.href = window.pageUtils.resolveUrl('index.html');
                });
            }
        } else {
            if (guestMenu) guestMenu.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
        }
    }
};
