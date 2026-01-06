import api from './api';
import { Cliente } from '../types';
import { dataCache, CACHE_KEYS } from './dataCache';

export const clienteService = {
    async listar(): Promise<Cliente[]> {
        // Try in-memory cache first
        const cached = dataCache.get<Cliente[]>(CACHE_KEYS.CLIENTES);
        if (cached) {
            // Return cache immediately, refresh in background
            this.refreshInBackground();
            return cached;
        }

        // Try localStorage cache as fallback
        try {
            const localCached = localStorage.getItem('cached_clientes');
            if (localCached) {
                const data = JSON.parse(localCached);
                dataCache.set(CACHE_KEYS.CLIENTES, data);
                this.refreshInBackground();
                return data;
            }
        } catch (e) {
            // Ignore parse errors
        }

        const response = await api.get<Cliente[]>('/clientes');
        dataCache.set(CACHE_KEYS.CLIENTES, response.data);
        return response.data;
    },

    // Background refresh to keep cache updated
    async refreshInBackground(): Promise<void> {
        try {
            const response = await api.get<Cliente[]>('/clientes');
            dataCache.set(CACHE_KEYS.CLIENTES, response.data);
            localStorage.setItem('cached_clientes', JSON.stringify(response.data));
        } catch (error) {
            console.error('Background refresh failed:', error);
        }
    },

    async obterPorId(id: number | string): Promise<Cliente> {
        const response = await api.get<Cliente>(`/clientes/${id}`);
        return response.data;
    },

    async criar(cliente: Partial<Cliente>): Promise<Cliente> {
        const response = await api.post<Cliente>('/clientes', cliente);
        dataCache.invalidate(CACHE_KEYS.CLIENTES);
        return response.data;
    },

    async atualizar(id: number | string, cliente: Partial<Cliente>): Promise<Cliente> {
        const response = await api.put<Cliente>(`/clientes/${id}`, cliente);
        dataCache.invalidate(CACHE_KEYS.CLIENTES);
        return response.data;
    },

    async remover(id: number | string): Promise<void> {
        await api.delete(`/clientes/${id}`);
        dataCache.invalidate(CACHE_KEYS.CLIENTES);
    }
};
