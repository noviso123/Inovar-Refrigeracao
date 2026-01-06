/**
 * DashboardTecnico - Dashboard específico para técnicos
 * Mostra apenas ordens de serviço atribuídas ao técnico logado
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Usuario } from '../../types';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/EmblemaStatus';
import { DashboardSkeleton } from '../../components/Skeleton';
import {
    Briefcase, Clock, CheckCircle, Calendar,
    ChevronRight, RefreshCw, Activity, Wrench
} from 'lucide-react';

interface Props {
    user: Usuario;
}

export const DashboardTecnico: React.FC<Props> = ({ user }) => {
    const navigate = useNavigate();

    const { data: metrics, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard-tecnico'],
        queryFn: async () => {
            const res = await api.get('/dashboard/tecnico');
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const handleRefresh = () => {
        refetch();
    };

    if (isLoading && !metrics) {
        return <DashboardSkeleton />;
    }

    const { overview, osPorStatus, osRecentes } = metrics || {};

    // Card de estatística
    const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, subvalue, onClick }: any) => (
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
            {subvalue && <p className="text-xs text-surface-400 mt-1">{subvalue}</p>}
        </button>
    );

    return (
        <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-surface-800">
                        Olá, {user.nome_completo?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-surface-500 text-sm">
                        Suas ordens de serviço
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
                </div>
            </div>

            {/* KPIs Principais - 2 colunas mobile, 4 desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    icon={Wrench}
                    iconBg="bg-brand-50"
                    iconColor="text-brand-600"
                    label="Minhas OS"
                    value={overview?.minhasOS || 0}
                    subvalue="Total atribuídas"
                    onClick={() => navigate('/minhas-ordens')}
                />
                <StatCard
                    icon={Calendar}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                    label="Este Mês"
                    value={overview?.osEsteMes || 0}
                    subvalue="Ordens criadas"
                />
                <StatCard
                    icon={Clock}
                    iconBg="bg-orange-50"
                    iconColor="text-orange-600"
                    label="Em Aberto"
                    value={overview?.osEmAberto || 0}
                    subvalue="Aguardando ação"
                    onClick={() => navigate('/minhas-ordens')}
                />
                <StatCard
                    icon={CheckCircle}
                    iconBg="bg-green-50"
                    iconColor="text-green-600"
                    label="Concluídas"
                    value={overview?.osConcluidas || 0}
                    subvalue="Finalizadas"
                />
            </div>

            {/* Status das OS - Visual */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <div className="card p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{osPorStatus?.aberto || 0}</p>
                    <p className="text-xs text-surface-500 mt-1">Abertas</p>
                </div>
                <div className="card p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{osPorStatus?.agendado || 0}</p>
                    <p className="text-xs text-surface-500 mt-1">Agendadas</p>
                </div>
                <div className="card p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{osPorStatus?.em_andamento || 0}</p>
                    <p className="text-xs text-surface-500 mt-1">Em Andamento</p>
                </div>
                <div className="card p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{osPorStatus?.concluido || 0}</p>
                    <p className="text-xs text-surface-500 mt-1">Concluídas</p>
                </div>
            </div>

            {/* OS Recentes */}
            <div className="card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-surface-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-500" />
                        Minhas OS Recentes
                    </h3>
                    <button
                        onClick={() => navigate('/minhas-ordens')}
                        className="text-sm text-brand-500 font-medium hover:text-brand-600 flex items-center gap-1"
                    >
                        Ver tudo
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {!osRecentes?.length ? (
                    <div className="text-center py-8">
                        <Briefcase className="w-10 h-10 text-surface-300 mx-auto mb-2" />
                        <p className="text-surface-400 text-sm">Nenhuma OS atribuída a você</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {osRecentes.map((os: any) => (
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
                                    <p className="text-xs text-surface-400">
                                        #{os.numero || os.id} • {os.clienteNome}
                                    </p>
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
        </div>
    );
};
