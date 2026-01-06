/**
 * Painel - Dashboard Router
 * Renderiza o dashboard apropriado baseado no cargo do usuário
 */
import React from 'react';
import { Usuario } from '../types';
import { DashboardSuperAdmin } from './dashboards/DashboardSuperAdmin';
import { DashboardPrestador } from './dashboards/DashboardPrestador';
import { DashboardTecnico } from './dashboards/DashboardTecnico';

interface DashboardProps {
    user: Usuario;
}

export const Painel: React.FC<DashboardProps> = ({ user }) => {
    // Scroll to top on mount
    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // Super Admin tem seu próprio dashboard
    if (user.cargo === 'super_admin') {
        return <DashboardSuperAdmin user={user} />;
    }

    // Técnico tem dashboard específico
    if (user.cargo === 'tecnico') {
        return <DashboardTecnico user={user} />;
    }

    // Prestador usa o dashboard operacional completo
    return <DashboardPrestador user={user} />;
};

export default Painel;

