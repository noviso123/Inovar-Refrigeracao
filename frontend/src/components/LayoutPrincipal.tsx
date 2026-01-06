import React, { useState } from 'react';
import { Usuario } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Menu,
  X,
  User as UserIcon,
  BarChart2,
  Briefcase,
  QrCode,
  Calendar,
  MessageCircle,
  Wallet,
  CreditCard,
  Package,
  LogOut,
  ChevronRight,
  Bell,
  Settings,
  Building,
  FileText
} from 'lucide-react';
import { BottomNav } from './BottomNav';
import { SecureImage } from './SecureImage';

interface LayoutProps {
  user: Usuario;
  onLogout: () => void;
  children: React.ReactNode;
}

export const LayoutPrincipal: React.FC<LayoutProps> = ({
  user,
  onLogout,
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const getMenuItems = () => {
    const isAdmin = user.cargo === 'admin';

    if (isAdmin) {
      return [
        { id: '/', label: 'Painel', icon: Home, section: 'geral' },
        { id: '/solicitacoes', label: 'Serviços', icon: Briefcase, section: 'gestao' },
        { id: '/clientes', label: 'Clientes', icon: UserIcon, section: 'gestao' },
        { id: '/agenda', label: 'Agenda', icon: Calendar, section: 'gestao' },
        { id: '/whatsapp', label: 'WhatsApp', icon: MessageCircle, section: 'gestao' },
        { id: '/financeiro', label: 'Financeiro', icon: BarChart2, section: 'gestao' },
        { id: '/usuarios', label: 'Equipe', icon: UserIcon, section: 'gestao' },
        { id: '/configuracoes', label: 'Configurações', icon: Settings, section: 'conta' }
      ];
    }

    return [
      { id: '/', label: 'Painel', icon: Home, section: 'geral' },
      { id: '/solicitacoes', label: 'Serviços', icon: Briefcase, section: 'gestao' },
      { id: '/agenda', label: 'Agenda', icon: Calendar, section: 'gestao' },
      { id: '/configuracoes', label: 'Configurações', icon: Settings, section: 'conta' }
    ];
  };

const menuItems = getMenuItems();

const isActive = (path: string) => {
  if (path === '/' && location.pathname === '/') return true;
  if (path !== '/' && location.pathname.startsWith(path)) return true;
  return false;
};

const sections = {
  geral: menuItems.filter(i => i.section === 'geral'),
  gestao: menuItems.filter(i => i.section === 'gestao'),
  admin: menuItems.filter(i => i.section === 'admin'),
  conta: menuItems.filter(i => i.section === 'conta'),
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="px-4 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">
    {children}
  </p>
);

const MenuItem = ({ item }: { item: typeof menuItems[0] }) => (
  <button
    onClick={() => {
      navigate(item.id);
      setIsMobileMenuOpen(false);
    }}
    className={`menu-item w-full ${isActive(item.id) ? 'active' : ''}`}
  >
    <item.icon className="menu-item-icon" />
    <span className="flex-1 text-left">{item.label}</span>
    {!isActive(item.id) && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
  </button>
);

return (
  <div className="min-h-screen bg-surface-50">
    {/* ===== MOBILE HEADER ===== */}
    <header className="mobile-header lg:hidden">
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="p-2 -ml-2 rounded-xl hover:bg-surface-100 transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="w-6 h-6 text-surface-600" />
      </button>

      <div className="flex-1 flex items-center justify-center">
        <span className="font-bold text-lg text-surface-800">Inovar Refrigeração</span>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="p-2 -mr-2 rounded-xl hover:bg-surface-100 transition-colors relative"
        >
          <Bell className="w-6 h-6 text-surface-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {showNotifications && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifications(false)}
            />
            <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-xl border border-surface-200 z-50 overflow-hidden">
              <div className="p-3 border-b border-surface-100 bg-surface-50">
                <span className="font-bold text-surface-800">Notificações</span>
              </div>
              <div className="p-4 text-center text-sm text-surface-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-surface-300" />
                <p>Nenhuma notificação nova</p>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate(`/configuracoes`);
                  }}
                  className="text-brand-600 text-xs mt-2 hover:underline"
                >
                  Configurar notificações
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>

    {/* ===== MOBILE MENU OVERLAY ===== */}
    {isMobileMenuOpen && (
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 lg:hidden animate-fade-in"
        onClick={() => setIsMobileMenuOpen(false)}
      />
    )}

    {/* ===== MOBILE MENU DRAWER ===== */}
    <div className={`
                fixed top-0 left-0 w-80 max-w-[85vw] bg-white z-50
                flex flex-col
                transform transition-transform duration-300 ease-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:hidden
                h-full
            `}>
      {/* Close button */}
      <div className="flex items-center justify-between p-4 border-b border-surface-100 shrink-0">
        <span className="font-bold text-lg">Menu</span>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="p-2 rounded-xl hover:bg-surface-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User profile */}
      <div className="p-4 border-b border-surface-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <SecureImage src={user.avatar_url} alt={user.nome_completo} className="w-full h-full object-cover" />
            ) : (
              <span className="text-brand-600 font-bold text-lg">
                {user.nome_completo?.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-surface-800 truncate">{user.nome_completo}</p>
            <p className="text-sm text-surface-500 capitalize">{user.cargo}</p>
          </div>
        </div>
      </div>

      {/* Menu items - with extra padding at bottom for Sair button visibility */}
      <nav className="flex-1 overflow-y-auto p-2 min-h-0 pb-24">
        <SectionTitle>Geral</SectionTitle>
        {sections.geral.map(item => <MenuItem key={item.id} item={item} />)}

        <SectionTitle>Gestão</SectionTitle>
        {sections.gestao.map(item => <MenuItem key={item.id} item={item} />)}

        {sections.admin.length > 0 && (
          <>
            <SectionTitle>Administração</SectionTitle>
            {sections.admin.map(item => <MenuItem key={item.id} item={item} />)}
          </>
        )}

        <SectionTitle>Conta</SectionTitle>
        {sections.conta.map(item => <MenuItem key={item.id} item={item} />)}

        <div className="mt-4 p-2">
          <button
            onClick={onLogout}
            className="menu-item w-full text-red-500 hover:bg-red-50"
          >
            <LogOut className="menu-item-icon" />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </div>

    {/* ===== DESKTOP SIDEBAR ===== */}
    <aside className="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-surface-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <span className="text-white font-bold">H</span>
          </div>
          <span className="font-bold text-xl text-surface-800">Inovar Refrigeração</span>
        </div>
      </div>

      {/* User profile */}
      <div className="p-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <SecureImage src={user.avatar_url} alt={user.nome_completo} className="w-full h-full object-cover" />
            ) : (
              <span className="text-brand-600 font-bold">
                {user.nome_completo?.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-surface-800 truncate">{user.nome_completo}</p>
            <p className="text-xs text-surface-500 capitalize">{user.cargo}</p>
          </div>
        </div>
      </div>

      {/* Navigation - Desktop com scroll vertical visível */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        <SectionTitle>Geral</SectionTitle>
        {sections.geral.map(item => <MenuItem key={item.id} item={item} />)}

        <SectionTitle>Gestão</SectionTitle>
        {sections.gestao.map(item => <MenuItem key={item.id} item={item} />)}

        {sections.admin.length > 0 && (
          <>
            <SectionTitle>Administração</SectionTitle>
            {sections.admin.map(item => <MenuItem key={item.id} item={item} />)}
          </>
        )}

        {/* Seção CONTA removida conforme solicitado */}
        {/* {sections.conta.map(item => <MenuItem key={item.id} item={item} />)} */}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-surface-100">
        <button
          onClick={onLogout}
          className="menu-item w-full text-red-500 hover:bg-red-50"
        >
          <LogOut className="menu-item-icon" />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>

    {/* ===== MAIN CONTENT ===== */}
    <main id="main-content" className="content-area">
      <div className="p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto animate-in">
        {children}
      </div>
    </main>

    {/* ===== BOTTOM NAVIGATION (Mobile only) ===== */}
    <BottomNav user={user} />
  </div>
);
};

export default LayoutPrincipal;
