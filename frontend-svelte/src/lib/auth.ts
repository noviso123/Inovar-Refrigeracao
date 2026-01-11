import { writable, derived } from 'svelte/store';

// Define User interface based on usage
export interface User {
    id: number;
    email: string;
    nome_completo: string;
    role: string;
    // Add other fields as needed
}

// Create writable store for user
export const user = writable<User | null>(null);

// Create derived store for admin check
export const isAdmin = derived(user, ($user) => $user?.role === 'admin');

// Helper to set user (can be used after login)
export const setUser = (userData: User | null) => {
    user.set(userData);
};
