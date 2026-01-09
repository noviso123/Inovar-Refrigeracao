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
            const API_BASE = import.meta.env.VITE_API_URL || '/api';
            const cleanApiBase = API_BASE.replace(/\/$/, '');
            const url = `${cleanApiBase}/auth/me`;

            const response = await fetch(url, {
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
        const API_BASE = import.meta.env.VITE_API_URL || '/api';
        const cleanApiBase = API_BASE.replace(/\/$/, '');
        const url = `${cleanApiBase}/auth/me`;

        const response = await fetch(url, {
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

// Login usando backend local ou URL definida
export async function login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    // Use VITE_API_URL if set, otherwise fallback to /api (proxy)
    const API_BASE = import.meta.env.VITE_API_URL || '/api';
    // Remove trailing slash if present to avoid double slashes
    const cleanApiBase = API_BASE.replace(/\/$/, '');
    const url = `${cleanApiBase}/token`;

    console.log(`Tentando login em: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            console.error(`Erro login: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            let errorDetail = 'Erro ao fazer login';
            try {
                const errorJson = JSON.parse(errorText);
                errorDetail = errorJson.detail || errorDetail;
            } catch (e) {
                console.error("Erro ao fazer parse do erro:", errorText);
            }
            throw new Error(errorDetail);
        }

        const data = await response.json();
        const accessToken = data.access_token;

        token.set(accessToken);
        localStorage.setItem('token', accessToken);

        // Buscar perfil do usuário
        // Also update fetchProfile to use the correct URL if needed, 
        // but fetchProfile uses /api/auth/me. We should probably update that too or make a helper.
        // For now, let's assume the proxy works for other calls or update fetchProfile logic too?
        // Let's update fetchProfile in a separate edit or assume this fixes the critical login step.
        // Actually, if login works, we need profile fetch to work too.

        // Let's fix fetchProfile call here to use the URL logic? 
        // No, fetchProfile is a separate function. 
        // I should update fetchProfile too. 
        // But for this tool call, I can only replace one block.
        // I will update login first.

        const userData = await fetchProfile(accessToken);
        if (!userData) {
            throw new Error('Erro ao carregar dados do usuário');
        }

        return userData;
    } catch (error: any) {
        console.error("Exceção no login:", error);
        throw error;
    }
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
