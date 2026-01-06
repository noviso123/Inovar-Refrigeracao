import api from './api';
import { Equipamento } from '../types';

export const equipamentoService = {
    async listar(): Promise<Equipamento[]> {
        const response = await api.get<Equipamento[]>('/equipamentos');
        return response.data;
    },

    async obterPorId(id: number): Promise<Equipamento> {
        const response = await api.get<Equipamento>(`/equipamentos/${id}`);
        return response.data;
    },

    async criar(equipamento: Partial<Equipamento>): Promise<Equipamento> {
        const response = await api.post<Equipamento>('/equipamentos', equipamento);
        return response.data;
    },

    async atualizar(id: number, equipamento: Partial<Equipamento>): Promise<Equipamento> {
        const response = await api.put<Equipamento>(`/equipamentos/${id}`, equipamento);
        return response.data;
    },

    async remover(id: number): Promise<void> {
        await api.delete(`/equipamentos/${id}`);
    }
};
