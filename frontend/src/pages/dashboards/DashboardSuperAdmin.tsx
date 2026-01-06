import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Usuario } from '../../types';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { DashboardSkeleton } from '../../components/Skeleton';
import {
    Users, Briefcase, Clock, CheckCircle,
    Activity, RefreshCw, ShieldCheck, Database
} from 'lucide-react';

interface Props {
    user: Usuario;
}

export const DashboardSuperAdmin: React.FC<Props> = ({ user }) => {
    const navigate = useNavigate();

    const { data: metrics, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard-admin'],
        queryFn: async () => {
            const res = await api.get('/dashboard');
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
    });

    if (isLoading && !metrics) return <DashboardSkeleton />;

    const { stats, recent_orders } = metrics || {};

    const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, onClick }: any) => (
        <button onClick={onClick} className="card p-5 text-left w-full hover:border-brand-200 transition-all">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${iconBg}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className="text-xs font-medium text-surface-500 uppercase">
                    {label}
                </span>
            </div>
            <p className="text-2xl font-bold text-surface-800">{value}</p>
        </button>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShieldCheck className="w-7 h-7 text-brand-500" />
                        Visão Geral do Sistema
                    </h1>
                </div>
                <button onClick={() => refetch()} disabled={isRefetching} className="btn btn-ghost p-2.5">
                    <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Briefcase} iconBg="bg-blue-50" iconColor="text-blue-600" label="Total de OS" value={stats?.total_orders || 0} onClick={() => navigate('/solicitacoes')} />
                <StatCard icon={Users} iconBg="bg-indigo-50" iconColor="text-indigo-600" label="Usuários" value={stats?.total_users || 0} onClick={() => navigate('/usuarios')} />
                <StatCard icon={Database} iconBg="bg-purple-50" iconColor="text-purple-600" label="Clientes" value={stats?.total_clients || 0} onClick={() => navigate('/clientes')} />
                <StatCard icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" label="Concluídas" value={stats?.completed_orders || 0} />
            </div>

            <div className="card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-brand-500" /> Atividade Recente da Plataforma
                </h3>
                {!recent_orders?.length ? (
                    <div className="text-center py-10">
                        <p className="text-surface-400">Nenhuma atividade registrada.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recent_orders.map((os: any) => (
                            <div key={os.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface-50">
                                <span className="font-mono text-xs font-bold bg-surface-200 px-2 py-1 rounded">#{os.sequential_id}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{os.titulo}</p>
                                    <p className="text-xs text-surface-400">Status: {os.status.toUpperCase()}</p>
                                </div>
                                <button onClick={() => navigate(`/solicitacao/${os.id}`)} className="btn btn-ghost p-1">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
