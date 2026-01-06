import React from 'react';
import { ServiceHistoryItem, ServiceStatus } from '../types';
import {
  CheckCircle, Clock, FileText, User, Wrench, AlertTriangle,
  DollarSign, Archive, XCircle, Play, ThumbsUp, ThumbsDown, Trash2, CreditCard
} from 'lucide-react';

interface Props {
  history: ServiceHistoryItem[];
  currentStatus: ServiceStatus;
}

export const ServiceTimeline: React.FC<Props> = ({ history, currentStatus }) => {
  // Normalize history items to a common structure
  const normalizedHistory = history.map((item: any) => ({
    date: item.date || item.data || new Date().toISOString(),
    status: item.status || 'em_andamento', // Default status if missing
    action: item.action || item.descricao || 'Atualização',
    authorName: item.authorName || item.usuario || 'Sistema',
    note: item.note || (item.descricao && item.descricao.includes('[Diário de Obra]') ? item.descricao.replace('[Diário de Obra] ', '') : undefined)
  }));

  // Sort history by date descending (newest first)
  const sortedHistory = normalizedHistory.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (isNaN(dateA)) return 1;
    if (isNaN(dateB)) return -1;
    return dateB - dateA;
  });

  const steps = [
    { status: 'pendente', label: 'Pendente', icon: Clock, color: 'bg-gray-500' },
    { status: 'em_andamento', label: 'Em Andamento', icon: Play, color: 'bg-blue-600' },
    { status: 'orcamento', label: 'Orçamento', icon: DollarSign, color: 'bg-blue-500' },
    { status: 'aprovado', label: 'Aprovado', icon: ThumbsUp, color: 'bg-brand-500' },
    { status: 'agendado', label: 'Agendado', icon: User, color: 'bg-brand-500' },
    { status: 'concluido', label: 'Concluído', icon: CheckCircle, color: 'bg-brand-500' },
    { status: 'faturado', label: 'Faturado', icon: FileText, color: 'bg-brand-500' },
    { status: 'cancelado', label: 'Cancelado', icon: Trash2, color: 'bg-red-500' },
  ];

  const getStatusIndex = (status: ServiceStatus) => {
    return steps.findIndex(s => s.status === status);
  };

  const getIcon = (status: string) => {
    const step = steps.find(s => s.status === status);
    const Icon = step ? step.icon : CheckCircle;
    return <Icon className="h-5 w-5 text-white" />;
  };

  const getColor = (status: string) => {
    const step = steps.find(s => s.status === status);
    return step ? step.color : 'bg-gray-400';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Status Progress Bar */}
      <div className="relative">
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
          {steps.map((step, index) => {
            const currentIndex = getStatusIndex(currentStatus);
            const isActive = index <= currentIndex && currentIndex !== -1;
            return (
              <div
                key={step.status}
                style={{ width: `${100 / steps.length}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${isActive ? step.color : 'bg-gray-200'} transition-all duration-500`}
              ></div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-600 px-1">
          <span>Solicitado</span>
          <span className="font-bold text-brand-600">{steps.find(s => s.status === currentStatus)?.label || currentStatus}</span>
          <span>Concluído</span>
        </div>
      </div>

      {/* History List */}
      <div className="flow-root">
        <ul className="-mb-8">
          {sortedHistory.map((event, eventIdx) => (
            <li key={eventIdx}>
              <div className="relative pb-8">
                {eventIdx !== sortedHistory.length - 1 ? (
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getColor(event.status)}`}>
                      {getIcon(event.status)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{event.action}</span>
                        {event.authorName && event.authorName !== 'Sistema' && (
                          <span className="text-gray-500"> por {event.authorName}</span>
                        )}
                      </p>
                      {event.note && (
                        <p className="mt-1 text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 italic">
                          "{event.note}"
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                      <time dateTime={event.date}>{formatDate(event.date)}</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
