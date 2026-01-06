
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Usuario } from '../types';

interface SubscriptionGuardProps {
    children: JSX.Element;
    user: Usuario;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ children, user }) => {
    const location = useLocation();

    // Super Admin bypasses subscription check
    if (user.cargo === 'super_admin') {
        return children;
    }

    // Check if subscription is active
    if (!user.assinaturaAtiva) {
        // Allow access to plans, payment, profile and subscription management pages
        const allowedPaths = ['/minha-assinatura', '/pagamento', '/perfil', '/admin/planos'];
        const isAllowed = allowedPaths.some(path => location.pathname.startsWith(path));

        if (!isAllowed) {
            // Redirect to subscription page
            return <Navigate to="/minha-assinatura" replace state={{ from: location }} />;
        }
    }

    return children;
};
