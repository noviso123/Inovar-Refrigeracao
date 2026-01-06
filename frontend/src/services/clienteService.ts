import api from './api';
import { Cliente, Local } from '../types';

export const clienteService = {
  listar: async () => {
    const res = await api.get<Cliente[]>('/clientes');
    return res.data;
  },

  obterPorId: async (id: number) => {
    const res = await api.get<Cliente>(`/clientes/${id}`);
    return res.data;
  },

  criar: async (dados: any) => {
    // Map UI form to Backend ClientCreate schema
    const payload = {
        nome: dados.nome,
        email: dados.email,
        cpf: dados.cpf,
        cnpj: dados.cnpj,
        telefone: dados.telefone,
        primary_location: dados.primary_location || {
            nickname: 'Sede / Principal',
            address: dados.endereco,
            city: dados.cidade,
            state: dados.estado,
            zip_code: dados.cep,
            street_number: dados.numero,
            complement: dados.complemento,
            neighborhood: dados.bairro
        }
    };
    const res = await api.post<Cliente>('/clientes', payload);
    return res.data;
  },

  atualizar: async (id: number, dados: any) => {
    const res = await api.put<Cliente>(`/clientes/${id}`, dados);
    return res.data;
  },

  remover: async (id: number) => {
    const res = await api.delete(`/clientes/${id}`);
    return res.data;
  },

  adicionarLocal: async (clienteId: number, local: Partial<Local>) => {
    const res = await api.post<Local>(`/clientes/${clienteId}/locais`, local);
    return res.data;
  }
};
