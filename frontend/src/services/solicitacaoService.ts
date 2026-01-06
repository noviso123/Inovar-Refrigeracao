import api from './api';
import { SolicitacaoServico } from '../types';

export const solicitacaoService = {
  listar: async () => {
    const res = await api.get<SolicitacaoServico[]>('/solicitacoes');
    return res.data;
  },

  obterPorId: async (id: number) => {
    const res = await api.get<SolicitacaoServico>(`/solicitacoes/${id}`);
    return res.data;
  },

  criar: async (dados: any) => {
    const res = await api.post<SolicitacaoServico>('/solicitacoes', dados);
    return res.data;
  },

  atualizar: async (id: number, dados: any) => {
    const res = await api.put<SolicitacaoServico>(`/solicitacoes/${id}`, dados);
    return res.data;
  },

  remover: async (id: number) => {
    await api.delete(`/solicitacoes/${id}`);
  }
};
