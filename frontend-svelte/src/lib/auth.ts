import { writable, derived, type Writable } from 'svelte/store';

// Tipos
export interface Usuario {
    id: number;
    email: string;
    nome_completo: string;
    cargo: 'admin' | 'prestador';
    telefone?: string;
    cpf?: string;
    avatar_url?: string;
    signature_url?: string;
    is_active: boolean;
    created_at: string;
}

// Stores
export const user: Writable<Usuario | null> = writable(null);
export const token: Writable<string | null> = writable(null);
export const isAuthenticated = derived(user, ($user) => $user !== null);
export const isAdmin = derived(user, ($user) => $user?.cargo === 'admin');

// Inicializar
export async function initAuth() {
    if (typeof window === 'undefined') return;

    // Tentar recuperar token do localStorage
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
        token.set(savedToken);
        try {
            const userData = JSON.parse(savedUser);
            user.set(userData);

            // Validar token com backend
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${savedToken}` }
            });

            if (response.ok) {
                const freshUserData = await response.json();
                user.set(freshUserData);
                localStorage.setItem('user', JSON.stringify(freshUserData));
            } else {
                // Token inválido, limpar
                logout();
            }
        } catch (e) {
            console.error("Erro ao restaurar sessão", e);
            logout();
        }
    }
}

async function fetchProfile(accessToken: string) {
    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            const userData = await response.json();
            user.set(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            return userData;
        } else {
            console.error("Erro ao buscar perfil");
            return null;
        }
    } catch (e) {
        console.error("Erro na requisição de perfil", e);
        return null;
    }
}

// Login usando backend local
export async function login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Erro ao fazer login' }));
        throw new Error(error.detail || 'E-mail ou senha incorretos');
    }

    const data = await response.json();
    const accessToken = data.access_token;

    token.set(accessToken);
    localStorage.setItem('token', accessToken);

    // Buscar perfil do usuário
    const userData = await fetchProfile(accessToken);
    if (!userData) {
        throw new Error('Erro ao carregar dados do usuário');
    }

    return userData;
}

// Logout
export async function logout() {
    user.set(null);
    token.set(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') {
        window.location.href = '/login';
    }
}
