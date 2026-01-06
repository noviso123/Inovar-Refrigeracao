import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { solicitacaoService } from '../services/solicitacaoService';
import { SolicitacaoServico, Usuario, StatusOS, PrioridadeOS } from '../types';
import { StatusBadge } from '../components/EmblemaStatus';
import { formatarData } from '../utils/formatadores';
import {
    Calendar, Search, ChevronRight, ArrowUp, ArrowDown,
    Settings, User as UserIcon, MapPin, Briefcase, Plus,
    Clock, CheckCircle, RefreshCw, Filter, X
} from 'lucide-react';
import { FAB } from '../components/Botao';

interface Props {
    user: Usuario;
    requests: SolicitacaoServico[];
    onViewDetails: (requestId: number | string) => void;
    onCreateNew?: () => void;
    onRefresh?: () => Promise<SolicitacaoServico[]>;
}

const STATUS_OPTIONS: StatusOS[] = ['pendente', 'agendado', 'em_andamento', 'concluido', 'cancelado', 'aprovado', 'faturado'];
const URGENCY_OPTIONS: PrioridadeOS[] = ['baixa', 'media', 'alta', 'critica'];
const OPEN_STATUSES: StatusOS[] = ['pendente', 'agendado', 'em_andamento', 'aprovado'];
const CLOSED_STATUSES: StatusOS[] = ['concluido', 'faturado', 'cancelado'];

type ViewTab = 'aberto' | 'finalizado';

export const ServiceManagement: React.FC<Props> = ({ user, requests: initialRequests, onViewDetails, onCreateNew }) => {
    const [activeTab, setActiveTab] = useState<ViewTab>('aberto');
    const [showFilters, setShowFilters] = useState(false);

    const { data: requests = [], isLoading: isRefreshing, refetch } = useQuery({
        queryKey: ['requests'],
        queryFn: solicitacaoService.listar,
        initialData: initialRequests,
        staleTime: 1000 * 60 * 2,
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterUrgency, setFilterUrgency] = useState<string>('');
    const [sortDate, setSortDate] = useState<'desc' | 'asc'>('desc');

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    const handleRefresh = async () => {
        await refetch();
    };

    const safeRequests = Array.isArray(requests) ? requests : [];
    const filteredList = safeRequests.filter(req => {
        const isClosed = CLOSED_STATUSES.includes(req.status as StatusOS);
        const matchesTab = activeTab === 'aberto' ? !isClosed : isClosed;
        if (!matchesTab) return false;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const sid = req.sequential_id?.toString() || '';
            const titulo = req.titulo?.toLowerCase() || '';
            if (!sid.includes(term) && !titulo.includes(term)) return false;
        }

        if (filterStatus && req.status !== filterStatus) return false;
        if (filterUrgency && req.priority !== filterUrgency) return false;

        return true;
    }).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortDate === 'desc' ? dateB - dateA : dateA - dateB;
    });

    const openCount = safeRequests.filter(r => !CLOSED_STATUSES.includes(r.status as StatusOS)).length;
    const closedCount = safeRequests.filter(r => CLOSED_STATUSES.includes(r.status as StatusOS)).length;

    return (
        <div className="space-y-4 pb-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-800 flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-brand-500" />
                        Gestão de Serviços
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRefresh} disabled={isRefreshing} className="btn btn-ghost p-2.5">
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    {onCreateNew && (
                        <button onClick={onCreateNew} className="btn btn-primary hidden sm:flex">
                            <Plus className="w-5 h-5" />
                            <span>Nova OS</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-2 p-1 bg-surface-100 rounded-xl">
                <button onClick={() => setActiveTab('aberto')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === 'aberto' ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-500'}`}>
                    <Clock className="w-4 h-4" />
                    <span>Em Aberto</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-surface-200">{openCount}</span>
                </button>
                <button onClick={() => setActiveTab('finalizado')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === 'finalizado' ? 'bg-white text-brand-500 shadow-sm' : 'text-surface-500'}`}>
                    <CheckCircle className="w-4 h-4" />
                    <span>Finalizados</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-surface-200">{closedCount}</span>
                </button>
            </div>

            <div className="card p-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                        <input type="text" placeholder="Buscar por Nº ou título..." className="input pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} px-3`}>
                        <Filter className="w-5 h-5" />
                    </button>
                </div>

                {showFilters && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-2">
                        <select className="input text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">Status: Todos</option>
                            {STATUS_OPTIONS.map(status => (
                                <option key={status} value={status}>{status.toUpperCase()}</option>
                            ))}
                        </select>
                        <select className="input text-sm" value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)}>
                            <option value="">Urgência: Todas</option>
                            {URGENCY_OPTIONS.map(level => (
                                <option key={level} value={level}>{level.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {filteredList.length === 0 ? (
                    <div className="card p-12 text-center text-surface-400 italic">
                        Nenhum serviço encontrado.
                    </div>
                ) : (
                    filteredList.map(req => (
                        <div key={req.id} onClick={() => onViewDetails(req.id)} className="card card-interactive p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold bg-surface-800 text-white px-2 py-0.5 rounded">
                                        #{req.sequential_id}
                                    </span>
                                    <StatusBadge status={req.status} />
                                </div>
                                <ChevronRight className="w-5 h-5 text-surface-300" />
                            </div>
                            <h3 className="text-base font-semibold text-surface-800 truncate">{req.titulo}</h3>
                            <div className="flex items-center gap-4 mt-1 text-xs text-surface-500">
                                <span className="font-medium text-surface-700">{req.cliente?.nome}</span>
                                {req.local?.city && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {req.local.city}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center mt-3 pt-2 border-t text-xs text-surface-400">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatarData(req.created_at, { comHora: false })}
                                <span className="mx-2">•</span>
                                <span className={`font-medium ${req.priority === 'critica' ? 'text-red-500' : 'text-brand-500'}`}>
                                    {req.priority.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {onCreateNew && (
                <FAB icon={<Plus className="w-6 h-6" />} label="Nova OS" onClick={onCreateNew} className="lg:hidden" />
            )}
        </div>
    );
};

export default ServiceManagement;
