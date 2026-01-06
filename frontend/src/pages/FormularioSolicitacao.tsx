import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { queryClient } from '../lib/react-query';
import { SolicitacaoServico, Cliente, Equipamento, Usuario, PrioridadeOS, TipoServicoOS, Local } from '../types';
import { Button } from '../components/Botao';
import { ModalSelecaoCliente } from '../components/ModalSelecaoCliente';
import { ModalSelecaoEquipamento } from '../components/ModalSelecaoEquipamento';
import { useNotification } from '../contexts/ContextoNotificacao';
import { solicitacaoService } from '../services/solicitacaoService';
import { Calendar, Clock, FileText, User as UserIcon, Wrench, AlertTriangle, Check, X, Plus, Search, ChevronDown, Sparkles, MapPin } from 'lucide-react';

interface Props {
  user: Usuario;
}

export const FormularioSolicitacao: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeOS>('media');
  const [tipoServico, setTipoServico] = useState<TipoServicoOS>('corretiva');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
  const [selectedEquipments, setSelectedEquipments] = useState<Equipamento[]>([]);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOS, setCreatedOS] = useState<SolicitacaoServico | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Set default local when client is selected
  useEffect(() => {
    if (selectedClient && selectedClient.locations && selectedClient.locations.length > 0) {
        setSelectedLocal(selectedClient.locations[0]);
    } else {
        setSelectedLocal(null);
    }
  }, [selectedClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) { notify('Selecione um cliente.', 'error'); return; }

    try {
      const payload = {
        titulo: titulo || descricao,
        descricao_detalhada: descricao,
        priority: prioridade,
        service_type: tipoServico,
        cliente_id: selectedClient.id,
        local_id: selectedLocal?.id || null,
        equipment_id: selectedEquipments[0]?.id || null,
        status: 'pendente'
      };

      const newOS = await solicitacaoService.criar(payload);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setCreatedOS(newOS);
      setShowSuccessModal(true);
      notify('Solicitação criada!', 'success');
    } catch (error: any) {
      notify(error.response?.data?.detail || 'Erro ao criar solicitação', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      <div className="bg-white border-b p-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Nova Solicitação</h1>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6 mt-4">
        {/* Cliente */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-brand-500" /> Cliente
          </h2>
          {!selectedClient ? (
            <Button onClick={() => setIsClientModalOpen(true)} variant="secondary" fullWidth>Selecionar Cliente</Button>
          ) : (
            <div className="flex items-center justify-between p-4 bg-brand-50 rounded-xl border border-brand-100">
               <div>
                 <p className="font-bold">{selectedClient.nome}</p>
                 <div className="text-sm text-surface-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {selectedLocal?.nickname || 'Local não definido'}
                 </div>
               </div>
               <button onClick={() => setSelectedClient(null)}><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>

        {/* Detalhes */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-500" /> Detalhes do Chamado
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Serviço</label>
                <select value={tipoServico} onChange={e => setTipoServico(e.target.value as any)} className="input">
                    <option value="corretiva">Corretiva</option>
                    <option value="preventiva">Preventiva</option>
                    <option value="instalacao">Instalação</option>
                    <option value="inspecao">Inspeção/Visita</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prioridade</label>
                <select value={prioridade} onChange={e => setPrioridade(e.target.value as any)} className="input">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                </select>
              </div>
          </div>

          <div>
              <label className="block text-sm font-medium mb-1">Título / Problema</label>
              <input className="input" placeholder="Ex: Ar não gela" value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>
          <div>
              <label className="block text-sm font-medium mb-1">Descrição Detalhada</label>
              <textarea className="input min-h-[100px]" placeholder="Mais detalhes sobre o problema..." value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
        </div>

        {/* Equipamento */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-brand-500" /> Equipamento
          </h2>
          {selectedClient && (
             <Button onClick={() => setIsEquipmentModalOpen(true)} variant="secondary" fullWidth>
               {selectedEquipments.length > 0 ? `${selectedEquipments[0].nome} selecionado` : 'Selecionar Equipamento'}
             </Button>
          )}
        </div>

        <Button onClick={handleSubmit} fullWidth size="lg">Criar Ordem de Serviço</Button>
      </div>

      <ModalSelecaoCliente isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSelect={setSelectedClient} />
      {selectedClient && (
        <ModalSelecaoEquipamento isOpen={isEquipmentModalOpen} onSelect={(eq) => setSelectedEquipments(Array.isArray(eq) ? eq : [eq])} onClose={() => setIsEquipmentModalOpen(false)} clienteId={selectedClient.id} />
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold">OS #{createdOS?.sequential_id}</h3>
            <p className="text-surface-500 mt-2 mb-6">Chamado aberto com sucesso!</p>
            <Button onClick={() => navigate(`/solicitacao/${createdOS?.id}`)} fullWidth>Ver Detalhes</Button>
            <Button variant="ghost" className="mt-2" onClick={() => navigate('/solicitacoes')} fullWidth>Voltar para Lista</Button>
          </div>
        </div>
      )}
    </div>
  );
};
