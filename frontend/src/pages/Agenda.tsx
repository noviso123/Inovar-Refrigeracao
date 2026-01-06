import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { solicitacaoService } from '../services/solicitacaoService';
import { SolicitacaoServico, StatusOS, Usuario, CargoUsuario } from '../types';
import { Calendar as CalendarIcon, MapPin, User as UserIcon, Clock, ExternalLink, RefreshCw, CheckCircle, AlertTriangle, CalendarCheck, ChevronRight, Phone, Wrench } from 'lucide-react';
import { StatusBadge } from '../components/EmblemaStatus';
import { formatAddress, generateGoogleCalendarLink } from '../utils/formatadores';
import { Button } from '../components/Botao';
import { useNotification } from '../contexts/ContextoNotificacao';

import { API_URL } from '../services/api';

// Helper function to safely parse dates
const safeParseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (dateValue?._seconds) {
        return new Date(dateValue._seconds * 1000);
    }
    if (typeof dateValue?.toDate === 'function') {
        return dateValue.toDate();
    }
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const formatTime = (dateValue: any): string => {
    const date = safeParseDate(dateValue);
    if (!date) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateString = (dateValue: any): string => {
    const date = safeParseDate(dateValue);
    if (!date) return 'Data inválida';
    return date.toLocaleDateString('pt-BR');
};

const formatDateFull = (dateValue: any): string => {
    const date = safeParseDate(dateValue);
    if (!date) return 'Data inválida';
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${weekdays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
};

const isToday = (dateValue: any): boolean => {
    const date = safeParseDate(dateValue);
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

const isTomorrow = (dateValue: any): boolean => {
    const date = safeParseDate(dateValue);
    if (!date) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
};



interface Props {
    user: Usuario;
    requests?: SolicitacaoServico[];
    onViewDetails: (id: number | string) => void;
    onUpdate: (id: number | string, updates: Partial<SolicitacaoServico>) => void;
}

export const Schedule: React.FC<Props> = ({ user, requests: initialRequests, onViewDetails, onUpdate }) => {
    const { notify } = useNotification();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // React Query Implementation
    const { data: requests = [] } = useQuery({
        queryKey: ['requests'],
        queryFn: solicitacaoService.listar,
        initialData: initialRequests,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Scroll to top on mount
    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // DEFENSIVE: Ensure requests is an array
    const safeRequests = Array.isArray(requests) ? requests : [];

    const scheduledRequests = safeRequests
        .filter(req => {
            const date = safeParseDate(req.data_agendamento_inicio);
            if (!date) return false;

            // Filter out completed/finalized statuses
            const hiddenStatuses = ['concluido', 'faturado', 'cancelado', 'orcamento'];
            if (hiddenStatuses.includes(req.status)) return false;

            // Filter out past dates (keep today and future)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) return false;

            return true;
        })
        .sort((a, b) => {
            const dateA = safeParseDate(a.data_agendamento_inicio);
            const dateB = safeParseDate(b.data_agendamento_inicio);
            if (!dateA || !dateB) return 0;
            return dateA.getTime() - dateB.getTime();
        });

    const mySchedule = scheduledRequests;

    const syncToGoogle = async (manual = false) => {
        if (!user.google_email) {
            if (manual) notify('Sua conta não está vinculada ao Google. Clique no botão "Vincular" abaixo.', 'warning');
            return;
        }

        const requestsToSync = manual
            ? mySchedule.filter(req => req.data_agendamento_inicio)
            : mySchedule.filter(req => !req.google_calendar_event_id && req.data_agendamento_inicio);

        if (requestsToSync.length === 0) {
            if (manual) notify('Nenhum agendamento encontrado para sincronizar.', 'info');
            return;
        }

        setIsSyncing(true);
        const token = localStorage.getItem('token');

        const eventsToSync = requestsToSync.map(req => ({
            requestId: req.id, // Explicitly pass requestId for backend search
            googleEventId: req.google_calendar_event_id,
            summary: `Visita Técnica #${req.numero || req.codigo_os || req.id} - ${req.titulo}`,
            description: `Cliente: ${req.clientes?.nome}\nServiço: ${req.descricao_detalhada}\nEndereço: ${req.clientes?.endereco || 'N/A'}\nContato: ${user.telefone || 'N/A'}`,
            start: { dateTime: new Date(req.data_agendamento_inicio!).toISOString() },
            end: { dateTime: new Date(new Date(req.data_agendamento_inicio!).getTime() + 3600000).toISOString() },
            location: req.clientes?.endereco || 'Endereço não informado',
            extendedProperties: {
                private: {
                    requestId: req.id,
                    ticketId: req.numero || req.codigo_os || req.id
                }
            }
        }));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const res = await fetch(`${API_URL}/calendar/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ events: eventsToSync }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await res.json();

            if (data.success) {
                setLastSync(new Date());
                if (manual) notify(data.message, 'success');

                if (data.syncedEvents && Array.isArray(data.syncedEvents)) {
                    data.syncedEvents.forEach((syncedEvent: any) => {
                        if (syncedEvent.requestId) {
                            onUpdate(syncedEvent.requestId, {
                                google_calendar_event_id: syncedEvent.googleEventId
                            });
                        }
                    });
                }
            } else {
                if (manual) notify('Erro: ' + data.error, 'error');
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                if (manual) notify('A sincronização demorou muito e foi cancelada.', 'error');
            } else {
                if (manual) notify('Erro de conexão: ' + err.message, 'error');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    React.useEffect(() => {
        if (user.google_email) {
            syncToGoogle(false);
        }
    }, [user.google_email, JSON.stringify(mySchedule)]);

    const groupRequestsByDate = () => {
        const groups: Record<string, SolicitacaoServico[]> = {};
        mySchedule.forEach(req => {
            const date = safeParseDate(req.data_agendamento_inicio);
            if (!date) return;
            const dateStr = formatDateString(req.data_agendamento_inicio);
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(req);
        });
        return groups;
    };

    const scheduleGroups = groupRequestsByDate();
    const sortedDates = Object.keys(scheduleGroups).sort((a, b) => {
        const [da, ma, ya] = a.split('/').map(Number);
        const [db, mb, yb] = b.split('/').map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });

    const handleSyncGoogle = () => {
        syncToGoogle(true);
    };

    const getDayLabel = (dateStr: string): string => {
        const [d, m, y] = dateStr.split('/').map(Number);
        const date = new Date(y, m - 1, d);
        if (isToday(date)) return 'Hoje';
        if (isTomorrow(date)) return 'Amanhã';
        return formatDateFull(date);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Mobile-First */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white px-4 py-5 md:px-6 md:py-6">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <CalendarIcon className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold">Agenda</h1>
                                <p className="text-xs md:text-sm text-white/80">
                                    {mySchedule.length} visita{mySchedule.length !== 1 ? 's' : ''} agendada{mySchedule.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSyncGoogle}
                            disabled={isSyncing}
                            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition active:scale-95"
                        >
                            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Status de Sincronização */}
                    {lastSync && (
                        <div className="mt-3 flex items-center text-xs text-white/70">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Sincronizado às {lastSync.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Google Connection Status - Compact Mobile */}
            <div className="px-4 py-3 md:px-6">
                <div className={`max-w-5xl mx-auto p-3 md:p-4 rounded-xl border ${user.google_email ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {user.google_email ? (
                                <>
                                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                                    <span className="text-xs md:text-sm text-green-800 truncate">
                                        <span className="hidden sm:inline">Conectado: </span>
                                        {user.google_email}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-amber-600 flex-shrink-0" />
                                    <span className="text-xs md:text-sm text-amber-800">
                                        Sincronização desativada
                                    </span>
                                </>
                            )}
                        </div>

                        {user.google_email ? (
                            <button
                                className="text-xs text-red-600 hover:text-red-800 font-medium flex-shrink-0"
                                onClick={() => {
                                    if (!confirm('Deseja desconectar sua conta Google?')) return;
                                    const token = localStorage.getItem('token');
                                    fetch(`${API_URL}/auth/google/unlink`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    })
                                        .then(res => res.json())
                                        .then(data => {
                                            if (data.success) {
                                                if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                                                window.location.reload();
                                            } else {
                                                alert(data.error);
                                            }
                                        });
                                }}
                            >
                                Desconectar
                            </button>
                        ) : (
                            <button
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition flex-shrink-0"
                                onClick={() => {
                                    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                                    if (!clientId) {
                                        notify('Google Client ID não configurado.', 'error');
                                        return;
                                    }

                                    const script = document.createElement('script');
                                    script.src = 'https://accounts.google.com/gsi/client';
                                    script.async = true;
                                    script.defer = true;

                                    script.onload = () => {
                                        // @ts-ignore
                                        const client = google.accounts.oauth2.initCodeClient({
                                            client_id: clientId,
                                            scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
                                            ux_mode: 'popup',
                                            callback: async (response: any) => {
                                                if (response.code) {
                                                    try {
                                                        const token = localStorage.getItem('token');
                                                        const res = await fetch(`${API_URL}/auth/google/link`, {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                                'Authorization': `Bearer ${token}`
                                                            },
                                                            body: JSON.stringify({ code: response.code, type: 'auth_code' })
                                                        });
                                                        const data = await res.json();

                                                        if (data.success) {
                                                            notify('Conta Google vinculada com sucesso!', 'success');
                                                            if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                                                            window.location.reload();
                                                        } else {
                                                            notify(data.error || 'Erro ao vincular conta', 'error');
                                                        }
                                                    } catch (err: any) {
                                                        console.error('Erro ao vincular Google:', err);
                                                        notify('Erro ao vincular conta: ' + err.message, 'error');
                                                    }
                                                }
                                            },
                                        });
                                        client.requestCode();
                                    };

                                    script.onerror = () => {
                                        notify('Erro ao carregar Google Identity Services', 'error');
                                    };

                                    document.body.appendChild(script);
                                }}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Vincular
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Lista de Agendamentos */}
            <div className="px-4 pb-24 md:px-6">
                <div className="max-w-5xl mx-auto">
                    {sortedDates.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                <CalendarIcon className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700">Nenhum agendamento</h3>
                            <p className="text-sm text-gray-500 mt-1">Não há visitas agendadas</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sortedDates.map(date => {
                                const firstReq = scheduleGroups[date][0];
                                const dateIsToday = isToday(safeParseDate(firstReq.data_agendamento_inicio));

                                return (
                                    <div key={date}>
                                        {/* Date Header */}
                                        <div className={`sticky top-0 z-10 py-2 -mx-4 px-4 md:-mx-6 md:px-6 ${dateIsToday ? 'bg-brand-50' : 'bg-gray-50'}`}>
                                            <h3 className={`text-sm font-bold uppercase tracking-wide ${dateIsToday ? 'text-brand-700' : 'text-gray-600'}`}>
                                                {getDayLabel(date)}
                                                {dateIsToday && (
                                                    <span className="ml-2 text-[10px] bg-brand-600 text-white px-2 py-0.5 rounded-full font-medium normal-case">
                                                        Hoje
                                                    </span>
                                                )}
                                            </h3>
                                        </div>

                                        {/* Cards */}
                                        <div className="space-y-3 mt-2">
                                            {scheduleGroups[date].map(req => {
                                                const isSynced = !!req.google_calendar_event_id;
                                                const googleUrl = generateGoogleCalendarLink(
                                                    `Visita Técnica #${req.numero || req.codigo_os || req.id} - ${req.titulo}`,
                                                    `Cliente: ${req.clientes?.nome}\nServiço: ${req.descricao_detalhada}\nContato: ${user.telefone || 'N/A'}`,
                                                    req.data_agendamento_inicio!,
                                                    req.clientes?.endereco || ''
                                                );

                                                return (
                                                    <div
                                                        key={req.id}
                                                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden active:bg-gray-50 transition"
                                                        onClick={() => onViewDetails(req.numero || req.id)}
                                                    >
                                                        {/* Card Header */}
                                                        <div className="flex items-stretch">
                                                            {/* Time Block */}
                                                            <div className="w-20 md:w-24 bg-gradient-to-b from-brand-500 to-brand-600 flex flex-col items-center justify-center py-4 text-white">
                                                                <Clock className="w-4 h-4 mb-1 opacity-80" />
                                                                <span className="text-lg md:text-xl font-bold">
                                                                    {formatTime(req.data_agendamento_inicio)}
                                                                </span>
                                                                {isSynced && (
                                                                    <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded mt-1 flex items-center">
                                                                        <CalendarCheck className="w-2.5 h-2.5 mr-0.5" />
                                                                        Google
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-1 p-3 md:p-4 min-w-0">
                                                                {/* Title Row */}
                                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-[10px] md:text-xs font-medium text-gray-400">
                                                                                #{req.numero || req.codigo_os || String(req.id).slice(-6)}
                                                                            </span>
                                                                            <StatusBadge status={req.status} />
                                                                        </div>
                                                                        <h4 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                                                                            {req.titulo}
                                                                        </h4>
                                                                    </div>
                                                                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                                </div>

                                                                {/* Info Grid - Mobile Optimized */}
                                                                <div className="space-y-1.5">
                                                                    <div className="flex items-center text-xs md:text-sm text-gray-600">
                                                                        <UserIcon className="w-3.5 h-3.5 mr-2 text-gray-400 flex-shrink-0" />
                                                                        <span className="truncate">{req.clientes?.nome || 'Cliente'}</span>
                                                                    </div>
                                                                    <div className="flex items-start text-xs md:text-sm text-gray-600">
                                                                        <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                                                                        <span className="line-clamp-2">{formatAddress(req.clientes?.endereco)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Action Bar */}
                                                        <div className="flex items-center border-t border-gray-100 divide-x divide-gray-100">
                                                            <a
                                                                href={googleUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                                <span className="hidden xs:inline">Google Calendar</span>
                                                                <span className="xs:hidden">Agenda</span>
                                                            </a>
                                                            {req.clientes?.telefone && (
                                                                <a
                                                                    href={`tel:${req.clientes.telefone.replace(/\D/g, '')}`}
                                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-green-600 hover:bg-green-50 active:bg-green-100 transition"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Phone className="w-3.5 h-3.5" />
                                                                    Ligar
                                                                </a>
                                                            )}
                                                            <button
                                                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onViewDetails(req.numero || req.id);
                                                                }}
                                                            >
                                                                <Wrench className="w-3.5 h-3.5" />
                                                                Detalhes
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
