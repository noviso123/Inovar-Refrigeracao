import React from 'react';
import { ServiceStatus } from '../types';

interface Props {
  status: ServiceStatus;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const getStatusStyles = (status: ServiceStatus) => {
    switch (status) {
      case 'pendente':
        return 'bg-gray-100 text-gray-800';
      case 'agendado':
        return 'bg-brand-50 text-brand-700';
      case 'orcamento':
        return 'bg-brand-50 text-brand-700';
      case 'aprovado':
        return 'bg-brand-50 text-brand-700';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800';
      case 'concluido':
        return 'bg-brand-50 text-brand-700';
      case 'faturado':
        return 'bg-brand-50 text-brand-700 border-brand-100';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ServiceStatus) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'agendado': return 'Agendado';
      case 'orcamento': return 'Em Orçamento';
      case 'aprovado': return 'Aprovado';
      case 'em_andamento': return 'Em Andamento';
      case 'concluido': return 'Concluído';
      case 'faturado': return 'Faturado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
};
