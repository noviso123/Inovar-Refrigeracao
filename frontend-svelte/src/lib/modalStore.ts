import { writable } from 'svelte/store';

export const userModal = writable({
    isOpen: false,
    editingUser: null as any
});

export const clientModal = writable({
    isOpen: false,
    editingClient: null as any
});
