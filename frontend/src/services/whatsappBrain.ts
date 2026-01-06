
import api from './api';

export interface BotStatus {
    connected: boolean;
    status: 'conectado' | 'desconectado' | 'aguardando_qr' | 'unknown';
    qr_code: string | null;
    last_update: string;
}

export interface BotConfig {
    min_delay: number;
    max_delay: number;
    hora_inicio: string;
    hora_fim: string;
    ativo: boolean;
    bot_nome: string;
}

export const whatsappBrain = {
    getStatus: async (): Promise<BotStatus> => {
        const response = await api.get('/whatsapp/status');
        return response.data;
    },

    getConfig: async (): Promise<BotConfig> => {
        const response = await api.get('/whatsapp/config');
        return response.data;
    },

    updateConfig: async (config: Partial<BotConfig>) => {
        const response = await api.post('/whatsapp/config', config);
        return response.data;
    },

    reconnect: async () => {
        const response = await api.post('/whatsapp/reconnect');
        return response.data;
    },

    sendMessage: async (number: string, message: string, mediaUrl?: string) => {
        const response = await api.post('/whatsapp/send', { number, message, media_url: mediaUrl });
        return response.data;
    }
};
