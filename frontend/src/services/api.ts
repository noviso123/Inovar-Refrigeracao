import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Backend URL
// For local dev, use http://localhost:8001. For production (Render), use '' for relative paths.
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
export const API_URL = API_BASE ? `${API_BASE}/api` : '/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor for Token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Simplified Response Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.hash.includes('#/login')) {
                window.location.href = '/#/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
