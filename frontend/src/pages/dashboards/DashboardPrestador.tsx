import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Usuario } from '../../types';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatadores';
import { StatusBadge } from '../../components/EmblemaStatus';
import { FAB } from '../../components/Botao';
import { DashboardSkeleton } from '../../components/Skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    Wallet, Clock, CheckCircle, Users, Briefcase,
    Plus, ChevronRight, TrendingUp, Calendar,
    DollarSign, RefreshCw, AlertTriangle, Activity
} from 'lucide-react';

interface Props {
    user: Usuario;
}

export const DashboardPrestador: React.FC<Props> = ({ user }) => {
    const navigate = useNavigate();

    const { data: metrics, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard-prestador'],
        queryFn: async () => {
            const res = await api.get('/dashboard/prestador');
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const handleRefresh = () => {
        refetch();
    };

    // Mostrar skeleton enquanto não tem cache E está carregando
    if (isLoading && !metrics) {
        return <DashboardSkeleton />;
    }

    const { overview, servicos, financeiro, revenueChart, clientes, assinatura } = metrics || {};

    // Card de estatística
    const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, subvalue, trend, onClick }: any) => (
        <button
            onClick={onClick}
            className="card p-4 text-left w-full hover:border-brand-200 transition-all"
        >
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl ${iconBg}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className="text-xs font-medium text-surface-500 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold text-surface-800">{value}</p>
            <div className="flex items-center justify-between mt-1">
                {subvalue && <p className="text-xs text-surface-400">{subvalue}</p>}
                {trend && (
                    <span className="text-xs text-brand-500 font-medium flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" /> {trend}
                    </span>
                )}
            </div>
        </button>
    );

    // Alerta de assinatura
    const AssinaturaAlert = () => {
        if (!assinatura) {
            return (
                <div className="card p-4 bg-yellow-50 border-yellow-200 flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-medium text-yellow-800">Você não tem uma assinatura ativa</p>
                        <p className="text-sm text-yellow-600">Assine um plano para acessar todas as funcionalidades.</p>
                    </div>
                    <button
                        onClick={() => navigate('/minha-assinatura')}
                        className="btn btn-primary text-sm px-3 py-2"
                    >
                        Assinar
                    </button>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-surface-800">
                        Olá, {user.nome_completo?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-surface-500 text-sm">
                        Resumo do seu negócio
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefetching}
                        className="btn btn-ghost p-2.5"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => navigate('/nova-solicitacao')}
                        className="btn btn-primary hidden sm:flex"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nova OS</span>
                    </button>
                </div>
            </div>

            {/* Alerta de assinatura */}
            <AssinaturaAlert />

            {/* KPIs Principais - 2 colunas mobile, 4 desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    icon={Wallet}
                    iconBg="bg-green-50"
                    iconColor="text-green-600"
                    label="Receita Total"
                    value={overview?.receitaTotalFormatted || 'R$ 0,00'}
                    subvalue="Todos pagamentos recebidos"
                />
                <StatCard
                    icon={DollarSign}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                    label="Este Mês"
                    value={overview?.receitaEsteMesFormatted || 'R$ 0,00'}
                    subvalue={`${overview?.servicosEsteMes || 0} serviços`}
                />
                <StatCard
                    icon={Clock}
                    iconBg="bg-orange-50"
                    iconColor="text-orange-600"
                    label="Em Aberto"
                    value={overview?.servicosEmAberto || 0}
                    subvalue="Aguardando ação"
                    onClick={() => navigate('/empresario/solicitacoes')}
                />
                <StatCard
                    icon={Users}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                    label="Clientes"
                    value={clientes?.total || 0}
                    subvalue={`${clientes?.ativos || 0} ativos`}
                    onClick={() => navigate('/empresario/clientes')}
                />
            </div>

            {/* Status dos Serviços - Visual */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <div className="card p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{servicos?.porStatus?.pendente || 0}</p>
                    <p className="text-xs text-surface-500 mt-1">Pendentes</p>
                </div>
                <div className="card p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{servicos?.porStatus?.agendado || 0}</p>
                    <p className="text-xs text-surface-500 mt-1">Agendados</p>
                </div>
                <div className="card p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{servicos?.porStatus?.em_andamento || 0}</p>
                    <p className="text-xs text-surface-500 mt-1">Executando</p>
                </div>
                <div className="card p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{servicos?.porStatus?.concluido || 0}</p>
                    <p className="text-xs text-surface-500 mt-1">Concluídos</p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-surface-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-500" />
                        Atividade Recente
                    </h3>
                    <button
                        onClick={() => navigate('/empresario/solicitacoes')}
                        className="text-sm text-brand-500 font-medium hover:text-brand-600 flex items-center gap-1"
                    >
                        Ver tudo
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {!servicos?.recentes?.length ? (
                    <div className="text-center py-8">
                        <Briefcase className="w-10 h-10 text-surface-300 mx-auto mb-2" />
                        <p className="text-surface-400 text-sm">Nenhum serviço recente</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {servicos.recentes.map((os: any) => (
                            <button
                                key={os.id}
                                onClick={() => navigate(`/solicitacao/${os.numero || os.id}`)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors text-left group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <Briefcase className="w-5 h-5 text-surface-500 group-hover:text-brand-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-surface-800 truncate group-hover:text-brand-600">
                                        {os.titulo}
                                    </p>
                                    <p className="text-xs text-surface-400">#{os.numero || os.id}</p>
                                </div>
                                <StatusBadge status={os.status} />
                            </button>
                        ))}
                    </div>
                )}

                {/* Ação rápida */}
                <button
                    onClick={() => navigate('/agenda')}
                    className="w-full mt-4 pt-4 border-t border-surface-100 flex items-center justify-center gap-2 text-sm text-surface-500 hover:text-brand-500 transition-colors"
                >
                    <Calendar className="w-4 h-4" />
                    Ver agenda
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Financeiro Pendente */}
            {financeiro?.valorPendente > 0 && (
                <div className="card p-4 sm:p-5 bg-orange-50 border-orange-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-orange-100">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-orange-800">Pagamentos Pendentes</p>
                                <p className="text-sm text-orange-600">
                                    {financeiro.pagamentosPendentes} pagamento{financeiro.pagamentosPendentes > 1 ? 's' : ''} aguardando
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-orange-800">
                                {formatCurrency(financeiro.valorPendente)}
                            </p>
                            <button
                                onClick={() => navigate('/empresario/financeiro')}
                                className="text-sm text-orange-700 font-medium hover:underline"
                            >
                                Ver detalhes →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FAB Mobile */}
            <FAB
                icon={<Plus className="w-6 h-6" />}
                label="Nova Solicitação"
                onClick={() => navigate('/nova-solicitacao')}
                className="lg:hidden"
            />
        </div>
    );
};
