import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Usuario, SolicitacaoServico, CargoUsuario } from './types';
import { authService } from './services/authService';
import { solicitacaoService } from './services/solicitacaoService';
import api from './services/api';
import { LayoutPrincipal } from './components/LayoutPrincipal';
import { Login } from './pages/Login';
import { Users as GerenciarUsuarios } from './pages/Usuarios';
import { NotificationProvider, useNotification } from './contexts/ContextoNotificacao';
import { Loader2 } from 'lucide-react';

// Lazy Load Pages
const Painel = lazy(() => import('./pages/Painel').then(module => ({ default: module.Painel })));
const ServiceManagement = lazy(() => import('./pages/GestaoServicos').then(module => ({ default: module.ServiceManagement })));
const Finance = lazy(() => import('./pages/Financeiro').then(module => ({ default: module.Financeiro })));
const Settings = lazy(() => import('./pages/Configuracoes').then(module => ({ default: module.Settings })));
const QrCodeGenerator = lazy(() => import('./pages/GeradorQrCode').then(module => ({ default: module.GeradorQrCode })));
const ServiceRequestForm = lazy(() => import('./pages/FormularioSolicitacao').then(module => ({ default: module.FormularioSolicitacao })));
const ServiceRequestDetails = lazy(() => import('./pages/DetalhesSolicitacao').then(module => ({ default: module.ServiceRequestDetails })));
const Schedule = lazy(() => import('./pages/Agenda').then(module => ({ default: module.Schedule })));
const Clientes = lazy(() => import('./pages/Clientes').then(module => ({ default: module.Clientes })));
const WhatsApp = lazy(() => import('./pages/WhatsApp').then(module => ({ default: module.WhatsApp })));
const AdminInvoices = lazy(() => import('./pages/AdminInvoices').then(module => ({ default: module.AdminInvoices })));

import { ScrollToTop } from './components/ScrollToTop';

const PageLoader = () => (
    <div className="h-full w-full flex items-center justify-center p-10">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
    </div>
);

const RequestDetailsWrapper = ({ user, onRefresh }: { user: Usuario, onRefresh: () => Promise<any> }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [request, setRequest] = useState<SolicitacaoServico | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            solicitacaoService.obterPorId(id)
                .then(data => {
                    setRequest(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Erro ao buscar solicitação:', err);
                    setLoading(false);
                });
        }
    }, [id]);

    const handleUpdateRequest = async (requestId: number | string, updates: Partial<SolicitacaoServico>, note?: string) => {
        try {
            const payload = { ...updates };
            if (note && request) {
                const newHistoryItem = {
                    data: new Date().toISOString(),
                    descricao: note,
                    usuario: user.nome_completo || 'Sistema'
                };
                const currentHistory = Array.isArray(request.historico_json) ? (request as any).historico_json : [];
                (payload as any).historico_json = [...currentHistory, newHistoryItem];
            }
            await solicitacaoService.atualizar(requestId, payload);
            const refreshed = await solicitacaoService.obterPorId(requestId);
            setRequest(refreshed);
            await onRefresh();
        } catch (error) {
            console.error('Failed to update request:', error);
        }
    };

    if (loading) return <PageLoader />;
    if (!request) return <div className="p-8 text-center text-gray-500">Solicitação não encontrada.</div>;

    return <ServiceRequestDetails request={request} user={user} onBack={() => navigate(-1)} onUpdate={handleUpdateRequest} onDelete={async () => { await onRefresh(); }} />;
};

const RequireRole = ({ children, allowedRoles, user }: { children: JSX.Element, allowedRoles: CargoUsuario[], user: Usuario }) => {
    if (!allowedRoles.includes(user.cargo)) {
        return <Navigate to="/" replace />;
    }
    return children;
};

const AppContent: React.FC = () => {
    const { notify } = useNotification();
    const [user, setUser] = useState<Usuario | null>(authService.getCurrentUser());
    const [requests, setRequests] = useState<SolicitacaoServico[]>([]);
    const navigate = useNavigate();

    const refreshRequests = async () => {
        try {
            const data = await solicitacaoService.listar();
            setRequests(data);
            return data;
        } catch (err) {
            console.error('Error refreshing requests:', err);
            return [];
        }
    };

    useEffect(() => {
        if (user) {
            Promise.all([
                api.get<Usuario>(`/usuarios/${user.id}`),
                solicitacaoService.listar()
            ]).then(([userRes, requestsData]) => {
                setUser(userRes.data);
                localStorage.setItem('user', JSON.stringify(userRes.data));
                setRequests(requestsData);
            }).catch(err => console.error('Error loading data:', err));
        }
    }, [user?.id]);

    const handleLogin = (loggedInUser: Usuario) => {
        setUser(loggedInUser);
        navigate('/');
    };

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        setRequests([]);
    };

    const handleUpdateUser = async (userId: number | string, updates: Partial<Usuario>) => {
        try {
            const res = await api.put<Usuario>(`/usuarios/${userId}`, updates);
            const updatedUser = res.data;
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            notify('Perfil atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Failed to update user:', error);
            notify('Erro ao atualizar perfil.', 'error');
        }
    };

    const handleUpdateRequest = async (requestId: number | string, updates: Partial<SolicitacaoServico>) => {
        try {
            await solicitacaoService.atualizar(requestId, updates);
            await refreshRequests();
        } catch (error) {
            console.error('Failed to update request:', error);
        }
    };

    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    return (
        <LayoutPrincipal user={user} onLogout={handleLogout}>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Home / Painel */}
                    <Route path="/" element={<Painel user={user} />} />

                    {/* Rotas de Gestão (Simplificadas) */}
                    <Route path="/solicitacoes" element={<ServiceManagement user={user} requests={requests} onViewDetails={(id) => navigate(`/solicitacao/${id}`)} onCreateNew={() => navigate('/nova-solicitacao')} onRefresh={refreshRequests} />} />
                    <Route path="/clientes" element={<Clientes user={user} />} />
                    <Route path="/financeiro" element={<Finance requests={requests} />} />
                    <Route path="/usuarios" element={<GerenciarUsuarios />} />
                    <Route path="/configuracoes" element={<Settings user={user} onUpdateUser={handleUpdateUser} />} />
                    <Route path="/whatsapp" element={<WhatsApp />} />
                    <Route path="/qrcode" element={<QrCodeGenerator />} />
                    <Route path="/agenda" element={<Schedule user={user} requests={requests} onViewDetails={(id) => navigate(`/solicitacao/${id}`)} onUpdate={handleUpdateRequest} />} />

                    {/* Detalhes e Novos */}
                    <Route path="/solicitacao/:id" element={<RequestDetailsWrapper user={user} onRefresh={refreshRequests} />} />
                    <Route path="/nova-solicitacao" element={<ServiceRequestForm user={user} />} />

                    {/* Redirecionamentos de rotas legadas */}
                    <Route path="/empresario/*" element={<Navigate to="/" replace />} />
                    <Route path="/admin" element={<Navigate to="/" replace />} />
                    <Route path="/minhas-ordens" element={<Navigate to="/solicitacoes" replace />} />
                    <Route path="/minha-assinatura" element={<Navigate to="/configuracoes" replace />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes >
            </Suspense >
        </LayoutPrincipal >
    );
};

const App: React.FC = () => {
    return (
        <NotificationProvider>
            <AppContent />
        </NotificationProvider>
    );
};

export default App;
