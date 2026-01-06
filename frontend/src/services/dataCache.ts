/**
 * Data Cache Service
 * Provides in-memory caching to speed up data access across the app
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

class DataCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private TTL = 5 * 60 * 1000; // 5 minutes default TTL

    /**
     * Store data in cache
     */
    set<T>(key: string, data: T, ttl?: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Get data from cache (returns null if expired or not found)
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Invalidate a specific cache entry
     */
    invalidate(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Invalidate all entries matching a prefix
     */
    invalidatePrefix(prefix: string): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): { entries: number; keys: string[] } {
        return {
            entries: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Singleton instance
export const dataCache = new DataCache();

// Cache keys constants
export const CACHE_KEYS = {
    SOLICITACOES: 'solicitacoes',
    CLIENTES: 'clientes',
    EMPRESA: 'empresa',
    EQUIPAMENTOS: 'equipamentos',
    USUARIOS: 'usuarios',
} as const;
