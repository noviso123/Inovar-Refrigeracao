import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// Backend: Python FastAPI (Docker local) ou produção
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');

console.log('🔌 URL Base da API:', API_BASE);

export const API_URL = `${API_BASE}/api`;

// ============= CIRCUIT BREAKER & RETRY CONFIG =============
interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
}

const CIRCUIT_BREAKER: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Open circuit after 5 consecutive failures
const CIRCUIT_BREAKER_RESET_TIME = 30000; // Reset after 30 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Check if circuit breaker should allow request
function shouldAllowRequest(): boolean {
    if (!CIRCUIT_BREAKER.isOpen) return true;

    // Check if enough time has passed to reset
    const timeSinceLastFailure = Date.now() - CIRCUIT_BREAKER.lastFailure;
    if (timeSinceLastFailure >= CIRCUIT_BREAKER_RESET_TIME) {
        console.log('🔓 Circuit breaker reset - allowing requests again');
        CIRCUIT_BREAKER.failures = 0;
        CIRCUIT_BREAKER.isOpen = false;
        return true;
    }

    return false;
}

// Record failure
function recordFailure(): void {
    CIRCUIT_BREAKER.failures++;
    CIRCUIT_BREAKER.lastFailure = Date.now();

    if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        CIRCUIT_BREAKER.isOpen = true;
        console.warn(`🔒 Circuit breaker OPEN after ${CIRCUIT_BREAKER.failures} failures. Will retry in ${CIRCUIT_BREAKER_RESET_TIME / 1000}s`);
    }
}

// Record success
function recordSuccess(): void {
    if (CIRCUIT_BREAKER.failures > 0) {
        console.log('✅ Request succeeded - resetting failure count');
    }
    CIRCUIT_BREAKER.failures = 0;
    CIRCUIT_BREAKER.isOpen = false;
}

// Check if error is retryable (network errors, timeouts, 5xx)
function isRetryableError(error: AxiosError): boolean {
    // Network errors (no response)
    if (!error.response) {
        const code = error.code;
        return code === 'ERR_NETWORK' ||
            code === 'ECONNREFUSED' ||
            code === 'ECONNABORTED' ||
            code === 'ETIMEDOUT' ||
            error.message.includes('Network Error') ||
            error.message.includes('timeout');
    }

    // Server errors (5xx) except 501 (Not Implemented)
    const status = error.response.status;
    return status >= 500 && status !== 501;
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============= AXIOS INSTANCE =============
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: REQUEST_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        'skip_zrok_interstitial': 'true', // Bypass zrok warning page
    },
});

// Interceptor para adicionar Token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Check circuit breaker
    if (!shouldAllowRequest()) {
        return Promise.reject(new Error('Circuit breaker is open - requests temporarily blocked'));
    }

    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor de resposta com retry logic
api.interceptors.response.use(
    (response) => {
        recordSuccess();
        return response;
    },
    async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };

        // Initialize retry count
        if (!config._retryCount) {
            config._retryCount = 0;
        }

        // Check if we should retry
        if (isRetryableError(error) && config._retryCount < MAX_RETRIES) {
            config._retryCount++;
            const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, config._retryCount - 1);

            console.warn(`🔄 Retry ${config._retryCount}/${MAX_RETRIES} for ${config.url} in ${retryDelay}ms`);

            await delay(retryDelay);
            return api.request(config);
        }

        // Record failure after all retries exhausted
        if (isRetryableError(error)) {
            recordFailure();
        }

        if (error.response) {
            const status = error.response.status;

            // 401: Token inválido ou expirado -> Logout
            if (status === 401) {
                console.error('🔒 401 Unauthorized from:', error.config?.url);
                // Only logout if it's NOT a login attempt (which naturally returns 401 on failure)
                if (!error.config?.url?.includes('/auth/login')) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    if (!window.location.hash.includes('#/login') && !window.location.pathname.includes('/login')) {
                        window.location.href = '/#/login';
                    }
                }
            }

            // 402: Assinatura inativa -> Redirecionar para página de assinatura
            if (status === 402) {
                console.warn('⚠️ Assinatura inativa - redirecionando para página de assinatura');
                // Não faz logout, apenas redireciona
                if (!window.location.hash.includes('#/minha-assinatura')) {
                    window.location.href = '/#/minha-assinatura';
                }
            }

            // 403: Forbidden - Retorna array vazio para evitar erro f.map
            // Isso evita que telas quebrem quando dados são bloqueados
            // 403: Forbidden
            if (status === 403) {
                const detail = (error.response.data as { detail?: string })?.detail || '';
                const headers = error.response.headers;

                // Check for specific Subscription Expired header
                if (headers['x-subscription-status'] === 'expired') {
                    console.warn('🔒 Assinatura expirada - Redirecionando para bloqueio');
                    if (!window.location.hash.includes('#/subscription-locked')) {
                        window.location.href = '/#/subscription-locked';
                    }
                    return Promise.reject(error);
                }

                // Se for erro de limite de plano, dispara evento global
                if (typeof detail === 'string' && detail.includes('Limite')) {
                    console.warn('⚠️ Limite de plano atingido:', detail);
                    window.dispatchEvent(new CustomEvent('plan-limit-reached', {
                        detail: { message: detail }
                    }));
                    return Promise.reject(error); // Rejeita para parar o loading do botão
                }

                // Para outros casos (ex: lista bloqueada), retorna array vazio para não quebrar a tela
                console.warn('⚠️ 403 Forbidden from:', error.config?.url, '- Retornando array vazio');
                return Promise.resolve({ data: [] });
            }

            // 500: Internal Server Error - Também retorna array vazio para GET requests
            if (status === 500 && error.config?.method === 'get') {
                console.error('❌ 500 Error from:', error.config?.url, '- Retornando array vazio');
                return Promise.resolve({ data: [] });
            }
        } else {
            // Network error - log but don't crash
            console.error('❌ Network Error:', error.message, '- URL:', error.config?.url);
        }

        return Promise.reject(error);
    }
);

// ============= UTILITY FUNCTIONS =============

// Get circuit breaker status (for debugging)
export function getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...CIRCUIT_BREAKER };
}

// Force reset circuit breaker (for recovery scenarios)
export function resetCircuitBreaker(): void {
    CIRCUIT_BREAKER.failures = 0;
    CIRCUIT_BREAKER.isOpen = false;
    CIRCUIT_BREAKER.lastFailure = 0;
    console.log('🔓 Circuit breaker manually reset');
}

export default api;
