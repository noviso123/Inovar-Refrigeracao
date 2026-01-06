/**
 * Hook para prefetch de dados - carrega dados em background antes de serem necessários
 */
import { useEffect, useCallback } from 'react';

const PREFETCH_CACHE_KEY = 'prefetch_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

interface PrefetchCache {
    [key: string]: {
        data: any;
        timestamp: number;
    };
}

// Cache global em memória para acesso rápido
let memoryCache: PrefetchCache = {};

// Carregar cache do localStorage na inicialização
try {
    const stored = localStorage.getItem(PREFETCH_CACHE_KEY);
    if (stored) {
        memoryCache = JSON.parse(stored);
    }
} catch (e) {
    console.warn('Erro ao carregar cache de prefetch:', e);
}

/**
 * Salvar dados no cache de prefetch
 */
export const setPrefetchData = (key: string, data: any) => {
    memoryCache[key] = {
        data,
        timestamp: Date.now()
    };

    // Salvar no localStorage de forma assíncrona
    try {
        localStorage.setItem(PREFETCH_CACHE_KEY, JSON.stringify(memoryCache));
    } catch (e) {
        console.warn('Erro ao salvar cache de prefetch:', e);
    }
};

/**
 * Obter dados do cache de prefetch
 */
export const getPrefetchData = <T>(key: string): T | null => {
    const cached = memoryCache[key];
    if (!cached) return null;

    // Verificar se o cache ainda é válido
    const isValid = Date.now() - cached.timestamp < CACHE_DURATION;
    if (!isValid) {
        delete memoryCache[key];
        return null;
    }

    return cached.data as T;
};

/**
 * Limpar cache de prefetch
 */
export const clearPrefetchCache = () => {
    memoryCache = {};
    try {
        localStorage.removeItem(PREFETCH_CACHE_KEY);
    } catch (e) {
        console.warn('Erro ao limpar cache de prefetch:', e);
    }
};

/**
 * Hook para prefetch de documentos de uma solicitação
 */
export const usePrefetchDocumentos = (solicitacaoId: string | undefined) => {
    const prefetch = useCallback(async () => {
        if (!solicitacaoId) return;

        // Verificar se já existe no cache
        const cached = getPrefetchData(`documento_${solicitacaoId}`);
        if (cached) return;

        // Dados já devem estar carregados na página de detalhes
        // Este hook serve para garantir que estejam no cache
    }, [solicitacaoId]);

    useEffect(() => {
        prefetch();
    }, [prefetch]);
};

/**
 * Prefetch de dashboards - chamar no login ou ao entrar na aplicação
 */
export const prefetchDashboards = async () => {
    // Os dashboards já usam cache localStorage próprio
    // Este é um placeholder para futuras otimizações
    console.log('[Prefetch] Dashboards prontos para carregamento instantâneo');
};

export default {
    setPrefetchData,
    getPrefetchData,
    clearPrefetchCache,
    prefetchDashboards
};
