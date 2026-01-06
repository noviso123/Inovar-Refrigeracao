import api from './api';

export interface NFSeData {
    descricaoServico: string;
    codigoServico: string;
    valorServico: number;
}

export interface NFSeResult {
    id: string;
    numero: string;
    codigo_verificacao: string;
    data_emissao: string;
    status: string;
    url_pdf?: string;
    url_xml?: string;
}

export const nfseService = {
    /**
     * Emit NFSe for a Service Order
     */
    async emit(solicitacaoId: string, nfseData: NFSeData): Promise<{ success: boolean; nfse: NFSeResult }> {
        const response = await api.post('/nfse/emit', { solicitacaoId, nfseData });
        return response.data;
    },

    /**
     * Cancel an emitted NFSe
     */
    async cancel(nfseId: string, motivo?: string): Promise<{ success: boolean; message: string }> {
        const response = await api.post('/nfse/cancel', { nfseId, motivo });
        return response.data;
    },

    /**
     * Get NFSe by ID
     */
    async getById(nfseId: string): Promise<NFSeResult> {
        const response = await api.get(`/nfse/${nfseId}`);
        return response.data;
    },

    /**
     * Get NFSe by Solicitation ID
     */
    async getBySolicitacao(solicitacaoId: string): Promise<NFSeResult | null> {
        try {
            const response = await api.get(`/nfse/by-solicitacao/${solicitacaoId}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    /**
     * Check if company has a certificate
     */
    async hasCertificate(): Promise<boolean> {
        const response = await api.get('/nfse/has-certificate');
        return response.data.hasCertificate;
    },

    /**
     * Upload digital certificate
     */
    async uploadCertificate(file: File, password?: string): Promise<{ success: boolean }> {
        const formData = new FormData();
        formData.append('certificate', file);
        if (password) {
            formData.append('password', password);
        }
        const response = await api.post('/nfse/upload-certificate', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * AI-assisted service code suggestion
     */
    async suggestCode(descricao: string): Promise<{ codigoServico: string; descricao: string }> {
        const response = await api.post('/nfse/suggest-code', { descricao });
        return response.data;
    }
};

export default nfseService;
