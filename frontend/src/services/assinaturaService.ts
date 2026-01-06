import api from './api';
import { PlanoAssinatura, Assinatura, PagamentoAssinatura } from '../types';

// ============================================================================
// SERVIÇO DE ASSINATURAS (SaaS)
// ============================================================================

export const assinaturaService = {
    // ----- PLANOS -----

    /**
     * Listar todos os planos disponíveis
     */
    async listarPlanos(): Promise<PlanoAssinatura[]> {
        const response = await api.get('/planos');
        return Array.isArray(response.data) ? response.data : [];
    },

    /**
     * Criar novo plano (SuperAdmin only)
     */
    async criarPlano(plano: Omit<PlanoAssinatura, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<PlanoAssinatura> {
        const response = await api.post('/planos', plano);
        return response.data;
    },

    /**
     * Atualizar plano existente (SuperAdmin only)
     */
    async atualizarPlano(id: string, updates: Partial<PlanoAssinatura>): Promise<PlanoAssinatura> {
        const response = await api.put(`/planos/${id}`, updates);
        return response.data;
    },

    /**
     * Deletar plano (SuperAdmin only)
     */
    async deletarPlano(id: string): Promise<void> {
        await api.delete(`/planos/${id}`);
    },

    // ----- ASSINATURAS -----

    /**
     * Listar todas as assinaturas (SuperAdmin vê todas, prestador vê só a própria)
     */
    async listarAssinaturas(): Promise<Assinatura[]> {
        const response = await api.get('/assinaturas');
        return response.data;
    },

    /**
     * Obter assinatura do usuário atual
     */
    async obterMinhaAssinatura(): Promise<Assinatura | null> {
        const response = await api.get('/assinaturas/minha');
        return response.data;
    },

    /**
     * Criar nova assinatura (prestador assina um plano)
     */
    async assinarPlano(planoId: string): Promise<Assinatura> {
        const response = await api.post('/assinaturas', { planoId });
        return response.data;
    },

    /**
     * Confirmar pagamento da assinatura
     */
    async confirmarPagamento(assinaturaId: string, comprovanteUrl?: string): Promise<void> {
        await api.put(`/assinaturas/${assinaturaId}/confirmar-pagamento`, { comprovanteUrl });
    },

    /**
     * Cancelar assinatura
     */
    async cancelarAssinatura(assinaturaId: string): Promise<void> {
        await api.put(`/assinaturas/${assinaturaId}/cancelar`);
    },

    /**
     * Forçar sincronização com Mercado Pago
     */
    async sincronizarAssinatura(): Promise<{ sincronizado: boolean; status_atual: string; message: string }> {
        const response = await api.post('/assinaturas/sincronizar');
        return response.data;
    },




    /**
     * Listar prestadores pendentes de aprovação
     */
    async listarPrestadoresPendentes(): Promise<any[]> {
        const response = await api.get('/assinaturas/prestadores-pendentes');
        return response.data;
    },

    /**
     * Aprovar prestador
     */
    async aprovarPrestador(id: string): Promise<void> {
        await api.put(`/assinaturas/prestadores/${id}/aprovar`);
    },

    // ----- HELPERS -----

    /**
     * Verificar se assinatura está ativa
     */
    isAssinaturaAtiva(assinatura: Assinatura | null): boolean {
        if (!assinatura) return false;
        if (assinatura.status !== 'ativa') return false;
        const vencimento = new Date(assinatura.dataVencimento);
        return vencimento > new Date();
    },

    /**
     * Dias até vencimento
     */
    diasAteVencimento(assinatura: Assinatura | null): number {
        if (!assinatura) return 0;
        const vencimento = new Date(assinatura.dataVencimento);
        const hoje = new Date();
        const diff = vencimento.getTime() - hoje.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },

    /**
     * Obter limites de uso do plano atual
     */
    async obterLimites(): Promise<{
        clientes: { usado: number; limite: number | null };
        servicos: { usado: number; limite: number | null };
        plano: string;
    }> {
        const response = await api.get('/limites');
        return response.data;
    }
};
