import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/react-query';
import { Usuario, PlanoAssinatura } from '../types';
import { assinaturaService } from '../services/assinaturaService';
import { useNotification } from '../contexts/ContextoNotificacao';
import {
    Package, Plus, Edit2, Trash2, Save, X, Loader2,
    Check, DollarSign, Users, Briefcase, Crown, User,
    Settings, CheckCircle2
} from 'lucide-react';
import { Button, FAB } from '../components/Botao';

interface Props {
    user: Usuario;
}

export default function GestaoPlanos({ user }: Props) {
    const { notify } = useNotification();

    // React Query for fetching plans
    const { data: planos = [], isLoading: carregando } = useQuery({
        queryKey: ['planos'],
        queryFn: async () => {
            const data = await assinaturaService.listarPlanos();
            return Array.isArray(data) ? data : [];
        },
        staleTime: 0, // Always fetch fresh data
    });

    // Fetch users for exclusive plan selection
    const { data: usuarios = [] } = useQuery({
        queryKey: ['users-for-plans'],
        queryFn: async () => {
            const res = await fetch('/api/usuarios', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            return res.ok ? res.json() : [];
        },
        staleTime: 1000 * 60 * 5,
    });

    const [salvando, setSalvando] = useState(false);
    const [isExclusiveMode, setIsExclusiveMode] = useState(false); // Para planos exclusivos

    const [modalAberto, setModalAberto] = useState(false);
    const [planoEditando, setPlanoEditando] = useState<Partial<PlanoAssinatura> | null>(null);

    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [valorMensal, setValorMensal] = useState('');
    const [recursos, setRecursos] = useState('');
    const [limiteClientes, setLimiteClientes] = useState('');
    const [limiteServicos, setLimiteServicos] = useState('');
    const [targetUserId, setTargetUserId] = useState(''); // ID do usuário alvo

    const abrirModalNovo = (exclusivo: boolean = false) => {
        setPlanoEditando(null);
        setIsExclusiveMode(exclusivo);
        setNome('');
        setDescricao('');
        setValorMensal('');
        setRecursos('');
        setLimiteClientes('');
        setLimiteServicos('');
        setTargetUserId('');
        setModalAberto(true);
    };

    const abrirModalEditar = (plano: PlanoAssinatura) => {
        setPlanoEditando(plano);
        setIsExclusiveMode(!!plano.targetUserId); // Se tem targetUserId é exclusivo
        setNome(plano.nome);
        setDescricao(plano.descricao);
        setValorMensal((plano.valorMensal || 0).toString());
        setRecursos(plano.recursos?.join('\n') || '');
        setLimiteClientes(plano.limiteClientes?.toString() || '');
        setLimiteServicos(plano.limiteServicos?.toString() || '');
        setTargetUserId(plano.targetUserId?.toString() || '');
        setModalAberto(true);
    };

    const fecharModal = () => {
        setModalAberto(false);
        setPlanoEditando(null);
    };

    // Gera descrição automática baseada no nome do plano
    const gerarDescricaoAutomatica = (nomePlano: string): string => {
        const nomeUpper = nomePlano.toLowerCase();
        if (nomeUpper.includes('básico') || nomeUpper.includes('basico') || nomeUpper.includes('starter')) {
            return 'Plano ideal para profissionais autônomos e pequenas empresas. Inclui recursos essenciais para começar a organizar seus serviços.';
        } else if (nomeUpper.includes('profissional') || nomeUpper.includes('pro')) {
            return 'Solução completa para empresas em crescimento. Recursos avançados, suporte prioritário e relatórios detalhados.';
        } else if (nomeUpper.includes('enterprise') || nomeUpper.includes('empresarial')) {
            return 'Plano corporativo com recursos ilimitados, integrações avançadas, SLA dedicado e suporte 24/7.';
        } else if (nomeUpper.includes('premium') || nomeUpper.includes('vip')) {
            return 'Experiência premium com todas as funcionalidades liberadas, prioridade máxima no suporte e benefícios exclusivos.';
        } else {
            return `Plano ${nomePlano} com recursos personalizados para atender às suas necessidades específicas de refrigeração.`;
        }
    };

    // Gera lista de recursos automática baseada no nome do plano
    const gerarRecursosAutomaticos = (nomePlano: string): string => {
        const nomeUpper = nomePlano.toLowerCase();
        if (nomeUpper.includes('básico') || nomeUpper.includes('basico') || nomeUpper.includes('starter')) {
            return `✓ Cadastro de clientes
✓ Gestão de ordens de serviço
✓ Relatórios básicos
✓ Aplicativo mobile
✓ Suporte por email`;
        } else if (nomeUpper.includes('profissional') || nomeUpper.includes('pro')) {
            return `✓ Tudo do plano Básico
✓ Clientes ilimitados
✓ Gestão de técnicos
✓ Relatórios avançados
✓ Integração WhatsApp
✓ Suporte prioritário
✓ Agenda inteligente`;
        } else if (nomeUpper.includes('enterprise') || nomeUpper.includes('empresarial')) {
            return `✓ Tudo do plano Profissional
✓ Recursos ilimitados
✓ Múltiplos usuários
✓ API de integração
✓ SLA dedicado
✓ Suporte 24/7
✓ Treinamento personalizado
✓ Backup em tempo real`;
        } else if (nomeUpper.includes('premium') || nomeUpper.includes('vip')) {
            return `✓ Acesso a TODAS as funcionalidades
✓ Sem limites de uso
✓ Prioridade máxima no suporte
✓ Gerente de conta dedicado
✓ Recursos exclusivos em primeira mão
✓ Desconto em upgrades futuros
✓ Consultoria gratuita`;
        } else {
            return `✓ Gestão de clientes
✓ Ordens de serviço
✓ Relatórios
✓ Suporte técnico`;
        }
    };

    // Gera limites automáticos baseados no nome do plano
    const gerarLimitesAutomaticos = (nomePlano: string): { clientes: string; servicos: string } => {
        const nomeUpper = nomePlano.toLowerCase();
        if (nomeUpper.includes('básico') || nomeUpper.includes('basico') || nomeUpper.includes('starter')) {
            return { clientes: '50', servicos: '100' };
        } else if (nomeUpper.includes('profissional') || nomeUpper.includes('pro')) {
            return { clientes: '200', servicos: '500' };
        } else if (nomeUpper.includes('enterprise') || nomeUpper.includes('empresarial')) {
            return { clientes: '', servicos: '' }; // Ilimitado
        } else if (nomeUpper.includes('premium') || nomeUpper.includes('vip')) {
            return { clientes: '', servicos: '' }; // Ilimitado
        } else {
            return { clientes: '100', servicos: '200' };
        }
    };

    const handleNomeChange = (novoNome: string) => {
        setNome(novoNome);

        // Auto-preenche descrição se estiver vazia ou se for padrão
        if (!descricao.trim() || descricao.startsWith('Plano ') || descricao.includes('recursos essenciais') || descricao.includes('Solução completa') || descricao.includes('corporativo') || descricao.includes('premium')) {
            setDescricao(gerarDescricaoAutomatica(novoNome));
        }

        // Auto-preenche recursos se estiver vazio ou for padrão
        if (!recursos.trim() || recursos.startsWith('✓')) {
            setRecursos(gerarRecursosAutomaticos(novoNome));
        }

        // Auto-preenche limites se estiverem vazios
        if (!limiteClientes && !limiteServicos) {
            const limites = gerarLimitesAutomaticos(novoNome);
            setLimiteClientes(limites.clientes);
            setLimiteServicos(limites.servicos);
        }
    };

    const salvarPlano = async () => {
        if (!nome.trim() || !valorMensal) {
            notify('Nome e valor mensal são obrigatórios', 'error');
            return;
        }

        try {
            setSalvando(true);
            const dadosPlano = {
                nome: nome.trim(),
                descricao: descricao.trim(),
                valorMensal: parseFloat(valorMensal),
                recursos: recursos.split('\n').filter(r => r.trim()),
                limiteClientes: limiteClientes ? parseInt(limiteClientes) : undefined,
                limiteServicos: limiteServicos ? parseInt(limiteServicos) : undefined,
                // Só inclui targetUserId se for modo exclusivo
                targetUserId: isExclusiveMode && targetUserId ? parseInt(targetUserId) : undefined,
                ativo: true
            };

            let planoSalvo: PlanoAssinatura;

            if (planoEditando?.id) {
                planoSalvo = await assinaturaService.atualizarPlano(planoEditando.id, dadosPlano);

                // Update local cache immediately
                queryClient.setQueryData(['planos'], (old: PlanoAssinatura[] = []) =>
                    old.map(p => p.id === planoSalvo.id ? planoSalvo : p)
                );

                notify('Plano atualizado!', 'success');
            } else {
                planoSalvo = await assinaturaService.criarPlano(dadosPlano as any);

                // Add to local cache immediately
                queryClient.setQueryData(['planos'], (old: PlanoAssinatura[] = []) =>
                    [...old, planoSalvo]
                );

                notify('Plano criado!', 'success');
            }

            fecharModal();
        } catch (error: any) {
            notify('Erro ao salvar plano', 'error');
        } finally {
            setSalvando(false);
        }
    };

    const deletarPlano = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este plano?')) return;
        try {
            await assinaturaService.deletarPlano(id);

            // Remove from local cache immediately
            queryClient.setQueryData(['planos'], (old: PlanoAssinatura[] = []) =>
                old.filter(p => p.id !== id)
            );

            notify('Plano excluído!', 'success');
        } catch (error: any) {
            notify('Erro ao excluir plano', 'error');
        }
    };

    const toggleAtivo = async (plano: PlanoAssinatura) => {
        try {
            // Optimistic update (update UI before server response)
            const novoStatus = !plano.ativo;

            queryClient.setQueryData(['planos'], (old: PlanoAssinatura[] = []) =>
                old.map(p => p.id === plano.id ? { ...p, ativo: novoStatus } : p)
            );

            await assinaturaService.atualizarPlano(plano.id, { ativo: novoStatus });
            notify(`Plano ${novoStatus ? 'ativado' : 'desativado'}!`, 'success');
        } catch (error: any) {
            // Revert on error
            queryClient.setQueryData(['planos'], (old: PlanoAssinatura[] = []) =>
                old.map(p => p.id === plano.id ? { ...p, ativo: plano.ativo } : p)
            );
            notify('Erro ao atualizar plano', 'error');
        }
    };

    if (user.cargo !== 'super_admin') {
        return (
            <div className="card p-8 text-center">
                <p className="text-red-500">Acesso negado. Apenas SuperAdmin pode gerenciar planos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-surface-800 flex items-center gap-2">
                        <Package className="w-6 h-6 text-brand-500" />
                        Gestão de Planos
                    </h1>
                    <p className="text-surface-500 text-sm mt-0.5">
                        Gerencie os planos de assinatura
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => abrirModalNovo(false)} className="hidden sm:flex">
                        <Plus className="w-5 h-5" />
                        <span>Novo Plano</span>
                    </Button>
                    <Button onClick={() => abrirModalNovo(true)} className="hidden sm:flex" variant="outline">
                        <Crown className="w-5 h-5 text-yellow-500 mr-2" />
                        <span>Plano Exclusivo</span>
                    </Button>
                </div>
            </div>

            {/* Lista de Planos */}
            {carregando ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
            ) : planos.length === 0 ? (
                <div className="card p-12 text-center">
                    <Package className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-surface-600">Nenhum plano cadastrado</p>
                    <p className="text-sm text-surface-400 mt-1 mb-4">Crie seu primeiro plano de assinatura</p>
                    <Button onClick={() => abrirModalNovo(false)}>
                        <Plus className="w-4 h-4" />
                        <span>Criar Plano</span>
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {planos.map(plano => (
                        <div
                            key={plano.id}
                            className={`card overflow-hidden transition-all flex flex-col h-full ${plano.ativo ? 'border-brand-200' : 'opacity-60'
                                }`}
                        >
                            <div className="flex-1 flex flex-col">
                                {/* Header do Card */}
                                <div className={`p-4 sm:p-5 ${plano.ativo
                                    ? 'bg-gradient-to-r from-brand-500 to-brand-600'
                                    : 'bg-surface-400'
                                    } text-white`}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-lg font-bold">{plano.nome}</h3>
                                        {!plano.ativo && (
                                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Inativo</span>
                                        )}
                                    </div>
                                    <p className="text-brand-100 text-sm mt-0.5 line-clamp-1">{plano.descricao}</p>

                                    {plano.targetUserId && (
                                        <div className="mt-2 flex items-center gap-1 text-xs bg-yellow-400/20 text-yellow-200 px-2 py-1 rounded-lg w-fit">
                                            <Crown className="w-3 h-3" />
                                            <span>Exclusivo (ID: {plano.targetUserId})</span>
                                        </div>
                                    )}
                                </div>

                                {/* Preço */}
                                <div className="p-4 sm:p-5 border-b border-surface-100">
                                    <div className="flex items-baseline">
                                        <span className="text-sm text-surface-500">R$</span>
                                        <span className="text-3xl font-black text-surface-800 mx-1">
                                            {(plano.valorMensal || 0).toFixed(2).split('.')[0]}
                                        </span>
                                        <span className="text-surface-500">,{(plano.valorMensal || 0).toFixed(2).split('.')[1]}/mês</span>
                                    </div>
                                </div>

                                {/* Recursos */}
                                <div className="p-4 sm:p-5 space-y-2 flex-1">
                                    {plano.limiteClientes && (
                                        <div className="flex items-center text-sm text-surface-600">
                                            <Users className="w-4 h-4 mr-2 text-brand-500" />
                                            Até {plano.limiteClientes} clientes
                                        </div>
                                    )}
                                    {plano.limiteServicos && (
                                        <div className="flex items-center text-sm text-surface-600">
                                            <Briefcase className="w-4 h-4 mr-2 text-brand-500" />
                                            Até {plano.limiteServicos} serviços/mês
                                        </div>
                                    )}
                                    {plano.recursos?.slice(0, 4).map((recurso, idx) => (
                                        <div key={idx} className="flex items-center text-sm text-surface-600">
                                            <Check className="w-4 h-4 mr-2 text-brand-500" />
                                            <span className="truncate">{recurso}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="p-3 bg-surface-50 flex gap-2 mt-auto border-t border-surface-100">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => abrirModalEditar(plano)}
                                >
                                    <Edit2 className="w-4 h-4" />
                                    <span className="hidden sm:inline ml-1">Editar</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => toggleAtivo(plano)}
                                >
                                    {plano.ativo ? 'Desativar' : 'Ativar'}
                                </Button>
                                <button
                                    onClick={() => deletarPlano(plano.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* FAB Mobile */}
            <FAB
                icon={<Plus className="w-6 h-6" />}
                label="Novo Plano"
                onClick={() => abrirModalNovo(false)}
                className="lg:hidden"
            />

            {/* Modal - Fullscreen via Portal */}
            {modalAberto && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-surface-200 flex items-center gap-3 bg-white shrink-0">
                            <button
                                onClick={fecharModal}
                                className="p-2 hover:bg-surface-100 rounded-xl transition-colors text-surface-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h3 className="text-lg font-bold text-surface-800">
                                {planoEditando ? 'Editar Plano' : 'Novo Plano'}
                            </h3>
                        </div>

                        {/* Content - fills all remaining space */}
                        <div className="flex-1 overflow-y-auto p-4 bg-surface-50">
                            <div className="max-w-7xl mx-auto space-y-6 h-full flex flex-col">
                                {/* Grid Layout Principal */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

                                    {/* Coluna 1: Informações Básicas */}
                                    <div className="bg-white p-6 rounded-xl border border-surface-100 shadow-sm flex flex-col gap-6">
                                        <h4 className="text-base font-semibold text-surface-800 flex items-center gap-2 border-b pb-2">
                                            <Package className="w-5 h-5 text-brand-500" />
                                            Informações Principais
                                        </h4>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                                                    Nome do Plano *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={nome}
                                                    onChange={e => setNome(e.target.value)}
                                                    placeholder="Ex: Plano Básico"
                                                    className="input w-full"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                                                    Valor Mensal (R$) *
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">R$</span>
                                                    <input
                                                        type="number"
                                                        value={valorMensal}
                                                        onChange={e => setValorMensal(e.target.value)}
                                                        placeholder="0.00"
                                                        className="input pl-10 w-full"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                                                    Descrição Curta
                                                </label>
                                                <textarea
                                                    value={descricao}
                                                    onChange={e => setDescricao(e.target.value)}
                                                    placeholder="Breve descrição dos benefícios..."
                                                    className="input w-full h-32 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coluna 2: Limites e Configurações */}
                                    <div className="bg-white p-6 rounded-xl border border-surface-100 shadow-sm flex flex-col gap-6">
                                        <h4 className="text-base font-semibold text-surface-800 flex items-center gap-2 border-b pb-2">
                                            <Settings className="w-5 h-5 text-brand-500" />
                                            Limites e Regras
                                        </h4>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                                                        Max. Clientes
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={limiteClientes}
                                                        onChange={e => setLimiteClientes(e.target.value)}
                                                        placeholder="Ilimitado"
                                                        className="input w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                                                        Max. Serviços
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={limiteServicos}
                                                        onChange={e => setLimiteServicos(e.target.value)}
                                                        placeholder="Ilimitado"
                                                        className="input w-full"
                                                    />
                                                </div>
                                            </div>

                                            {/* Só mostra seção exclusiva se foi aberta via botão Plano Exclusivo */}
                                            {isExclusiveMode && (
                                                <>
                                                    <div className="pt-4 border-t border-surface-100">
                                                        <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                                                            <Crown className="w-5 h-5 text-yellow-500" />
                                                            <div>
                                                                <span className="block text-sm font-medium text-surface-900">Plano Exclusivo</span>
                                                                <span className="block text-xs text-surface-500">Este plano será visível apenas para o usuário selecionado</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <label className="block text-sm font-medium text-surface-700 mb-1.5">
                                                            Usuário Alvo *
                                                        </label>
                                                        <div className="relative">
                                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                                                            <select
                                                                value={targetUserId}
                                                                onChange={e => setTargetUserId(e.target.value)}
                                                                className="input pl-9 appearance-none w-full bg-yellow-50 border-yellow-200 focus:border-yellow-500 focus:ring-yellow-500"
                                                            >
                                                                <option value="">Selecione um usuário...</option>
                                                                {usuarios.map((u: any) => (
                                                                    <option key={u.id} value={u.id}>
                                                                        {u.nome_completo || u.email} - {u.cargo || 'N/D'}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <p className="text-xs text-surface-500 mt-1">
                                                            Este plano só aparecerá para o usuário selecionado.
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Coluna 3: Recursos (Lista) */}
                                    <div className="bg-white p-6 rounded-xl border border-surface-100 shadow-sm flex flex-col gap-6 lg:row-span-2 h-full">
                                        <h4 className="text-base font-semibold text-surface-800 flex items-center gap-2 border-b pb-2">
                                            <CheckCircle2 className="w-5 h-5 text-brand-500" />
                                            Lista de Recursos
                                        </h4>

                                        <div className="flex-1 flex flex-col">
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">
                                                Itens Inclusos (um por linha)
                                            </label>
                                            <textarea
                                                value={recursos}
                                                onChange={e => setRecursos(e.target.value)}
                                                placeholder="✓ Suporte 24/7&#10;✓ Acesso ilimitado&#10;✓ Relatórios avançados"
                                                className="input w-full flex-1 resize-none font-mono text-sm leading-relaxed min-h-[300px]"
                                            />
                                            <p className="text-xs text-surface-500 mt-2">
                                                Dica: Use emojis como ✓ ou • para destacar os itens.
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-surface-200 bg-white flex justify-end gap-3 shrink-0">
                            <Button
                                variant="ghost"
                                onClick={fecharModal}
                                disabled={salvando}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={salvarPlano}
                                disabled={salvando}
                                className="min-w-[120px]"
                            >
                                {salvando ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar Plano
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
