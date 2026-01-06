import api from './api';
import { Usuario } from '../types';

interface LoginResponse {
    token: string;
    user?: Usuario;
    usuario?: Usuario;
}

export const authService = {
    async login(email: string, password: string): Promise<{ token: string; usuario: Usuario }> {
        const response = await api.post<LoginResponse>('/auth/login', { Email: email, Password: password });
        const user = response.data.user || response.data.usuario;
        if (response.data.token && user) {
            localStorage.setItem('token', response.data.token);
            // Ensure we save the full user object including assinaturaAtiva
            localStorage.setItem('user', JSON.stringify(user));
        }
        return { token: response.data.token, usuario: user! };
    },

    // Endpoint atualizado para criação de usuários (se for auto-registro ou admin criando)
    async register(data: any): Promise<LoginResponse> {
        // Se for registro de empresa (fluxo principal de signup)
        if (data.nome_fantasia || data.razao_social) {
            const response = await api.post<LoginResponse>('/auth/register-company', data);
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.usuario));
            }
            return response.data;
        }

        // Registro simples (se houver)
        const response = await api.post<LoginResponse>('/usuarios', data);
        return response.data;
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
            const user = JSON.parse(userStr) as Usuario;
            // CRITICAL FIX: Force super_admin to always have active subscription
            if (user && user.cargo === 'super_admin') {
                user.assinaturaAtiva = true;
            }
            return user;
        } catch {
            return null;
        }
    },

    async refreshUser(): Promise<Usuario | null> {
        try {
            const response = await api.get<Usuario>('/auth/me');
            const user = response.data;
            if (user) {
                // Ensure super_admin consistency
                if (user.cargo === 'super_admin') {
                    user.assinaturaAtiva = true;
                }
                localStorage.setItem('user', JSON.stringify(user));
                return user;
            }
        } catch (error) {
            console.error('Failed to refresh user data:', error);
        }
        return this.getCurrentUser();
    },

    async registerCompany(data: {
        nome: string;
        email: string;
        cpf: string; // CNPJ
        telefone: string;
        endereco?: object;
        senha: string;
    }): Promise<{ success: boolean; message: string; empresaId?: string }> {
        const response = await api.post('/auth/register-company', data);
        return response.data;
    }
};
