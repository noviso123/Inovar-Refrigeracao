import api from './api';
import { Usuario } from '../types';

interface LoginResponse {
    token: string;
    usuario: Usuario;
}

export const authService = {
    async login(email: string, password: string): Promise<{ token: string; usuario: Usuario }> {
        const response = await api.post<LoginResponse>('/auth/login', { Email: email, Password: password });
        const user = response.data.usuario;
        if (response.data.token && user) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(user));
        }
        return { token: response.data.token, usuario: user };
    },

    async googleLogin(token: string): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/google', { token });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.usuario));
        }
        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    },

    getCurrentUser(): Usuario | null {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr) as Usuario;
        } catch {
            return null;
        }
    },

    async refreshUser(): Promise<Usuario | null> {
        try {
            const response = await api.get<Usuario>('/auth/me');
            const user = response.data;
            if (user) {
                localStorage.setItem('user', JSON.stringify(user));
                return user;
            }
        } catch (error) {
            console.error('Failed to refresh user data:', error);
        }
        return this.getCurrentUser();
    }
};
