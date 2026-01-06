import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Usuario } from '../../types';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatadores';
import { DashboardSkeleton } from '../../components/Skeleton';
import {
    TrendingUp, DollarSign, Building2, Users, CreditCard,
    Clock, CheckCircle, AlertTriangle, ChevronRight,
    Activity, RefreshCw, ShieldCheck, XCircle
} from 'lucide-react';

interface Props {
    user: Usuario;
}

export const DashboardSuperAdmin: React.FC<Props> = ({ user }) => {
    const navigate = useNavigate();

    const { data: metrics, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard-superadmin'],
        queryFn: async () => {
            const res = await api.get('/dashboard/super-admin');
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

    const { overview, usuarios, assinaturas, atividade } = metrics || {};

    // Card de estatística
    const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, subvalue, onClick }: any) => (
        <button
            onClick={onClick}
            className="card p-4 sm:p-5 text-left w-full hover:border-brand-200 transition-all"
        >
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${iconBg}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className="text-xs font-medium text-surface-500 uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold text-surface-800">{value}</p>
            {subvalue && <p className="text-xs text-surface-400 mt-1">{subvalue}</p>}
        </button>
    );

    return (
        <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-surface-800 flex items-center gap-2">
                        <ShieldCheck className="w-7 h-7 text-brand-500" />
                        Super Admin Dashboard
                    </h1>
                    <p className="text-surface-500 text-sm">
                        Visão geral da plataforma
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefetching}
                    className="btn btn-ghost p-2.5"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* KPIs Principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={DollarSign}
                    iconBg="bg-green-50"
                    iconColor="text-green-600"
                    label="MRR"
                    value={overview?.mrrFormatted || 'R$ 0,00'}
                    subvalue="Receita Mensal Recorrente"
                />
                <StatCard
                    icon={Building2}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                    label="Empresas Ativas"
                    value={overview?.empresasAtivas || 0}
                    subvalue={`${overview?.totalEmpresas || 0} total`}
                    onClick={() => navigate('/admin/empresas')}
                />
                <StatCard
                    icon={CreditCard}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                    label="Assinaturas Ativas"
                    value={overview?.assinaturasAtivas || 0}
                    subvalue="Gerando receita"
                    onClick={() => navigate('/admin/assinaturas')}
                />
                <StatCard
                    icon={Users}
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-600"
                    label="Total Usuários"
                    value={overview?.totalUsuarios || 0}
                    subvalue={`${usuarios?.porCargo?.prestador || 0} prestadores`}
                    onClick={() => navigate('/admin/usuarios')}
                />
            </div>

            {/* Segunda fileira - Status detalhado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                    onClick={() => navigate('/admin/empresas')}
                    className="card p-4 flex items-center gap-3 hover:border-orange-200 transition-all text-left"
                >
                    <div className="p-2 rounded-lg bg-orange-50">
                        <Clock className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-surface-800">{overview?.empresasPendentes || 0}</p>
                        <p className="text-xs text-surface-500">Empresas Pendentes</p>
                    </div>
                </button>
                <button
                    onClick={() => navigate('/admin/empresas')}
                    className="card p-4 flex items-center gap-3 hover:border-red-200 transition-all text-left"
                >
                    <div className="p-2 rounded-lg bg-red-50">
                        <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-surface-800">{overview?.empresasBloqueadas || 0}</p>
                        <p className="text-xs text-surface-500">Bloqueadas</p>
                    </div>
                </button>
                <button
                    onClick={() => navigate('/admin/solicitacoes')}
                    className="card p-4 flex items-center gap-3 hover:border-cyan-200 transition-all text-left"
                >
                    <div className="p-2 rounded-lg bg-cyan-50">
                        <Activity className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-surface-800">{atividade?.solicitacoesEsteMes || 0}</p>
                        <p className="text-xs text-surface-500">OS este mês</p>
                    </div>
                </button>
                <button
                    onClick={() => navigate('/admin/empresas')}
                    className="card p-4 flex items-center gap-3 hover:border-teal-200 transition-all text-left"
                >
                    <div className="p-2 rounded-lg bg-teal-50">
                        <TrendingUp className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-surface-800">+{atividade?.empresasNovasEsteMes || 0}</p>
                        <p className="text-xs text-surface-500">Novas este mês</p>
                    </div>
                </button>
            </div>

            {/* Grid de informações */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

                {/* Assinaturas por Status */}
                <div className="card p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-surface-800 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-brand-500" />
                            Assinaturas por Status
                        </h3>
                        <button
                            onClick={() => navigate('/admin/assinaturas')}
                            className="text-sm text-brand-500 font-medium hover:text-brand-600 flex items-center gap-1"
                        >
                            Gerenciar
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-brand-50 rounded-xl">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-brand-500" />
                                <span className="font-medium text-brand-600">Ativas</span>
                            </div>
                            <span className="text-xl font-bold text-brand-600">{assinaturas?.porStatus?.ativa || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-yellow-500" />
                                <span className="font-medium text-yellow-700">Pendentes</span>
                            </div>
                            <span className="text-xl font-bold text-yellow-700">{assinaturas?.porStatus?.pendente || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                            <div className="flex items-center gap-2">
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span className="font-medium text-red-700">Canceladas/Vencidas</span>
                            </div>
                            <span className="text-xl font-bold text-red-700">
                                {(assinaturas?.porStatus?.cancelada || 0) + (assinaturas?.porStatus?.vencida || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Atividade Recente */}
                <div className="card p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-surface-800">
                            Atividade Recente na Plataforma
                        </h3>
                    </div>

                    {!atividade?.solicitacoesRecentes?.length ? (
                        <div className="text-center py-8">
                            <Activity className="w-10 h-10 text-surface-300 mx-auto mb-2" />
                            <p className="text-surface-400 text-sm">Sem atividade recente</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {(atividade.solicitacoesRecentes || []).slice(0, 5).map((os: any) => (
                                <div key={os.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50">
                                    <div className="w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center text-xs font-bold text-surface-600">
                                        #{os.numero || '-'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-surface-700 truncate">{os.titulo}</p>
                                        <p className="text-xs text-surface-400">Empresa: {os.empresaNome || os.empresa_nome || 'N/D'}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${os.status === 'concluido' || os.status === 'faturado' ? 'bg-brand-50 text-brand-600' :
                                        os.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-surface-100 text-surface-600'
                                        }`}>
                                        {os.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
