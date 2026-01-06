import api from './api';

export interface QRCodeData {
    id?: string;
    empresaId?: string;
    nome: string;
    tipo: 'whatsapp' | 'instagram' | 'link' | 'tel' | 'wifi' | 'pix';
    destino: string;
    cor: string;
    corFundo: string;
    logoBase64?: string;
    tamanho: number;
    mensagem?: string; // Para WhatsApp
    textoRodape?: string; // Texto abaixo do QR
    ssid?: string; // Para WiFi
    senha?: string; // Para WiFi
    chavePix?: string; // Para Pix
    valorPix?: number; // Para Pix
    criadoEm?: any;
}

class QRCodesService {
    async listar() {
        const response = await api.get('/qrcodes');
        return response.data;
    }

    async criar(dados: QRCodeData) {
        const response = await api.post('/qrcodes', dados);
        return response.data;
    }

    async atualizar(id: string, dados: Partial<QRCodeData>) {
        const response = await api.put(`/qrcodes/${id}`, dados);
        return response.data;
    }

    async remover(id: string) {
        const response = await api.delete(`/qrcodes/${id}`);
        return response.data;
    }

    async buscarPorId(id: string) {
        const response = await api.get(`/qrcodes/${id}`);
        return response.data;
    }
}

export default new QRCodesService();
