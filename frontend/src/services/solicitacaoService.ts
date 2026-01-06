import api from './api';
import { SolicitacaoServico } from '../types';
import { dataCache, CACHE_KEYS } from './dataCache';

export const solicitacaoService = {
    async listar(filtros?: any, limit: number = 50): Promise<SolicitacaoServico[]> {
        // Try cache first (only for default listing without filters)
        if (!filtros || Object.keys(filtros).length === 0) {
            const cached = dataCache.get<SolicitacaoServico[]>(CACHE_KEYS.SOLICITACOES);
            if (cached) {
                // Return cache immediately, refresh in background
                this.refreshListInBackground(limit);
                return cached;
            }
        }

        const params = new URLSearchParams(filtros).toString();
        const limitParam = limit ? `&limit=${limit}` : '';
        const response = await api.get<any>(`/solicitacoes?${params}${limitParam}`);

        // DEFENSIVE: Handle both array and paginated object responses
        let result: SolicitacaoServico[] = [];
        if (Array.isArray(response.data)) {
            result = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
            // Paginated response format: { data: [], total: 0, page: 1 }
            result = response.data.data;
        } else if (response.data && Array.isArray(response.data.items)) {
            // Alternative format: { items: [], total: 0 }
            result = response.data.items;
        } else {
            console.warn('[SolicitacaoService] Unexpected response format:', response.data);
        }

        // Cache the response
        if (!filtros || Object.keys(filtros).length === 0) {
            dataCache.set(CACHE_KEYS.SOLICITACOES, result);
        }

        return result;
    },

    // Background refresh to keep cache updated
    async refreshListInBackground(limit: number = 50): Promise<void> {
        try {
            const response = await api.get<SolicitacaoServico[]>(`/solicitacoes?limit=${limit}`);
            dataCache.set(CACHE_KEYS.SOLICITACOES, response.data);
        } catch (error) {
            console.error('Background refresh failed:', error);
        }
    },

    async obterPorId(id: number | string): Promise<SolicitacaoServico> {
        const response = await api.get<SolicitacaoServico>(`/solicitacoes/${id}`);
        return response.data;
    },

    async criar(os: Partial<SolicitacaoServico>): Promise<SolicitacaoServico> {
        // Ensure payload is clean and matches backend expectations (camelCase)
        if (!os.cliente_id) {
            throw new Error("Cliente é obrigatório");
        }

        const payload = {
            titulo: os.titulo || (os as any).descricao || 'Nova Solicitação',
            empresaId: os.empresa_id,
            clienteId: Number(os.cliente_id),
            tecnicoId: os.tecnico_id ? Number(os.tecnico_id) : null,
            equipamentoId: os.itens_os?.[0]?.equipamento_id || null, // Best guess for single equipment
            descricao: os.descricao_detalhada || (os as any).descricao,
            tipo: os.tipo_servico || 'corretiva',
            status: os.status || 'aberto',
            prioridade: os.prioridade || 'media',
            dataAgendada: os.data_agendamento_inicio || (os as any).data_agendada || null
        };

        const response = await api.post<SolicitacaoServico>('/solicitacoes', payload);
        // Invalidate cache after create
        dataCache.invalidate(CACHE_KEYS.SOLICITACOES);
        return response.data;
    },

    async atualizar(id: number | string, os: Partial<SolicitacaoServico>): Promise<SolicitacaoServico> {
        const response = await api.put<SolicitacaoServico>(`/solicitacoes/${id}`, os);
        // Invalidate cache after update
        dataCache.invalidate(CACHE_KEYS.SOLICITACOES);
        return response.data;
    },

    async remover(id: number | string): Promise<void> {
        await api.delete(`/solicitacoes/${id}`);
        // Invalidate cache after delete
        dataCache.invalidate(CACHE_KEYS.SOLICITACOES);
    }
};
