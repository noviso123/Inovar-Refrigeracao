import { writable, derived } from 'svelte/store';

// Define User interface based on usage
export interface User {
    id: number;
    email: string;
    nome_completo: string;
    cargo: string;
    cpf?: string;
    avatar_url?: string;
    telefone?: string;
    is_active?: boolean;
    created_at?: string;
    [key: string]: any; // Allow other properties to avoid build errors
}

// Create writable store for user
export const user = writable<User | null>(null);

// Create derived store for admin check
export const isAdmin = derived(user, ($user) => $user?.cargo === 'admin');

// Helper to set user (can be used after login)
export const setUser = (userData: User | null) => {
    user.set(userData);
};

// Token store
export const token = writable<string | null>(null);

// Helper to set token
export const setToken = (tokenData: string | null) => {
    token.set(tokenData);
    if (tokenData) {
        localStorage.setItem('token', tokenData);
    } else {
        localStorage.removeItem('token');
    }
};

// Initialize token from localStorage if available (client-side only)
if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
        token.set(storedToken);
    }
}

export const isAuthenticated = derived(token, ($token) => !!$token);

export const logout = () => {
    token.set(null);
    user.set(null);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
    }
};

export const initAuth = async () => {
    if (typeof window === 'undefined') return;

    const storedToken = localStorage.getItem('token');
    if (storedToken) {
        token.set(storedToken);
        // Optional: Fetch user profile here if needed
    }
};
