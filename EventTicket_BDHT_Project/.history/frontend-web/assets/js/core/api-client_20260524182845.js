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

    // Khi Live Server root = /frontend-web, pathname sẽ là /pages/index.html
    // (không chứa /frontend-web/). Trong trường hợp này, root chính là '/'
    return '';
}

function resolveAppUrl(path) {
    if (!path || path.startsWith('http') || path.startsWith('javascript:') || path.startsWith('#') || path.startsWith('data:') || path.startsWith('mailto:') || path.startsWith('tel:')) {
        return path;
    }

    const cleanPath = path.startsWith('./') ? path.slice(2) : path;
    const appRootRelative = cleanPath.startsWith('pages/') || cleanPath.startsWith('components/') || cleanPath.startsWith('assets/') || cleanPath === 'index.html';

    if (cleanPath === 'index.html') {
        const base = getFrontendBasePath();
        return `${base}/pages/index.html`;
    }

    if (appRootRelative) {
        const base = getFrontendBasePath();
        // QUAN TRỌNG: Luôn trả về đường dẫn tuyệt đối (bắt đầu bằng /)
        // để tránh bị resolve tương đối theo vị trí trang hiện tại.
        // Ví dụ: trang ở /pages/index.html, nếu trả về 'components/header.html'
        // trình duyệt sẽ fetch /pages/components/header.html (SAI).
        // Phải trả về '/components/header.html' để fetch đúng.
        return base ? `${base}/${cleanPath}` : `/${cleanPath}`;
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

function extractCityFromAddress(address) {
    if (!address) return '';
    const parts = String(address).split(',');
    if (parts.length > 1) {
        const city = parts[parts.length - 1].trim();
        return city;
    }
    return '';
}

function parseStoredUser(rawUser) {
    if (!rawUser) return null;

    if (typeof rawUser === 'string') {
        try {
            rawUser = JSON.parse(rawUser);
        } catch (error) {
            return null;
        }
    }

    if (!rawUser || typeof rawUser !== 'object') return null;
    return rawUser;
}

function getFallbackStoredUser() {
    const storedUser = parseStoredUser(localStorage.getItem('currentUser'));
    if (storedUser && (storedUser.fullName || storedUser.name || storedUser.email)) {
        return storedUser;
    }

    const checkoutDataStr = localStorage.getItem('checkoutData');
    if (!checkoutDataStr) return null;

    try {
        const checkoutData = JSON.parse(checkoutDataStr);
        const customer = checkoutData?.customer;
        if (customer?.name) {
            return { fullName: customer.name };
        }
    } catch (error) {
        console.warn('Không thể đọc dữ liệu checkoutData:', error);
    }

    return null;
}

async function fetchHeaderEvents() {
    try {
        const response = await window.apiClient.getPublicEvents({ page: 0, size: 100 });
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.content)) return response.content;
        return [];
    } catch (error) {
        console.warn('Không thể lấy danh sách sự kiện cho header/footer:', error);
        return [];
    }
}

function normalizeHeaderCategories(categories, events = []) {
    const values = [];

    const appendUnique = (value) => {
        const normalized = String(value || '').trim();
        if (!normalized) return;
        if (values.includes(normalized)) return;
        values.push(normalized);
    };

    if (Array.isArray(categories)) {
        categories.forEach(appendUnique);
    }

    events.forEach((event) => appendUnique(event?.categoryName));

    return values;
}

function normalizeHeaderLocations(events = []) {
    const values = [];

    const appendUnique = (value) => {
        const normalized = String(value || '').trim();
        if (!normalized || values.includes(normalized)) return;
        values.push(normalized);
    };

    events.forEach((event) => {
        appendUnique(event?.venue?.city || extractCityFromAddress(event?.venue?.address));
    });

    return values;
}

class ApiClient {
    constructor() {
        this._responseCache = new Map();
        this._cacheTtl = 5 * 60 * 1000;
    }

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

    getCachedResponse(key) {
        const cached = this._responseCache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this._cacheTtl) {
            this._responseCache.delete(key);
            return null;
        }

        return cached.value;
    }

    setCachedResponse(key, value) {
        this._responseCache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    async getPublicEvents({ page = 0, size = 100, ttl = this._cacheTtl } = {}) {
        const endpoint = `/api/vtd/public/events?page=${page}&size=${size}`;
        const cached = this._responseCache.get(endpoint);

        if (cached && Date.now() - cached.timestamp <= ttl) {
            return cached.value;
        }

        const response = await this.get(endpoint);
        this._responseCache.set(endpoint, {
            value: response,
            timestamp: Date.now()
        });
        return response;
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

        // Gắn token vào header nếu có và không phải là endpoint công khai (public/auth/translations)
        const isPublic = endpoint.includes('/public/') || endpoint.includes('/auth/') || endpoint.includes('/translations/');
        if (token && !isPublic) {
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

    _headerPromise: null,
    _footerPromise: null,

    async loadHeader() {
        if (this._headerPromise) return this._headerPromise;

        this._headerPromise = (async () => {
            try {
                const response = await fetch(this.resolveUrl('components/header.html'));
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const headerHTML = rewriteInternalUrls(await response.text());
                const headerContainer = document.getElementById('header-container');
                if (!headerContainer) {
                    return;
                }

                headerContainer.innerHTML = headerHTML;
                await this.setupAuthMenu();
                await Promise.all([
                    this.populateHeaderNavigation(),
                    this.populateHeaderLocationFilter()
                ]);
            } catch (error) {
                console.error('Lỗi khi load header:', error);
                this._headerPromise = null;
            }
        })();

        return this._headerPromise;
    },

    async loadFooter() {
        if (this._footerPromise) return this._footerPromise;

        this._footerPromise = (async () => {
            try {
                const response = await fetch(this.resolveUrl('components/footer.html'));
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const footerHTML = rewriteInternalUrls(await response.text());
                const footerContainer = document.getElementById('footer-container');
                if (!footerContainer) {
                    return;
                }

                footerContainer.innerHTML = footerHTML;
                this.setupFooterEvents();
                await this.syncFooterAddress();

                if (!document.querySelector('script[src*="ai-chat.js"]')) {
                    const script = document.createElement('script');
                    script.src = this.resolveUrl('assets/js/ai-chat.js');
                    document.body.appendChild(script);
                }
            } catch (error) {
                console.error('Lỗi khi load footer:', error);
                this._footerPromise = null;
            }
        })();

        return this._footerPromise;
    },

    async syncFooterAddress() {
        const addressEl = document.getElementById('footer-address-value');
        if (!addressEl) return;

        const fallbackText = 'Địa chỉ: Chưa có dữ liệu địa điểm cập nhật từ hệ thống.';

        try {
            const events = await fetchHeaderEvents();
            const address = events
                .filter((event) => event?.status === 'PUBLISHED')
                .map((event) => event?.venue?.address || event?.location || event?.venue?.venueName)
                .find((value) => typeof value === 'string' && value.trim().length > 0);

            addressEl.textContent = address
                ? `Địa chỉ: ${address}`
                : fallbackText;
        } catch (error) {
            console.warn('Không thể đồng bộ địa chỉ footer:', error);
            addressEl.textContent = fallbackText;
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

    async setupAuthMenu() {
        const token = window.apiClient ? window.apiClient.getToken() : null;
        const isLoggedIn = token || !!localStorage.getItem('currentUser');

        const guestMenu = document.getElementById('guest-menu');
        const userMenu = document.getElementById('user-menu');
        const btnLogout = document.getElementById('btn-logout');

        if (!isLoggedIn) {
            if (guestMenu) guestMenu.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
            return;
        }

        if (guestMenu) guestMenu.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';

        const userDisplayName = document.getElementById('header-user-display-name');
        const userAvatarChar = document.getElementById('header-user-avatar-char');

        let userObj = getFallbackStoredUser();

        if (token) {
            try {
                const profile = await window.apiClient.get('/api/vtd/member/profile');
                if (profile) {
                    userObj = {
                        fullName: profile.fullName || profile.name || profile.email,
                        email: profile.email,
                        phoneNumber: profile.phoneNumber,
                        ...profile
                    };
                    localStorage.setItem('currentUser', JSON.stringify(userObj));
                }
            } catch (error) {
                console.warn('Không thể đồng bộ thông tin người dùng từ backend:', error);
            }
        }

        const displayName = userObj?.fullName || userObj?.name || userObj?.email || 'User';
        if (userDisplayName) {
            userDisplayName.innerText = displayName;
        }
        if (userAvatarChar) {
            userAvatarChar.innerText = String(displayName).trim().charAt(0).toUpperCase() || 'U';
        }

        const trigger = document.getElementById('user-dropdown-trigger');
        const menu = document.getElementById('user-dropdown-menu');
        if (trigger && menu) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('hidden');
            });

            window.addEventListener('click', () => {
                if (!menu.classList.contains('hidden')) {
                    menu.classList.add('hidden');
                }
            });

            menu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        if (btnLogout) {
            btnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                window.apiClient.clearToken();
                window.location.href = window.pageUtils.resolveUrl('index.html');
            });
        }
    },

    async populateHeaderNavigation() {
        const container = document.getElementById('header-category-nav');
        if (!container) return;

        const events = await fetchHeaderEvents();
        const categories = normalizeHeaderCategories([], events);

        const fallbackCategories = ['Vé ca nhạc', 'Văn hóa nghệ thuật', 'Tham quan - Du lịch', 'Workshop', 'Vé xem phim', 'Thể thao'];
        const finalCategories = categories.length ? categories : fallbackCategories;

        container.innerHTML = '';

        const allLink = document.createElement('a');
        allLink.href = this.resolveUrl('pages/user/all-events.html');
        allLink.textContent = 'Tất cả sự kiện';
        allLink.className = 'text-sm font-bold text-white/90 hover:text-white whitespace-nowrap transition-colors relative after:content-[\'\'] after:absolute after:-bottom-4 after:left-0 after:w-0 after:h-1 after:bg-white after:transition-all hover:after:w-full rounded-full after:rounded-t-md';
        container.appendChild(allLink);

        finalCategories.forEach((category) => {
            const link = document.createElement('a');
            link.href = `${this.resolveUrl('pages/user/all-events.html')}?category=${encodeURIComponent(category)}`;
            link.textContent = category;
            link.className = 'text-sm font-bold text-white/90 hover:text-white whitespace-nowrap transition-colors relative after:content-[\'\'] after:absolute after:-bottom-4 after:left-0 after:w-0 after:h-1 after:bg-white after:transition-all hover:after:w-full rounded-full after:rounded-t-md';
            container.appendChild(link);
        });

        const newsLink = document.createElement('a');
        newsLink.href = this.resolveUrl('pages/user/news.html');
        newsLink.textContent = 'Tin tức';
        newsLink.className = 'text-sm font-bold text-white/90 hover:text-white whitespace-nowrap transition-colors relative after:content-[\'\'] after:absolute after:-bottom-4 after:left-0 after:w-0 after:h-1 after:bg-white after:transition-all hover:after:w-full rounded-full after:rounded-t-md';
        container.appendChild(newsLink);
    },

    async populateHeaderLocationFilter() {
        const select = document.getElementById('header-location-filter');
        if (!select) return;

        const events = await fetchHeaderEvents();
        const locations = normalizeHeaderLocations(events);

        const currentLocation = new URLSearchParams(window.location.search).get('location');
        select.innerHTML = '<option value="">Mọi địa điểm</option>';

        locations.forEach((location) => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            select.appendChild(option);
        });

        if (currentLocation) {
            select.value = currentLocation;
        }

        if (select.dataset.bound === 'true') return;
        select.dataset.bound = 'true';

        select.addEventListener('change', () => {
            const isAllEventsPage = window.location.pathname.includes('/pages/user/all-events.html');
            const params = isAllEventsPage ? new URLSearchParams(window.location.search) : new URLSearchParams();

            if (select.value) {
                params.set('location', select.value);
            } else {
                params.delete('location');
            }

            const targetPath = isAllEventsPage ? 'pages/user/all-events.html' : 'pages/index.html';
            const targetUrl = this.resolveUrl(targetPath);
            const search = params.toString();
            window.location.href = search ? `${targetUrl}?${search}` : targetUrl;
        });
    }
};