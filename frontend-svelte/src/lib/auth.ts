import { writable, derived, type Writable } from 'svelte/store';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://apntpretjodygczbeozk.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1lPwrqXB373GKcILWHyukA_voiQCgyO';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        token.set(session.access_token);
        localStorage.setItem('token', session.access_token);

        // Buscar perfil do backend (que agora verifica o JWT do Supabase)
        await fetchProfile(session.access_token);
    }

    // Escutar mudanças no estado de auth
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            token.set(session.access_token);
            localStorage.setItem('token', session.access_token);
            await fetchProfile(session.access_token);
        } else {
            user.set(null);
            token.set(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    });
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
        } else {
            console.error("Erro ao buscar perfil");
        }
    } catch (e) {
        console.error("Erro na requisição de perfil", e);
    }
}

// Login
export async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data.user;
}

// Logout
export async function logout() {
    await supabase.auth.signOut();
    user.set(null);
    token.set(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') {
        window.location.href = '/login';
    }
}
