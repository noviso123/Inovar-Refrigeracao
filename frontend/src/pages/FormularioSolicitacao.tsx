import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { queryClient } from '../lib/react-query';
import {
  Calendar, Clock, FileText, User as UserIcon, Wrench, AlertTriangle,
  Check, X, Plus, Search, ChevronDown, Sparkles, MapPin, Phone, Mail,
  ArrowRight, Zap
} from 'lucide-react';
import { SolicitacaoServico, Cliente, Equipamento, Usuario, PrioridadeOS, TipoServicoOS } from '../types';
import { Button } from '../components/Botao';
import { ModalSelecaoCliente } from '../components/ModalSelecaoCliente';
import { ModalSelecaoEquipamento } from '../components/ModalSelecaoEquipamento';
import { useNotification } from '../contexts/ContextoNotificacao';
import { solicitacaoService } from '../services/solicitacaoService';
import api from '../services/api';

interface Props {
  user: Usuario;
}

const PROBLEM_SUGGESTIONS = [
  "Ar condicionado não gela",
  "Barulho estranho na unidade externa",
  "Vazamento de água na unidade interna",
  "Controle remoto não responde",
  "Erro no display do equipamento",
  "Equipamento não liga",
  "Cheiro de queimado",
  "Manutenção preventiva periódica",
  "Instalação de novo equipamento",
  "Limpeza e higienização"
];

export const FormularioSolicitacao: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const { notify } = useNotification();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Form State
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeOS>('media');
  const [tipoServico, setTipoServico] = useState<TipoServicoOS>('corretiva');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [selectedEquipments, setSelectedEquipments] = useState<Equipamento[]>([]);

  // Address Auto-fill State
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOS, setCreatedOS] = useState<{ id: string | number; numero?: number } | null>(null);

  // Smart Input State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  // Auto-fill address logic
  useEffect(() => {
    if (selectedClient) {
      console.log('Selected Client for Auto-fill:', selectedClient);
      setCep(selectedClient.cep || '');
      setCity(selectedClient.cidade || '');
      setState(selectedClient.estado || '');

      if (selectedClient.endereco) {
        // Try to parse "Street, Number - Neighborhood"
        const parts = selectedClient.endereco.split(',');
        if (parts.length >= 2) {
          setStreet(parts[0].trim());
          const suffix = parts[1].trim();
          const subParts = suffix.split('-');
          if (subParts.length >= 2) {
            setNumber(subParts[0].trim());
            setNeighborhood(subParts.slice(1).join('-').trim());
          } else {
            setNumber(suffix);
            setNeighborhood('');
          }
        } else {
          // Fallback: Use the whole string as street if parsing fails
          setStreet(selectedClient.endereco);
          setNumber('S/N');
          setNeighborhood('');
        }
      } else {
        setStreet('');
        setNumber('');
        setNeighborhood('');
      }
    }
  }, [selectedClient]);

  const handleSmartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDescricao(value);
    if (value.length > 0) {
      const filtered = PROBLEM_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setDescricao(suggestion);
    setShowSuggestions(false);
    // Auto-set title if empty
    if (!titulo) {
      setTitulo(suggestion);
    }
  };

  const handleRemoveEquipment = (id: number) => {
    setSelectedEquipments(selectedEquipments.filter(eq => eq.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      notify('Selecione um cliente.', 'error');
      return;
    }
    if (selectedEquipments.length === 0) {
      notify('Selecione pelo menos um equipamento.', 'error');
      return;
    }

    try {
      console.log('=== SUBMITTING OS ===');
      console.log('Selected Client:', selectedClient);
      console.log('Client ID:', selectedClient?.id);

      const payload: any = {
        empresa_id: user.empresa_id || user.empresaId || 'super_default',
        cliente_id: selectedClient.id,
        tecnico_id: user.id, // AUTO-OWNERSHIP: Assign to current user
        tecnico_nome: user.nome_completo || user.nomeCompleto, // Nome para exibição direta
        criado_por: user.id,
        criado_por_nome: user.nome_completo || user.nomeCompleto, // Nome do criador para exibição
        titulo: titulo || descricao, // Fallback title
        descricao_detalhada: descricao,
        prioridade,
        tipo_servico: tipoServico,
        status: 'aberto', // Inicia como aberto, evolui conforme fluxo: orçando -> aprovado -> agendado -> em_andamento -> concluido
        itens_os: selectedEquipments.map(eq => ({
          equipamento_id: eq.id,
          descricao_tarefa: `Serviço em: ${eq.nome}`,
          quantidade: 1,
          valor_unitario: 0,
          status_item: 'pendente'
        }))
      };

      console.log('[FormularioSolicitacao] Enviando payload:', JSON.stringify(payload));

      const newOS = await solicitacaoService.criar(payload);

      console.log('[FormularioSolicitacao] OS Criada:', newOS);

      // Invalidate requests query to update lists
      queryClient.invalidateQueries({ queryKey: ['requests'] });

      setCreatedOS({ id: newOS.id, numero: newOS.numero });
      setShowSuccessModal(true);
      notify('Solicitação criada com sucesso!', 'success');
    } catch (error: any) {
      console.error('[FormularioSolicitacao] Erro ao criar OS:', error);

      // Check if it's an axios error with response
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error || error.response.data?.message || 'Erro desconhecido';

        if (status === 401) {
          notify('Sessão expirada. Faça login novamente.', 'error');
        } else if (status === 402) {
          notify('Assinatura inativa. Renove seu plano.', 'error');
        } else if (status === 403) {
          notify('Você não tem permissão para criar OS.', 'error');
        } else {
          const detail = error.response.data?.detail || error.response.data?.error || error.response.data?.message || 'Erro desconhecido';
          notify(`Erro ao criar solicitação: ${detail}`, 'error');
        }
      } else if (error.request) {
        notify('Erro de conexão com o servidor. Verifique sua internet.', 'error');
      } else {
        notify('Erro ao criar solicitação. Tente novamente.', 'error');
      }
    }
  };


  const handleResetForm = () => {
    setTitulo('');
    setDescricao('');
    setSelectedClient(null);
    setSelectedEquipments([]);
    setPrioridade('media');
    setTipoServico('corretiva');
    setShowSuccessModal(false);
    setCreatedOS(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Nova Solicitação</h1>
          <p className="text-sm text-gray-500 mt-1">Abra uma nova ordem de serviço rapidamente.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* 1. Client Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm mr-3">1</div>
              Cliente e Localização
            </h2>

            {!selectedClient ? (
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-center justify-center group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition">
                  <UserIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                </div>
                <span className="font-medium text-gray-600 group-hover:text-blue-700">Selecionar Cliente</span>
              </button>
            ) : (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 relative group">
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold text-xl shadow-sm">
                    {selectedClient.nome?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{selectedClient.nome}</h3>
                    <div className="flex flex-col gap-1 mt-1 text-sm text-gray-600">
                      <span className="flex items-center"><MapPin className="w-3 h-3 mr-2" /> {street}, {number} - {neighborhood}</span>
                      <span className="flex items-center ml-5">{city} - {state}</span>
                      {selectedClient.telefone && <span className="flex items-center"><Phone className="w-3 h-3 mr-2" /> {selectedClient.telefone}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Equipment Selection */}
          {selectedClient && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm mr-3">2</div>
                Equipamentos
              </h2>

              {selectedEquipments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {selectedEquipments.map(eq => (
                    <div key={eq.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-gray-100">
                          <Wrench className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{eq.nome}</p>
                          <p className="text-xs text-gray-500 truncate">{eq.marca} - {eq.modelo}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => handleRemoveEquipment(eq.id)} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsEquipmentModalOpen(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center font-medium"
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar Equipamento
              </button>
            </div>
          )}

          {/* 3. Service Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm mr-3">3</div>
              Detalhes do Serviço
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Serviço</label>
                <div className="relative">
                  <select
                    value={tipoServico}
                    onChange={e => setTipoServico(e.target.value as TipoServicoOS)}
                    className="w-full appearance-none border border-gray-300 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="corretiva">Manutenção Corretiva</option>
                    <option value="preventiva">Manutenção Preventiva</option>
                    <option value="instalacao">Instalação</option>
                    <option value="inspecao">Visita Técnica / Orçamento</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                <div className="flex gap-2">
                  {(['baixa', 'media', 'alta', 'critica'] as PrioridadeOS[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrioridade(p)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize transition border ${prioridade === p
                        ? p === 'alta' || p === 'critica' ? 'bg-red-100 border-red-200 text-red-700' : 'bg-blue-100 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                Descrição do Problema
                <span className="text-xs text-blue-600 flex items-center"><Sparkles className="w-3 h-3 mr-1" /> Sugestões Inteligentes Ativas</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Comece a digitar o problema (ex: Ar não gela...)"
                  value={descricao}
                  onChange={handleSmartInputChange}
                  onFocus={() => descricao && setShowSuggestions(true)}
                />
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />

                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {filteredSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm text-gray-700 border-b border-gray-50 last:border-0 transition"
                        onClick={() => selectSuggestion(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título da OS (Opcional)</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Resumo curto (ex: Troca de Compressor)"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={!selectedClient || selectedEquipments.length === 0}
              className="w-full md:w-auto px-8 py-4 text-lg shadow-lg shadow-blue-200"
            >
              Criar Ordem de Serviço
            </Button>
          </div>
        </form>
      </div>

      {/* Modals */}
      <ModalSelecaoCliente
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSelect={(cliente) => {
          setSelectedClient(cliente);
          setIsClientModalOpen(false);
          // Auto-open equipment modal after client selection
          setTimeout(() => setIsEquipmentModalOpen(true), 300);
        }}
      />

      {selectedClient && (
        <ModalSelecaoEquipamento
          isOpen={isEquipmentModalOpen}
          onClose={() => setIsEquipmentModalOpen(false)}
          onSelect={(eqs) => {
            const newEqs = Array.isArray(eqs) ? eqs : [eqs];
            const uniqueEqs = [...selectedEquipments];
            newEqs.forEach(eq => {
              if (!uniqueEqs.find(e => e.id === eq.id)) {
                uniqueEqs.push(eq);
              }
            });
            setSelectedEquipments(uniqueEqs);
            setIsEquipmentModalOpen(false);
          }}
          clienteId={selectedClient.id}
          multiple={true}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-brand-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Solicitação Criada!</h3>
            <p className="text-lg font-bold text-blue-600 mb-2">OS #{createdOS?.numero || createdOS?.id}</p>
            <p className="text-gray-500 mb-8">A ordem de serviço foi gerada e já está atribuída a você.</p>

            <div className="space-y-3">
              <button
                onClick={() => navigate(`/solicitacao/${createdOS?.numero || createdOS?.id}`)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition flex items-center justify-center"
              >
                <FileText className="w-5 h-5 mr-2" /> Visualizar OS
              </button>
              <button
                onClick={handleResetForm}
                className="w-full py-3 bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition"
              >
                Criar Nova Solicitação
              </button>
              <button
                onClick={() => navigate('/solicitacoes')}
                className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm font-medium"
              >
                Voltar para Lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
