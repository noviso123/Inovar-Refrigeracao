import api from './api';
import { supabase } from './supabase';
import { Usuario } from '../types';

interface LoginResponse {
    token: string;
    usuario: Usuario;
}

export const authService = {
    async login(email: string, password: string): Promise<{ token: string; usuario: Usuario }> {
        // 1. Login with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw new Error(error.message);
        }

        if (!data.session) {
            throw new Error("Sessão não criada.");
        }

        const token = data.session.access_token;

        // 2. Set token for API calls
        localStorage.setItem('token', token);

        // 3. Fetch User Profile from Backend (to get Role, ID, etc)
        try {
            const userResponse = await api.get<Usuario>('/auth/me');
            const user = userResponse.data;
            localStorage.setItem('user', JSON.stringify(user));
            return { token, usuario: user };
        } catch (fetchError) {
            // If backend fetch fails, logout from supabase to keep state clean
            await supabase.auth.signOut();
            throw new Error("Erro ao buscar perfil do usuário no sistema.");
        }
    },

    async googleLogin(token: string): Promise<LoginResponse> {
        // Not used with Supabase (Handled by OAuth redirect), keeping signature for compatibility
        // or we can implement signInWithOAuth
        throw new Error("Google Login not yet implemented for Supabase flow");
    },

    async logout() {
        await supabase.auth.signOut();
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
