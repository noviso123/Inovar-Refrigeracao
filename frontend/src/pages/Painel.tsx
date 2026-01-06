import React from 'react';
import { Usuario } from '../types';
import { DashboardSuperAdmin } from './dashboards/DashboardSuperAdmin';
import { DashboardPrestador } from './dashboards/DashboardPrestador';

interface DashboardProps {
    user: Usuario;
}

export const Painel: React.FC<DashboardProps> = ({ user }) => {
    // Scroll to top on mount
    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // Admin tem seu próprio dashboard
    if (user.cargo === 'admin') {
        return <DashboardSuperAdmin user={user} />;
    }

    // Prestador usa o dashboard operacional completo
    return <DashboardPrestador user={user} />;
};

export default Painel;
