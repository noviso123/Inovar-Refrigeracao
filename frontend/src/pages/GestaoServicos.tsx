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
const OPEN_STATUSES: StatusOS[] = ['aberto', 'pendente', 'agendado', 'em_andamento', 'aprovado'];
const CLOSED_STATUSES: StatusOS[] = ['concluido', 'faturado', 'cancelado'];

type ViewTab = 'aberto' | 'finalizado';

export const ServiceManagement: React.FC<Props> = ({ user, requests: initialRequests, onViewDetails, onCreateNew }) => {
    const [activeTab, setActiveTab] = useState<ViewTab>('aberto');
    const [showFilters, setShowFilters] = useState(false);

    // React Query Implementation
    const { data: requests = [], isLoading: isRefreshing, refetch } = useQuery({
        queryKey: ['requests'],
        queryFn: solicitacaoService.listar,
        initialData: initialRequests,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterUrgency, setFilterUrgency] = useState<string>('');
    const [sortDate, setSortDate] = useState<'desc' | 'asc'>('desc');

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    const handleRefresh = async () => {
        await refetch();
    };

    // Apply Filters (with defensive check)
    const safeRequests = Array.isArray(requests) ? requests : [];
    const filteredList = safeRequests.filter(req => {
        const statusList = activeTab === 'aberto' ? OPEN_STATUSES : CLOSED_STATUSES;
        if (!statusList.includes(req.status as StatusOS)) return false;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const numero = req.numero?.toString() || '';
            const codigoOs = req.codigoOs || req.codigo_os || '';
            const matchesNumber = numero.includes(term) || codigoOs.toLowerCase().includes(term);
            const matchesId = req.id.toString().includes(term);
            const matchesClient = req.clientes?.nome?.toLowerCase().includes(term);
            const matchesTech = req.tecnicos?.nome_completo?.toLowerCase().includes(term);
            const matchesTitle = req.titulo?.toLowerCase().includes(term);

            if (!matchesNumber && !matchesId && !matchesClient && !matchesTech && !matchesTitle) return false;
        }

        if (filterStatus && req.status !== filterStatus) return false;
        if (filterUrgency && req.prioridade !== filterUrgency) return false;

        return true;
    }).sort((a, b) => {
        const getTime = (date: any): number => {
            if (!date) return 0;
            if (date?._seconds) return date._seconds * 1000;
            if (date?.toDate) return date.toDate().getTime();
            return new Date(date).getTime() || 0;
        };
        const dateA = getTime(a.criadoEm || a.criado_em);
        const dateB = getTime(b.criadoEm || b.criado_em);
        return sortDate === 'desc' ? dateB - dateA : dateA - dateB;
    });

    const openCount = safeRequests.filter(r => OPEN_STATUSES.includes(r.status as StatusOS)).length;
    const closedCount = safeRequests.filter(r => CLOSED_STATUSES.includes(r.status as StatusOS)).length;

    return (
        <div className="space-y-4 pb-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-surface-800 flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-brand-500" />
                        Gestão de Serviços
                    </h1>
                    <p className="text-sm text-surface-500 mt-0.5 hidden sm:block">
                        Visualize e gerencie todos os chamados
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="btn btn-ghost p-2.5"
                    >
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

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-surface-100 rounded-xl">
                <button
                    onClick={() => { setActiveTab('aberto'); setFilterStatus(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === 'aberto'
                        ? 'bg-white text-brand-600 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700'
                        }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>Em Aberto</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'aberto'
                        ? 'bg-brand-100 text-brand-600'
                        : 'bg-surface-200 text-surface-500'
                        }`}>
                        {openCount}
                    </span>
                </button>
                <button
                    onClick={() => { setActiveTab('finalizado'); setFilterStatus(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === 'finalizado'
                        ? 'bg-white text-brand-500 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700'
                        }`}
                >
                    <CheckCircle className="w-4 h-4" />
                    <span>Finalizados</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'finalizado'
                        ? 'bg-brand-50 text-brand-500'
                        : 'bg-surface-200 text-surface-500'
                        }`}>
                        {closedCount}
                    </span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="card p-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                        <input
                            type="text"
                            placeholder="Buscar por Nº, título, cliente..."
                            className="input pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} px-3`}
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                </div>

                {/* Filtros expandidos */}
                {showFilters && (
                    <div className="mt-3 pt-3 border-t border-surface-100 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in">
                        <select
                            className="input text-sm"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">Status: Todos</option>
                            {STATUS_OPTIONS.map(status => (
                                <option key={status} value={status}>{status.toUpperCase()}</option>
                            ))}
                        </select>

                        <select
                            className="input text-sm"
                            value={filterUrgency}
                            onChange={(e) => setFilterUrgency(e.target.value)}
                        >
                            <option value="">Urgência: Todas</option>
                            {URGENCY_OPTIONS.map(level => (
                                <option key={level} value={level}>{level.toUpperCase()}</option>
                            ))}
                        </select>

                        <div className="flex gap-1 col-span-2 sm:col-span-2">
                            <button
                                onClick={() => setSortDate('desc')}
                                className={`flex-1 btn text-xs ${sortDate === 'desc' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                <ArrowDown className="w-3 h-3" /> Recentes
                            </button>
                            <button
                                onClick={() => setSortDate('asc')}
                                className={`flex-1 btn text-xs ${sortDate === 'asc' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                <ArrowUp className="w-3 h-3" /> Antigos
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results count */}
            <p className="text-sm text-surface-500 px-1">
                Exibindo <strong>{filteredList.length}</strong> chamados
            </p>

            {/* List */}
            <div className="space-y-3">
                {filteredList.length === 0 ? (
                    <div className="card p-12 text-center">
                        <Settings className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                        <p className="text-lg font-medium text-surface-600">Nenhum serviço encontrado</p>
                        <p className="text-sm text-surface-400 mt-1">Tente ajustar os filtros</p>
                    </div>
                ) : (
                    filteredList.map(req => (
                        <div
                            key={req.id}
                            onClick={() => onViewDetails(req.numero || req.id)}
                            className="card card-interactive p-4 hover:border-brand-200 transition-all"
                        >
                            <div className="flex items-start gap-3">
                                {/* Indicator */}
                                <div className={`w-1 h-full min-h-[60px] rounded-full flex-shrink-0 ${req.prioridade === 'critica' ? 'bg-red-500' :
                                    req.prioridade === 'alta' ? 'bg-orange-500' :
                                        'bg-brand-500'
                                    }`} />

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-xs font-bold bg-surface-800 text-white px-2 py-0.5 rounded">
                                                    #{req.sequential_id || req.numero || req.codigoOs || req.codigo_os || req.id}
                                                </span>
                                                <StatusBadge status={req.status} />
                                            </div>
                                            <h3 className="text-base font-semibold text-surface-800 mt-1 truncate">
                                                {req.titulo}
                                            </h3>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-surface-400 flex-shrink-0" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                                        <div className="flex items-center text-surface-600">
                                            <UserIcon className="w-4 h-4 mr-2 text-surface-400" />
                                            <span className="truncate">{req.clientes?.nome || 'Cliente não definido'}</span>
                                        </div>
                                        <div className="flex items-center text-surface-600">
                                            <UserIcon className="w-4 h-4 mr-2 text-surface-400" />
                                            <span className="truncate">
                                                {req.tecnicos?.nome_completo || req.tecnicoNome || 'Sem técnico'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-100">
                                        <div className="flex items-center text-xs text-surface-400">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {formatarData(req.criadoEm || req.criado_em, { comHora: false, fallback: 'N/D' })}
                                        </div>
                                        {(req.prioridade === 'alta' || req.prioridade === 'critica') && (
                                            <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded">
                                                {req.prioridade.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* FAB Mobile */}
            {onCreateNew && (
                <FAB
                    icon={<Plus className="w-6 h-6" />}
                    label="Nova OS"
                    onClick={onCreateNew}
                    className="lg:hidden"
                />
            )}
        </div>
    );
};

export default ServiceManagement;
