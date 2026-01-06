import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Briefcase, PlusCircle, Settings, Building, User as UserIcon } from 'lucide-react';
import { Usuario } from '../types';

interface BottomNavProps {
    user: Usuario;
}

export const BottomNav: React.FC<BottomNavProps> = ({ user }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const getNavItems = () => {
        const isAdmin = user.cargo === 'admin';

        if (isAdmin) {
            return [
                { id: '/', label: 'Início', icon: Home },
                { id: '/clientes', label: 'Clientes', icon: Building },
                { id: '/usuarios', label: 'Usuários', icon: UserIcon },
                { id: '/configuracoes', label: 'Config', icon: Settings },
            ];
        }

        return [
            { id: '/', label: 'Início', icon: Home },
            { id: '/solicitacoes', label: 'Serviços', icon: Briefcase },
            { id: '/nova-solicitacao', label: 'Novo', icon: PlusCircle, isAction: true },
            { id: '/configuracoes', label: 'Config', icon: Settings },
        ];
    };


    const navItems = getNavItems();

    const isActive = (path: string) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <nav className="bottom-nav lg:hidden">
            <div className="flex items-center justify-around h-full max-w-lg mx-auto">
                {navItems.map((item, index) => {
                    const active = isActive(item.id);
                    const Icon = item.icon;

                    if (item.isAction) {
                        // Botão de ação central (Novo)
                        return (
                            <button
                                key={`${item.id}-${index}`}
                                onClick={() => navigate(item.id)}
                                className="flex flex-col items-center justify-center -mt-6"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 transition-transform active:scale-95">
                                    <Icon className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-medium text-brand-500 mt-1">
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={`${item.id}-${index}`}
                            onClick={() => navigate(item.id)}
                            className={`bottom-nav-item ${active ? 'active' : ''}`}
                        >
                            <Icon className="bottom-nav-icon" />
                            <span className="bottom-nav-label">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
