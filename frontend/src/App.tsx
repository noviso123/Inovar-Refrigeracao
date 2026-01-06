import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Usuario, SolicitacaoServico, CargoUsuario } from './types';
import { authService } from './services/authService';
import { solicitacaoService } from './services/solicitacaoService';
import api from './services/api'; // Ainda usado para chamadas genéricas se necessário
import { LayoutPrincipal } from './components/LayoutPrincipal';
import { Login } from './pages/Login';
import { CadastroEmpresa } from './pages/CadastroEmpresa';
import { SubscriptionLocked } from './pages/SubscriptionLocked';
import { Users as GerenciarTecnicos } from './pages/Usuarios';
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


const GestaoPlanos = lazy(() => import('./pages/GestaoPlanos'));
const MinhaAssinatura = lazy(() => import('./pages/MinhaAssinatura').then(module => ({ default: module.SubscriptionSettings })));
const GestaoAssinaturas = lazy(() => import('./pages/GestaoAssinaturas'));
const GestaoEmpresas = lazy(() => import('./pages/GestaoEmpresas'));
const AdminInvoices = lazy(() => import('./pages/AdminInvoices').then(module => ({ default: module.AdminInvoices })));

import { SubscriptionGuard } from './components/SubscriptionGuard';

import { ScrollToTop } from './components/ScrollToTop';

// Componente de Carregamento
const PageLoader = () => (
    <div className="h-full w-full flex items-center justify-center p-10">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
    </div>
);

// Wrapper for Details
const RequestDetailsWrapper = ({ user, onRefresh }: { user: Usuario, onRefresh: () => Promise<any> }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [request, setRequest] = useState<SolicitacaoServico | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            // Usar ID diretamente como string (Firebase usa string IDs)
            solicitacaoService.obterPorId(id)
                .then(data => {
                    setRequest(data);
                    setLoading(false);

                    // Canonical URL Redirect: If we loaded by UID but have a numeric ID, switch URL
                    if (data.numero && String(data.numero) !== id) {
                        const newUrl = `/solicitacao/${data.numero}`;
                        window.history.replaceState(null, '', newUrl);
                    }
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

            // Append note to history if provided
            if (note && request) {
                const newHistoryItem = {
                    data: new Date().toISOString(),
                    descricao: note,
                    usuario: user.nome_completo || user.nomeCompleto || 'Sistema'
                };
                // Ensure historico_json is an array
                const currentHistory = Array.isArray(request.historico_json) ? request.historico_json : [];
                payload.historico_json = [...currentHistory, newHistoryItem];
            }

            await solicitacaoService.atualizar(requestId, payload);
            const refreshed = await solicitacaoService.obterPorId(requestId);
            console.log('Refetched Request Data:', refreshed);
            setRequest(refreshed);

            // Sync global state for Finance dashboard
            await onRefresh();
        } catch (error) {
            console.error('Failed to update request:', error);
        }
    };

    if (loading) return <PageLoader />;
    if (!request) return <div className="p-8 text-center text-gray-500">Solicitação não encontrada. <button onClick={() => navigate(-1)} className="text-brand-600 underline">Voltar</button></div>;

    return <ServiceRequestDetails request={request} user={user} onBack={() => navigate(-1)} onUpdate={handleUpdateRequest} onDelete={async () => { await onRefresh(); }} />;
};


// Role Guard Component
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

    // Refresh function for instant data sync
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

    // Load Data from API - Parallel Loading for better performance
    useEffect(() => {
        if (user) {
            // Load user and requests in parallel
            Promise.all([
                api.get<Usuario>(`/usuarios/${user.id}`),
                solicitacaoService.listar()
            ]).then(([userRes, requestsData]) => {
                setUser(userRes.data);
                localStorage.setItem('user', JSON.stringify(userRes.data));
                setRequests(requestsData);
            }).catch(err => console.error('Error loading data:', err));
        }
    }, []);

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
            // Use response directly - backend returns updated user
            const updatedUser = res.data;
            console.log('User updated successfully:', updatedUser);
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
                <Route path="/login" element={<Login onLogin={handleLogin} onRegisterCompanyClick={() => navigate('/register')} />} />
                <Route path="/register" element={<CadastroEmpresa onBackToLogin={() => navigate('/login')} onRegister={(data) => console.log('Register company:', data)} />} />
                <Route path="/subscription-locked" element={<SubscriptionLocked />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    return (
        <LayoutPrincipal user={user} onLogout={handleLogout}>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={
                        <SubscriptionGuard user={user}>
                            <Painel user={user} />
                        </SubscriptionGuard>
                    } />

                    <Route path="/empresario/*" element={
                        <SubscriptionGuard user={user}>
                            <RequireRole allowedRoles={['prestador', 'super_admin']} user={user}>
                                <Routes>
                                    <Route path="solicitacoes" element={<ServiceManagement user={user} requests={requests} onViewDetails={(id) => navigate(`/solicitacao/${id}`)} onCreateNew={() => navigate('/nova-solicitacao')} onRefresh={refreshRequests} />} />
                                    <Route path="clientes" element={<Clientes user={user} />} />
                                    <Route path="financeiro" element={<Finance requests={requests} />} />
                                    <Route path="qrcode" element={<QrCodeGenerator />} />

                                    <Route path="configuracoes" element={<Settings user={user} onUpdateUser={handleUpdateUser} />} />
                                    <Route path="tecnicos" element={<GerenciarTecnicos technicianMode={true} />} />
                                </Routes>
                            </RequireRole>
                        </SubscriptionGuard>
                    } />

                    {/* Super Admin Routes - Only administrative screens */}
                    <Route path="/admin/*" element={
                        <RequireRole allowedRoles={['super_admin']} user={user}>
                            <Routes>
                                <Route path="financeiro" element={<Finance requests={requests} />} />
                                <Route path="notas-fiscais" element={<AdminInvoices />} />
                                <Route path="qrcode" element={<QrCodeGenerator />} />
                                <Route path="configuracoes" element={<Settings user={user} onUpdateUser={handleUpdateUser} />} />

                                {/* Admin Planos e Assinaturas não precisam de Guard pois são de gestão */}
                                <Route path="planos" element={<GestaoPlanos user={user} />} />
                                <Route path="assinaturas" element={<GestaoAssinaturas user={user} />} />
                                <Route path="empresas" element={<GestaoEmpresas user={user} />} />
                                <Route path="usuarios" element={<GerenciarTecnicos />} />
                            </Routes>
                        </RequireRole>
                    } />

                    {/* Rotas de Prestador e Técnico */}
                    <Route path="/minhas-ordens" element={
                        <SubscriptionGuard user={user}>
                            <RequireRole allowedRoles={['prestador', 'tecnico', 'super_admin']} user={user}>
                                <ServiceManagement
                                    user={user}
                                    requests={requests.filter(r => r.tecnico_id === user.id || r.tecnicoId === user.id)}
                                    onViewDetails={(id) => navigate(`/solicitacao/${id}`)}
                                    onCreateNew={() => { }}
                                />
                            </RequireRole>
                        </SubscriptionGuard>
                    } />

                    {/* Minha Assinatura - Acessível mesmo sem assinatura ativa */}
                    <Route path="/minha-assinatura" element={
                        <RequireRole allowedRoles={['prestador', 'tecnico', 'super_admin']} user={user}>
                            <MinhaAssinatura user={user} />
                        </RequireRole>
                    } />
                    {/* Redirect old /assinatura to /minha-assinatura */}
                    <Route path="/assinatura" element={<Navigate to="/minha-assinatura" replace />} />

                    {/* Agenda - Prestador e Técnico */}
                    <Route path="/agenda" element={
                        <SubscriptionGuard user={user}>
                            <RequireRole allowedRoles={['prestador', 'tecnico', 'super_admin']} user={user}>
                                <Schedule
                                    user={user}
                                    requests={requests}
                                    onViewDetails={(id) => navigate(`/solicitacao/${id}`)}
                                    onUpdate={handleUpdateRequest}
                                />
                            </RequireRole>
                        </SubscriptionGuard>
                    } />

                    {/* WhatsApp - Apenas Prestador */}
                    <Route path="/whatsapp" element={
                        <SubscriptionGuard user={user}>
                            <RequireRole allowedRoles={['prestador', 'super_admin']} user={user}>
                                <WhatsApp />
                            </RequireRole>
                        </SubscriptionGuard>
                    } />

                    {/* Configurações Gerais - Apenas Técnico (outros usam rotas prefixadas) */}
                    <Route path="/configuracoes" element={
                        <RequireRole allowedRoles={['tecnico']} user={user}>
                            <Settings user={user} onUpdateUser={handleUpdateUser} />
                        </RequireRole>
                    } />



                    {/* Detalhes da Solicitação */}
                    <Route path="/solicitacao/:id" element={
                        <SubscriptionGuard user={user}>
                            <RequestDetailsWrapper user={user} onRefresh={refreshRequests} />
                        </SubscriptionGuard>
                    } />

                    {/* Nova Solicitação */}
                    <Route path="/nova-solicitacao" element={
                        <SubscriptionGuard user={user}>
                            <ServiceRequestForm user={user} />
                        </SubscriptionGuard>
                    } />

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
