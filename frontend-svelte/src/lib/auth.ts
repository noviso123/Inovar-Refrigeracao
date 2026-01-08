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

// Store do usuário logado
export const user: Writable<Usuario | null> = writable(null);

// Store do token
export const token: Writable<string | null> = writable(null);

// Derivado: está autenticado?
export const isAuthenticated = derived(user, ($user) => $user !== null);

// Derivado: é admin?
export const isAdmin = derived(user, ($user) => $user?.cargo === 'admin');

// Inicializar a partir do localStorage (client-side)
export function initAuth() {
    if (typeof window === 'undefined') return;

    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser) {
        try {
            user.set(JSON.parse(storedUser));
        } catch {
            localStorage.removeItem('user');
        }
    }

    if (storedToken) {
        token.set(storedToken);
    }
}

// Login
export async function login(email: string, password: string): Promise<Usuario> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Falha no login");
    }

    const data = await response.json();
    const accessToken = data.access_token;

    localStorage.setItem('token', accessToken);
    token.set(accessToken);

    // Buscar perfil do backend
    const profileResponse = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!profileResponse.ok) {
        logout();
        throw new Error("Erro ao buscar perfil do usuário.");
    }

    const userData: Usuario = await profileResponse.json();
    localStorage.setItem('user', JSON.stringify(userData));
    user.set(userData);

    return userData;
}

// Logout
export async function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    user.set(null);
    token.set(null);

    if (typeof window !== 'undefined') {
        window.location.href = '/login';
    }
}
