import api from './api';
import QRCode from 'qrcode';

export interface WhatsAppStatus {
    instance?: {
        instanceName: string;
        state: 'open' | 'connecting' | 'disconnected' | 'close';
    };
}

export interface WhatsAppConnectResponse {
    base64?: string;
    count?: number;
    instance?: {
        state: string;
    };
    code?: string; // Added code from Go engine
}

export interface WhatsAppInstance {
    instance: {
        instanceName: string;
        owner: string;
        profileName: string;
        profilePictureUrl: string;
        profileStatus: string;
        status: string;
        state?: string;
        serverUrl: string;
        apikey: string;
    }
}

export const whatsappService = {
    getInstances: async (): Promise<WhatsAppInstance[]> => {
        const response = await api.get('/whatsapp/instances');
        const data = response.data;

        if (Array.isArray(data)) {
            return data.map((item: any) => {
                const instanceName = item.instance?.instanceName || item.name || item.instanceName;
                const status = item.instance?.status || item.connectionStatus || 'disconnected';

                return {
                    instance: {
                        instanceName: instanceName,
                        owner: item.instance?.owner || item.ownerJid || '',
                        profileName: item.instance?.profileName || item.profileName || '',
                        profilePictureUrl: item.instance?.profilePictureUrl || item.profilePicUrl || '',
                        profileStatus: item.instance?.profileStatus || '',
                        status: status,
                        state: status,
                        serverUrl: item.instance?.serverUrl || '',
                        apikey: item.instance?.apikey || item.token || ''
                    }
                };
            });
        }
        return [];
    },

    createInstance: async (instanceName: string): Promise<any> => {
        const response = await api.post('/whatsapp/instances', { instanceName });
        return response.data;
    },

    deleteInstance: async (instanceName: string): Promise<void> => {
        await api.delete(`/whatsapp/instances/${instanceName}`);
    },

    getStatus: async (instanceName?: string): Promise<WhatsAppStatus> => {
        const url = instanceName ? `/whatsapp/status/${instanceName}` : '/whatsapp/status';
        const response = await api.get(url);
        return response.data;
    },

    connect: async (instanceName?: string): Promise<WhatsAppConnectResponse> => {
        const response = await api.post('/whatsapp/connect', { instanceName });
        const data = response.data;

        // Adapt Go Engine response (code) to Frontend expectation (base64)
        if (data.code && !data.base64) {
            try {
                const base64 = await QRCode.toDataURL(data.code);
                return { ...data, base64 };
            } catch (err) {
                console.error('Error generating QR:', err);
            }
        }
        return data;
    },

    connectWithPairingCode: async (phoneNumber: string, instanceName?: string): Promise<{
        success: boolean;
        pairingCode?: string;
        message?: string;
        fallbackToQR?: boolean;
        qrcode?: string;
    }> => {
        const response = await api.post('/whatsapp/connect-pairing', { instanceName, phoneNumber });
        return response.data;
    },

    logout: async (instanceName?: string): Promise<void> => {
        if (instanceName) {
            await api.delete(`/whatsapp/instances/${instanceName}`);
        } else {
            await api.post('/whatsapp/logout');
        }
    },

    sendText: async (number: string, text: string, instanceName?: string): Promise<any> => {
        const response = await api.post('/whatsapp/send', { number, text, instanceName });
        return response.data;
    },

    sendMedia: async (number: string, media: string, mediaType: 'image' | 'video' | 'document', caption?: string, fileName?: string, instanceName?: string): Promise<any> => {
        const response = await api.post('/whatsapp/send-media', { number, media, mediaType, caption, fileName, instanceName });
        return response.data;
    },

    // Alias for sendText for easier use
    sendMessage: async (number: string, text: string, instanceName?: string): Promise<any> => {
        const response = await api.post('/whatsapp/send', { number, text, instanceName });
        return response.data;
    }
};
