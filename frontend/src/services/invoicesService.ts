import api from './api';

export interface InvoicePending {
    subscription_id: string;
    company_name: string;
    company_cnpj: string;
    plan_name: string;
    amount: number;
    month_ref: string;
    status: string;
}

export interface InvoiceResponse {
    id: number;
    numero: string;
    status: string;
    pdf_url?: string;
    created_at: string;
    company_name: string;
    amount: number;
    month_ref?: string;
}

export interface InvoiceEmitRequest {
    subscription_id: string;
    month_ref: string;
    amount: number;
    description: string;
    service_code?: string;
}

export const invoicesService = {
    listPending: async (): Promise<InvoicePending[]> => {
        const response = await api.get('/admin/invoices/pending');
        return response.data;
    },

    listHistory: async (): Promise<InvoiceResponse[]> => {
        const response = await api.get('/admin/invoices');
        return response.data;
    },

    emit: async (data: InvoiceEmitRequest): Promise<InvoiceResponse> => {
        const response = await api.post('/admin/invoices', data);
        return response.data;
    },

    cancel: async (id: number): Promise<void> => {
        await api.post(`/admin/invoices/${id}/cancel`);
    }
};
