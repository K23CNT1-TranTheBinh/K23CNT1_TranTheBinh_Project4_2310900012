// API Client - Core module for making requests to backend
// Attach JWT token to all requests

const API_BASE_URL = 'http://localhost:8080/api';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    // Get JWT token from localStorage
    getToken() {
        return localStorage.getItem('token');
    }

    // Set JWT token
    setToken(token) {
        localStorage.setItem('token', token);
    }

    // Clear token (logout)
    clearToken() {
        localStorage.removeItem('token');
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

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.clearToken();
                window.location.href = 'pages/auth/login.html';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
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
}

// Global instance
window.apiClient = new ApiClient();

export default ApiClient;

