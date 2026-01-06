import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/react-query';
import { Usuario, Assinatura } from '../types';
import { assinaturaService } from '../services/assinaturaService';
import { useNotification } from '../contexts/ContextoNotificacao';
import {
    Users, CheckCircle, Clock, XCircle, Loader2,
    Search, Filter, ChevronDown, UserCheck, Ban,
    Calendar, DollarSign, Eye
} from 'lucide-react';
import { Button } from '../components/Botao';

interface Props {
    user: Usuario;
}

interface PrestadorPendente {
    id: string;
    nome_completo: string;
    email: string;
    telefone?: string;
    criado_em: string;
}

export default function GestaoAssinaturas({ user }: Props) {
    const { notify } = useNotification();

    // React Query for fetching signatures
    const { data: assinaturas = [], isLoading: loadingAssinaturas } = useQuery({
        queryKey: ['assinaturas'],
        queryFn: async () => {
            const data = await assinaturaService.listarAssinaturas();
            return Array.isArray(data) ? data : [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // React Query for fetching pending providers
    const { data: prestadoresPendentes = [], isLoading: loadingPendentes } = useQuery({
        queryKey: ['prestadoresPendentes'],
        queryFn: async () => {
            const data = await assinaturaService.listarPrestadoresPendentes();
            return Array.isArray(data) ? data : [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const carregando = loadingAssinaturas || loadingPendentes;
    const [processando, setProcessando] = useState<string | null>(null);

    // Filtros
    const [filtroStatus, setFiltroStatus] = useState<string>('todos');
    const [busca, setBusca] = useState('');
    const [abaAtiva, setAbaAtiva] = useState<'assinaturas' | 'pendentes'>('assinaturas');

    const aprovarPrestador = async (id: string) => {
        try {
            setProcessando(id);
            await assinaturaService.aprovarPrestador(id);
            notify('Prestador aprovado com sucesso!', 'success');
            queryClient.invalidateQueries({ queryKey: ['prestadoresPendentes'] });
        } catch (error: any) {
            notify('Erro ao aprovar: ' + error.message, 'error');
        } finally {
            setProcessando(null);
        }
    };

    const confirmarPagamento = async (assinaturaId: string) => {
        try {
            setProcessando(assinaturaId);
            await assinaturaService.confirmarPagamento(assinaturaId);
            notify('Pagamento confirmado!', 'success');
            queryClient.invalidateQueries({ queryKey: ['assinaturas'] });
        } catch (error: any) {
            notify('Erro ao confirmar: ' + error.message, 'error');
        } finally {
            setProcessando(null);
        }
    };

    const cancelarAssinatura = async (assinaturaId: string) => {
        if (!confirm('Tem certeza que deseja cancelar esta assinatura?')) return;

        try {
            setProcessando(assinaturaId);
            await assinaturaService.cancelarAssinatura(assinaturaId);
            notify('Assinatura cancelada.', 'info');
            queryClient.invalidateQueries({ queryKey: ['assinaturas'] });
        } catch (error: any) {
            notify('Erro ao cancelar: ' + error.message, 'error');
        } finally {
            setProcessando(null);
        }
    };

    // Filtros (with defensive array check)
    const safeAssinaturas = Array.isArray(assinaturas) ? assinaturas : [];
    const safePrestadoresPendentes = Array.isArray(prestadoresPendentes) ? prestadoresPendentes : [];
    const assinaturasFiltradas = safeAssinaturas.filter(a => {
        if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false;
        // Adicionar busca por ID de prestador se necessário
        return true;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ativa':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Ativa</span>;
            case 'pendente':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</span>;
            case 'vencida':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Vencida</span>;
            case 'cancelada':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Ban className="w-3 h-3 mr-1" />Cancelada</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>;
        }
    };

    if (user.cargo !== 'super_admin') {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500">Acesso negado. Apenas SuperAdmin pode acessar esta página.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Cabeçalho */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Users className="w-8 h-8 text-brand-500" />
                    Gestão de Assinaturas
                </h1>
                <p className="text-gray-500 mt-1">Gerencie prestadores e suas assinaturas</p>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{safeAssinaturas.filter(a => a.status === 'ativa').length}</p>
                            <p className="text-sm text-gray-500">Ativas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{safeAssinaturas.filter(a => a.status === 'pendente').length}</p>
                            <p className="text-sm text-gray-500">Aguardando Pagamento</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{safeAssinaturas.filter(a => a.status === 'vencida' || a.status === 'cancelada').length}</p>
                            <p className="text-sm text-gray-500">Inativas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-50 rounded-lg">
                            <UserCheck className="w-5 h-5 text-brand-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{safePrestadoresPendentes.length}</p>
                            <p className="text-sm text-gray-500">Aguardando Aprovação</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Abas */}
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setAbaAtiva('assinaturas')}
                        className={`flex-1 py-4 text-center font-medium transition ${abaAtiva === 'assinaturas'
                            ? 'text-brand-500 border-b-2 border-brand-500 bg-brand-50'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <DollarSign className="w-4 h-4 inline mr-2" />
                        Assinaturas ({safeAssinaturas.length})
                    </button>
                    <button
                        onClick={() => setAbaAtiva('pendentes')}
                        className={`flex-1 py-4 text-center font-medium transition relative ${abaAtiva === 'pendentes'
                            ? 'text-brand-500 border-b-2 border-brand-500 bg-brand-50'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <UserCheck className="w-4 h-4 inline mr-2" />
                        Prestadores Pendentes ({safePrestadoresPendentes.length})
                        {safePrestadoresPendentes.length > 0 && (
                            <span className="absolute top-2 right-4 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                {safePrestadoresPendentes.length}
                            </span>
                        )}
                    </button>
                </div>

                {carregando ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        <span className="ml-3 text-gray-500">Carregando...</span>
                    </div>
                ) : (
                    <>
                        {/* Aba Assinaturas */}
                        {abaAtiva === 'assinaturas' && (
                            <div>
                                {/* Filtros */}
                                <div className="p-4 border-b border-gray-100 flex gap-4 items-center">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por ID do prestador..."
                                            value={busca}
                                            onChange={e => setBusca(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                    <select
                                        value={filtroStatus}
                                        onChange={e => setFiltroStatus(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500"
                                    >
                                        <option value="todos">Todos os status</option>
                                        <option value="ativa">Ativas</option>
                                        <option value="pendente">Pendentes</option>
                                        <option value="vencida">Vencidas</option>
                                        <option value="cancelada">Canceladas</option>
                                    </select>
                                </div>

                                {/* Tabela */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 text-gray-500 text-sm">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Prestador</th>
                                                <th className="px-4 py-3 text-left">E-mail</th>
                                                <th className="px-4 py-3 text-left">Plano</th>
                                                <th className="px-4 py-3 text-left">Valor</th>
                                                <th className="px-4 py-3 text-left">Status</th>
                                                <th className="px-4 py-3 text-left">Vencimento</th>
                                                <th className="px-4 py-3 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {assinaturasFiltradas.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="text-center py-12 text-gray-400">
                                                        Nenhuma assinatura encontrada.
                                                    </td>
                                                </tr>
                                            ) : (
                                                assinaturasFiltradas.map(assinatura => (
                                                    <tr key={assinatura.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-gray-900">
                                                                {assinatura.prestador?.nomeCompleto || assinatura.prestador?.nome_completo || 'N/A'}
                                                            </div>
                                                            <code className="text-xs text-gray-400">#{assinatura.numero || 'N/A'}</code>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {assinatura.prestador?.email || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-brand-600">
                                                            {assinatura.plano?.nome || 'Plano não identificado'}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700">
                                                            R$ {(assinatura.valorMensal || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {getStatusBadge(assinatura.status)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {assinatura.dataVencimento ? new Date(assinatura.dataVencimento).toLocaleDateString('pt-BR') : 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex justify-center gap-2">
                                                                {assinatura.status === 'pendente' && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => confirmarPagamento(assinatura.id)}
                                                                        disabled={processando === assinatura.id}
                                                                        className="bg-brand-500 hover:bg-brand-600"
                                                                    >
                                                                        {processando === assinatura.id ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                        ) : (
                                                                            <CheckCircle className="w-3 h-3" />
                                                                        )}
                                                                    </Button>
                                                                )}
                                                                {(assinatura.status === 'ativa' || assinatura.status === 'pendente') && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        onClick={() => cancelarAssinatura(assinatura.id)}
                                                                        disabled={processando === assinatura.id}
                                                                    >
                                                                        <Ban className="w-3 h-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Aba Prestadores Pendentes */}
                        {abaAtiva === 'pendentes' && (
                            <div className="p-4">
                                {safePrestadoresPendentes.length === 0 ? (
                                    <div className="text-center py-12">
                                        <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">Nenhum prestador aguardando aprovação.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {safePrestadoresPendentes.map(prestador => (
                                            <div
                                                key={prestador.id}
                                                className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between"
                                            >
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{prestador.nome_completo}</h4>
                                                    <p className="text-sm text-gray-600">{prestador.email}</p>
                                                    {prestador.telefone && (
                                                        <p className="text-sm text-gray-500">{prestador.telefone}</p>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Cadastrado em: {new Date(prestador.criado_em).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={() => aprovarPrestador(prestador.id)}
                                                    disabled={processando === prestador.id}
                                                    className="bg-brand-500 hover:bg-brand-600"
                                                >
                                                    {processando === prestador.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                    )}
                                                    Aprovar
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )
                }
            </div >
        </div >
    );
}
