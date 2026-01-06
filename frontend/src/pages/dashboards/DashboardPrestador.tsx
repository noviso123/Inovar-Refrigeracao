import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Usuario } from '../../types';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatadores';
import { StatusBadge } from '../../components/EmblemaStatus';
import { FAB } from '../../components/Botao';
import { DashboardSkeleton } from '../../components/Skeleton';
import {
    Wallet, Clock, CheckCircle, Users, Briefcase,
    Plus, ChevronRight, Calendar, Activity, RefreshCw
} from 'lucide-react';

interface Props {
    user: Usuario;
}

export const DashboardPrestador: React.FC<Props> = ({ user }) => {
    const navigate = useNavigate();

    const { data: metrics, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard-prestador'],
        queryFn: async () => {
            const res = await api.get('/dashboard');
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
    });

    if (isLoading && !metrics) return <DashboardSkeleton />;

    const { stats, recent_orders } = metrics || {};

    const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, onClick }: any) => (
        <button onClick={onClick} className="card p-4 text-left w-full hover:border-brand-200 transition-all">
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl ${iconBg}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className="text-xs font-medium text-surface-500 uppercase">{label}</span>
            </div>
            <p className="text-2xl font-bold text-surface-800">{value}</p>
        </button>
    );

    return (
        <div className="space-y-4 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Olá, {user.nome_completo?.split(' ')[0]} 👋</h1>
                    <p className="text-surface-500 text-sm">Resumo da operação</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => refetch()} disabled={isRefetching} className="btn btn-ghost p-2.5">
                        <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => navigate('/nova-solicitacao')} className="btn btn-primary hidden sm:flex">
                        <Plus className="w-5 h-5" /> Nova OS
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Briefcase} iconBg="bg-blue-50" iconColor="text-blue-600" label="Serviços" value={stats?.total_orders || 0} onClick={() => navigate('/solicitacoes')} />
                <StatCard icon={Clock} iconBg="bg-orange-50" iconColor="text-orange-600" label="Em Aberto" value={stats?.open_orders || 0} onClick={() => navigate('/solicitacoes')} />
                <StatCard icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" label="Concluídos" value={stats?.completed_orders || 0} />
                <StatCard icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600" label="Clientes" value={stats?.total_clients || 0} onClick={() => navigate('/clientes')} />
            </div>

            <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-500" /> Atividade Recente
                    </h3>
                    <button onClick={() => navigate('/solicitacoes')} className="text-sm text-brand-500 hover:underline">Ver tudo</button>
                </div>
                {!recent_orders?.length ? (
                    <p className="text-center py-10 text-surface-400">Nenhum serviço recente.</p>
                ) : (
                    <div className="space-y-2">
                        {recent_orders.map((os: any) => (
                            <button key={os.id} onClick={() => navigate(`/solicitacao/${os.id}`)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors text-left group">
                                <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center group-hover:bg-white transition-all">
                                    <Briefcase className="w-5 h-5 text-surface-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium truncate">{os.titulo}</p>
                                    <p className="text-xs text-surface-400 font-mono">#{os.sequential_id}</p>
                                </div>
                                <StatusBadge status={os.status} />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <FAB icon={<Plus className="w-6 h-6" />} label="Nova OS" onClick={() => navigate('/nova-solicitacao')} className="lg:hidden" />
        </div>
    );
};
