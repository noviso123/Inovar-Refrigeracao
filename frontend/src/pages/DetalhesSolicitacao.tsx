import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Usuario, SolicitacaoServico, StatusOS, ItemOS, PrioridadeOS } from '../types';
import { StatusBadge } from '../components/EmblemaStatus';
import { ServiceTimeline } from '../components/LinhaTempoServico';
import { Button } from '../components/Botao';
import {
    MapPin, Calendar, Wrench, User as UserIcon, DollarSign, Check, X, ArrowLeft,
    UserMinus, Zap, FileText, Send, CalendarCheck, Camera, Loader2, Plus, Trash2,
    ShoppingCart, Clock, ShieldAlert, ChevronRight, LayoutDashboard, Image as ImageIcon,
    History, Phone, Mail, Navigation, PenTool, CheckCircle, MessageCircle, Receipt, RefreshCw, Edit2, Paperclip
} from 'lucide-react';
import { ServiceDocument } from '../components/DocumentoServico';
import { ModalNFSe } from '../components/ModalNFSe';
import { DocumentoNFSe } from '../components/DocumentoNFSe';
import { ModalEditorOrcamento } from '../components/ModalEditorOrcamento';
import { ModalAgendamento } from '../components/ModalAgendamento';

import { CanvasAssinatura } from '../components/CanvasAssinatura';
import { ServiceCompletionWizard } from '../components/ServiceCompletionWizard'; // New Import
import { useNotification } from '../contexts/ContextoNotificacao';
import { formatarData } from '../utils/formatadores';
import api from '../services/api';
import { whatsappBrain } from '../services/whatsappBrain';

interface Props {
    request: SolicitacaoServico;
    user: Usuario;
    onBack: () => void;
    onUpdate: (requestId: number | string, updates: Partial<SolicitacaoServico>, note?: string) => Promise<void>;
    onDelete?: () => Promise<void>;
}

type TabType = 'overview' | 'services' | 'photos' | 'history';

export const ServiceRequestDetails: React.FC<Props> = ({ request, user, onBack, onUpdate, onDelete }) => {
    const { notify } = useNotification();
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Description Editing State
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editedDesc, setEditedDesc] = useState('');

    const handleSaveDescription = async () => {
        if (editedDesc !== request.descricao_detalhada) {
            await onUpdate(request.id as number, { descricao_detalhada: editedDesc });
            notify('Descrição atualizada com sucesso!', 'success');
        }
        setIsEditingDesc(false);
    };

    // Scroll to top on mount
    // Scroll to top on mount and when request changes
    useEffect(() => {
        const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'instant' });
        scrollToTop();
        // Retry a few times to handle layout shifts
        setTimeout(scrollToTop, 50);
        setTimeout(scrollToTop, 150);
        setTimeout(scrollToTop, 300);
    }, [request.id]);

    // Quote State
    const [quoteItems, setQuoteItems] = useState<ItemOS[]>(request.itens || []);
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemQty, setNewItemQty] = useState<string>('1');
    const [newItemPrice, setNewItemPrice] = useState<string>('');
    const [quoteDesc, setQuoteDesc] = useState<string>(request.description || '');

    // Sync local state with prop updates
    useEffect(() => {
        if (request.itens) {
            setQuoteItems(request.itens);
        }
        if (request.description) {
            setQuoteDesc(request.description);
        }
    }, [request.itens, request.description]);

    // Assignment State
    const [selectedTech, setSelectedTech] = useState<string | ''>('');
    const [isAssigning, setIsAssigning] = useState(false);

    // Action States
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [isNFSeModalOpen, setIsNFSeModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleDate, setScheduleDate] = useState<string>(request.scheduled_at || '');
    const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
    const [trackingNote, setTrackingNote] = useState('');

    // Evidence Upload State
    const [tempPhotos, setTempPhotos] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Completion State
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [clientSignature, setClientSignature] = useState(request.client_signature || '');
    const [technicianSignature, setTechnicianSignature] = useState(request.tech_signature || '');

    // Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Helper para cor do header baseada no status
    const getStatusHeaderColor = () => {
        switch (request.status) {
            case 'pendente': return 'from-yellow-600 to-yellow-700';
            case 'agendado': return 'from-blue-600 to-blue-700';
            case 'em_andamento': return 'from-indigo-600 to-indigo-700';
            case 'concluido': return 'from-brand-600 to-brand-700';
            case 'faturado': return 'from-brand-700 to-brand-800';
            case 'cancelado': return 'from-red-600 to-red-700';
            default: return 'from-blue-900 to-blue-800';
        }
    };

    const getImageUrl = (foto: any) => {
        if (!foto) return '';
        const url = foto.imagem_base64 || foto.url || (typeof foto === 'string' ? foto : '');
        if (!url) return '';
        if (url.startsWith('data:image')) return url;
        if (url.startsWith('http')) return url;
        if (url.startsWith('/api/files/')) {
            return `${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')}${url}`;
        }
        return `${import.meta.env.VITE_API_URL || ''}/files/${url}`;
    };

    // Função para atualizar a página
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // Força atualização buscando dados frescos
            const response = await api.get(`/solicitacoes/${request.id}`);
            if (response.data) {
                // Atualiza via callback do parent
                await onUpdate(request.id as number, response.data);
            }
            notify('Dados atualizados!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar:', error);
            notify('Erro ao atualizar dados.', 'error');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleWizardComplete = async (data: import('../components/ServiceCompletionWizard').WizardCompletionData) => {
        console.log('DEBUG: handleWizardComplete data:', data);
        try {
            // 1. Update Service Order status and data
            const newStatus = data.nfseResult ? 'faturado' : 'concluido';
            await onUpdate(request.id as number, {
                status: newStatus,
                technical_report: data.technicalReport, // Salvar no campo correto
                fotos: [...(request.fotos || []), ...data.photos.map((p: string) => ({ url: p }))],
                tech_signature: data.adminBypass ? undefined : data.techSignature,
                client_signature: data.adminBypass ? undefined : data.clientSignature,
                relatorio_disponivel: true,
                completed_at: new Date().toISOString(),
                nfse: data.nfseResult || undefined
            }, `[Diário de Obra] Relatório Técnico Final (OS #${request.sequential_id || request.id}):\n${data.technicalReport}`);

            // 2. Send WhatsApp notification with OS and NFSe info
            const clientePhone = request.cliente?.telefone;
            if (clientePhone) {
                try {
                    const nfseInfo = data.nfseResult
                        ? `\n\n📄 *NFS-e Emitida:*\n   Número: ${data.nfseResult.numero}\n   Código Verificação: ${data.nfseResult.codigo_verificacao}`
                        : '';

                    const osMessage = `✅ *Serviço Concluído!*\n\nOlá ${request.cliente?.nome || 'Cliente'}!\n\nSeu serviço foi finalizado com sucesso.\n\n📋 *OS:* #${request.sequential_id || request.id}\n📝 *Título:* ${request.titulo}\n💰 *Valor:* R$ ${(request.valor_total || 0).toFixed(2)}${nfseInfo}\n\nObrigado pela preferência! 🙏`;

                    await whatsappBrain.sendMessage(`55${clientePhone}`, osMessage);
                    notify('Mensagem de conclusão enviada via WhatsApp!', 'success');
                } catch (whatsappError) {
                    console.error('Erro ao enviar WhatsApp:', whatsappError);
                    notify('Erro ao enviar WhatsApp, mas serviço foi concluído.', 'warning');
                }
            }

            setIsWizardOpen(false);
            notify('Serviço finalizado com sucesso!', 'success');

        } catch (error) {
            console.error(error);
            notify('Erro ao salvar dados do wizard.', 'error');
        }
    };

    // Document Viewing
    const [viewingDoc, setViewingDoc] = useState<'QUOTE' | 'REPORT' | null>(null);
    const [showDanfe, setShowDanfe] = useState(false);

    // Load Technicians with React Query
    const { data: technicians = [] } = useQuery({
        queryKey: ['technicians'],
        queryFn: async () => {
            const res = await api.get('/usuarios');
            if (Array.isArray(res.data)) {
                return res.data.filter((u: Usuario) => u.cargo === 'tecnico');
            }
            return [];
        },
        enabled: user.cargo === 'admin' || user.cargo === 'super_admin' || user.cargo === 'gerente',
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    // Permissions
    const canViewQuote = request.orcamento_disponivel;
    const canViewWorkOrder = ['agendado', 'em_andamento', 'aprovado', 'concluido', 'faturado'].includes(request.status);
    const canViewFinalReport = request.relatorio_disponivel;

    // Calculate Totals (Net & Gross)
    const calculateNetTotal = () => quoteItems.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const calculateGrossTotal = () => {
        return calculateNetTotal();
    };

    // Equipment State - Initialize with equipments from existing items
    const initialEquipments = (request.itens || [])
        .filter(item => item.equipamento && item.equipamento.id)
        .map(item => item.equipamento!);

    console.log('DetalhesSolicitacao: Initial equipments from itens_os:', initialEquipments);

    const [clientEquipments, setClientEquipments] = useState<{ id: number | string; nome: string; marca?: string; modelo?: string }[]>(initialEquipments);

    // Load Client Equipments with React Query
    const { data: fetchedEquipments = [] } = useQuery({
        queryKey: ['clientEquipments', request.cliente_id],
        queryFn: async () => {
            if (!request.cliente_id) return [];

            try {
                // Try fetching client details first (nested equipments)
                const res = await api.get(`/clientes/${request.cliente_id}`);
                if (res.data && res.data.equipamentos && res.data.equipamentos.length > 0) {
                    return res.data.equipamentos;
                }

                // Fallback to direct equipments fetch
                const resEq = await api.get(`/equipamentos?clienteId=${request.cliente_id}`);
                return Array.isArray(resEq.data) ? resEq.data : [];
            } catch (error) {
                console.error('Error fetching equipments:', error);
                return [];
            }
        },
        enabled: !!request.cliente_id,
        staleTime: 1000 * 60 * 5,
    });

    // Merge fetched equipments with existing items' equipments
    useEffect(() => {
        const itemEquipments = (request.itens_os || [])
            .filter(item => item.equipamentos && item.equipamentos.id)
            .map(item => item.equipamentos!);

        const allEquipments = [...fetchedEquipments];

        // Add items from current OS that might not be in the fetched list
        itemEquipments.forEach(eq => {
            if (!allEquipments.find(e => e.id === eq.id)) {
                allEquipments.push(eq);
            }
        });

        setClientEquipments(allEquipments);
    }, [fetchedEquipments, request.itens_os]);

    // Ensure equipments from existing items are available in the list
    useEffect(() => {
        if (quoteItems.length > 0) {
            const itemsEquipments = quoteItems
                .filter(item => item.equipamentos || item.equipamento_id)
                .map(item => item.equipamentos || { id: item.equipamento_id!, nome: 'Equipamento Vinculado' });

            setClientEquipments(prev => {
                const existingIds = new Set(prev.map(e => e.id.toString()));
                const newEquips = itemsEquipments.filter(e => e && !existingIds.has(e.id.toString()));

                if (newEquips.length === 0) return prev;

                // Create a unique list to avoid duplicates within newEquips
                const uniqueNewEquips: any[] = [];
                const seenNewIds = new Set();
                for (const eq of newEquips) {
                    if (eq && !seenNewIds.has(eq.id.toString())) {
                        seenNewIds.add(eq.id.toString());
                        uniqueNewEquips.push(eq);
                    }
                }

                return [...prev, ...uniqueNewEquips];
            });
        }
    }, [quoteItems, request.itens_os]);

    // Handlers
    const handleSaveQuote = async (items: ItemOS[], description: string) => {
        const itemsTotal = items.reduce((acc, item) => acc + (item.valor_total || 0), 0);

        await onUpdate(request.id, {
            valor_total: itemsTotal, // Save Net Total
            itens_os: items,
            descricao_orcamento: description,
            orcamento_disponivel: true
        }, `Orçamento atualizado: R$ ${itemsTotal.toFixed(2)} (Líquido)`);

        setQuoteItems(items);
        setQuoteDesc(description);
        setIsQuoteModalOpen(false);
        setTimeout(() => setViewingDoc('QUOTE'), 300);
    };

    const handleAssign = () => {
        if (!selectedTech) return;
        const tech = technicians.find(t => t.id === parseInt(selectedTech));
        if (tech) {
            onUpdate(request.id, {
                status: 'agendado',
                tech_id: tech.id,
                tech: tech
            }, 'Técnico atribuído');
            setIsAssigning(false);
        }
    };

    const handleUpdateSchedule = async (newDate: string) => {
        setIsSyncingCalendar(true);
        try {
            await onUpdate(request.id, { scheduled_at: newDate }, `Agendado para ${new Date(newDate).toLocaleString()}`);
            setScheduleDate(newDate);
            notify('Agendamento salvo.', 'success');

            // Enviar notificação automática via WhatsApp
            const clientPhone = request.cliente?.telefone?.replace(/\D/g, '');
            if (clientPhone) {
                try {
                    // Obter nome da instância do usuário
                    const storedUser = localStorage.getItem('user');
                    const currentUser = storedUser ? JSON.parse(storedUser) : null;
                    const userName = currentUser?.nome || currentUser?.nomeCompleto || currentUser?.nome_completo || 'User';
                    const userInstanceName = userName.replace(/[^a-zA-Z0-9]/g, '');
                    const companyName = currentUser?.empresas?.nomeFantasia || currentUser?.empresas?.nome_fantasia || 'Inovar Refrigeração';

                        await whatsappBrain.sendMessage(`55${clientPhone}`, mensagem);
                        notify('Cliente notificado via WhatsApp! 📱', 'success');
                    }
                } catch (whatsappError) {
                    console.error('[WhatsApp] Erro ao notificar cliente:', whatsappError);
                    // Não falhar o agendamento se WhatsApp falhar
                }
            }
        } catch (error) {
            notify('Erro ao salvar agendamento.', 'error');
        } finally {
            setIsSyncingCalendar(false);
            setIsScheduleModalOpen(false);
        }
    };

    const handleTempPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsUploading(true);
        const files = Array.from(e.target.files) as File[];

        try {
            const { uploadFile } = await import('../services/uploadService');

            // Upload sequentially or parallel - parallel is fine for ImgBB
            const uploadPromises = files.map(file => uploadFile(file, 'service-evidence'));
            const urls = await Promise.all(uploadPromises);

            setTempPhotos(prev => [...prev, ...urls]);
            notify(`${urls.length} foto(s) enviada(s)!`, 'success');
        } catch (error) {
            console.error(error);
            notify('Erro ao fazer upload das fotos.', 'error');
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleAddTrackingNote = async () => {
        if (!trackingNote.trim() && tempPhotos.length === 0) return;

        // Create the new history entry with photos embedded (URLs now, not base64)
        const newHistoryItem = {
            data: new Date().toISOString(),
            descricao: `[Diário de Obra] ${trackingNote || 'Registro de evidências'}`,
            usuario: user.nome_completo || user.nome || 'Sistema',
            fotos: tempPhotos.length > 0 ? tempPhotos : undefined // URLs directly
        };

        // Append to existing history
        const currentHistory = Array.isArray(request.historico_json) ? request.historico_json : [];
        const updates: Partial<SolicitacaoServico> = {
            historico_json: [...currentHistory, newHistoryItem]
        };

        // Also update fotos for gallery view
        if (tempPhotos.length > 0) {
            const existingPhotos = request.fotos || [];
            const newPhotos = tempPhotos.map(url => ({ url: url }));
            updates.fotos = [...existingPhotos, ...newPhotos];
        }

        await onUpdate(request.id, updates, ''); // Note is already in history entry
        notify('Registro adicionado com sucesso!', 'success');
        setTrackingNote('');
        setTempPhotos([]);
    };

    const handleGenerateOS = () => {
        if (['em_andamento', 'concluido', 'faturado'].includes(request.status)) {
            setViewingDoc('REPORT');
            return;
        }
        onUpdate(request.id, {
            status: 'em_andamento',
            // data_inicio_real removed if not in schema
        }, `Gerou Ordem de Serviço (Início de Execução)`);
        setTimeout(() => setViewingDoc('REPORT'), 500);
    };

    const handleFinalizeWithSignatures = () => {
        onUpdate(request.id, {
            status: 'concluido',
            client_signature: clientSignature,
            tech_signature: technicianSignature,
            relatorio_disponivel: true
        }, 'Serviço concluído com assinaturas');
        setShowFinishModal(false);
    };

    const handleForceFinish = () => {
        if (confirm("ATENÇÃO: Conclusão sem assinaturas. Continuar?")) {
            onUpdate(request.id, {
                status: 'concluido',
                relatorio_disponivel: true,
                client_signature: undefined,
                tech_signature: undefined
            }, `Serviço concluído ADMINISTRATIVAMENTE por ${user.nome_completo}`);
            setShowFinishModal(false);
        }
    };

    const queryClient = useQueryClient();

    const handleDeleteOS = async () => {
        if (!confirm('ATENÇÃO: Tem certeza que deseja EXCLUIR esta OS permanentemente?')) return;
        try {
            await api.delete(`/solicitacoes/${request.id}`);
            notify('OS excluída com sucesso.', 'success');

            // Invalidate cache to force refresh on list view
            queryClient.invalidateQueries({ queryKey: ['requests'] });

            // Call parent delete handler if provided (updates App state)
            if (onDelete) {
                await onDelete();
            }

            onBack();
        } catch (error) {
            notify('Erro ao excluir OS.', 'error');
        }
    };

    const handleSendWhatsApp = () => {
        if (!request.cliente?.telefone) {
            notify('Cliente sem telefone cadastrado.', 'error');
            return;
        }

        // Open the document view which has the WhatsApp integration with PDF
        setViewingDoc('QUOTE');
        notify('Use o botão "Enviar pelo WhatsApp" no documento para enviar com o PDF.', 'info');
    };

    // Components
    const TabButton = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
        >
            <Icon className="w-4 h-4 mr-2" />
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-6">
            {/* Hero Header - Cor dinâmica baseada no status */}
            <div className={`bg-gradient-to-r ${getStatusHeaderColor()} text-white shadow-lg overflow-x-hidden`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-full transition">
                                    <ArrowLeft className="w-5 h-5 text-white/80" />
                                </button>
                                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white/80">
                                    OS #{request.sequential_id || request.id}
                                </span>
                                <StatusBadge status={request.status} />
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="p-1.5 hover:bg-white/10 rounded-full transition disabled:opacity-50"
                                    title="Atualizar"
                                >
                                    <RefreshCw className={`w-4 h-4 text-white/80 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <h1 className="text-2xl font-bold text-white">{request.titulo}</h1>
                            <div className="flex items-center gap-4 mt-2 text-blue-100 text-sm flex-wrap">
                                <span className="flex items-center"><UserIcon className="w-3 h-3 mr-1" /> {request.cliente?.nome}</span>
                                <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {formatarData(request.created_at || (request as any).criado_em)}</span>
                                {request.nfse?.numero && (
                                    <span className="flex items-center bg-brand-500 text-white px-3 py-1 rounded-full font-bold text-sm">
                                        <Receipt className="w-4 h-4 mr-2" />
                                        NFS-e: {request.nfse.numero}
                                        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded text-xs uppercase">
                                            {request.nfse.status || 'Emitida'}
                                        </span>
                                        <span className="ml-2 text-xs font-normal opacity-80">
                                            {request.nfse.data_emissao ? new Date(request.nfse.data_emissao).toLocaleString('pt-BR') : ''}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:gap-3">
                            <Button variant="secondary" onClick={() => setViewingDoc('QUOTE')} className="bg-white/10 border-white/20 text-white hover:bg-white/20 whitespace-nowrap flex-shrink-0">
                                <FileText className="w-4 h-4 mr-2" /> Orçamento
                            </Button>
                            <Button variant="secondary" onClick={() => setViewingDoc('REPORT')} className="bg-white/10 border-white/20 text-white hover:bg-white/20 whitespace-nowrap flex-shrink-0">
                                <FileText className="w-4 h-4 mr-2" /> Ordem de Serviço
                            </Button>
                            {request.nfse?.numero && (
                                <Button variant="secondary" onClick={() => setShowDanfe(true)} className="bg-brand-500/40 border-brand-300/50 text-white hover:bg-brand-500/60 whitespace-nowrap flex-shrink-0">
                                    <Receipt className="w-4 h-4 mr-2" /> DANFE
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Tabs */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="flex border-b border-gray-200 overflow-x-auto">
                                <TabButton id="overview" label="Visão Geral" icon={LayoutDashboard} />
                                <TabButton id="services" label="Serviços & Itens" icon={ShoppingCart} />
                                <TabButton id="photos" label="Fotos & Evidências" icon={ImageIcon} />
                                <TabButton id="history" label="Histórico" icon={History} />
                            </div>

                            <div className="p-6">
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Descrição Detalhada</h3>
                                                {(user.cargo === 'admin' || user.cargo === 'super_admin' || user.cargo === 'tecnico') && (
                                                    <button
                                                        onClick={() => {
                                                            if (isEditingDesc) {
                                                                handleSaveDescription();
                                                            } else {
                                                                setEditedDesc(request.descricao_detalhada || '');
                                                                setIsEditingDesc(true);
                                                            }
                                                        }}
                                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                                    >
                                                        {isEditingDesc ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                                        {isEditingDesc ? 'Salvar' : 'Editar'}
                                                    </button>
                                                )}
                                            </div>

                                            {isEditingDesc ? (
                                                <textarea
                                                    value={editedDesc}
                                                    onChange={(e) => setEditedDesc(e.target.value)}
                                                    className="w-full p-4 border border-blue-200 rounded-lg text-gray-700 leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                                                    placeholder="Descreva o problema detalhadamente..."
                                                />
                                            ) : (
                                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                    {request.descricao_detalhada || "Sem descrição detalhada."}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                <h4 className="font-bold text-blue-900 mb-2 flex items-center"><Wrench className="w-4 h-4 mr-2" /> Equipamento(s)</h4>
                                                {quoteItems && quoteItems.length > 0 && quoteItems.some(item => item.equipamento) ? (
                                                    <div className="space-y-2">
                                                        {Array.from(new Map(
                                                            quoteItems
                                                                .filter(item => item.equipamento)
                                                                .map(item => [item.equipamento!.id, item.equipamento!])
                                                        ).values()).map((equip, idx) => (
                                                            <div key={idx} className="text-sm text-blue-800 border-b border-blue-200 last:border-0 pb-1 last:pb-0">
                                                                <p className="font-semibold">{equip.nome || "Equipamento não identificado"}</p>
                                                                <p className="text-xs opacity-80">
                                                                    {equip.marca && <span><strong>Marca:</strong> {equip.marca}</span>}
                                                                    {equip.modelo && <span className="ml-2"><strong>Modelo:</strong> {equip.modelo}</span>}
                                                                </p>
                                                                {(equip as any).numero_serie && (
                                                                    <p className="text-xs opacity-70"><strong>S/N:</strong> {(equip as any).numero_serie}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-blue-800 italic">Nenhum equipamento vinculado.</p>
                                                )}
                                            </div>
                                            <div className="bg-brand-50 p-4 rounded-lg border border-brand-50">
                                                <h4 className="font-bold text-brand-700 mb-2 flex items-center"><MapPin className="w-4 h-4 mr-2" /> Localização</h4>
                                                <p className="text-sm text-brand-600">
                                                    {request.local?.address || "Endereço não cadastrado"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'services' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-gray-900">Itens do Serviço</h3>
                                            <Button size="sm" onClick={() => setIsQuoteModalOpen(true)}>
                                                <PenTool className="w-4 h-4 mr-2" /> Editar Itens / Orçamento
                                            </Button>
                                        </div>

                                        <div className="border rounded-lg overflow-x-auto">
                                            <table className="w-full text-sm text-left min-w-[500px]">
                                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                                    <tr>
                                                        <th className="p-3">Descrição</th>
                                                        <th className="p-3 w-20 text-center">Qtd</th>
                                                        <th className="p-3 w-32 text-right">Unitário</th>
                                                        <th className="p-3 w-32 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {quoteItems.map(item => (
                                                        <tr key={item.id} className="hover:bg-gray-50">
                                                            <td className="p-3">{item.descricao}</td>
                                                            <td className="p-3 text-center">{item.quantidade}</td>
                                                            <td className="p-3 text-right">R$ {(item.valor_unitario || 0).toFixed(2)}</td>
                                                            <td className="p-3 text-right font-bold text-gray-900">R$ {(item.valor_total || 0).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                    {quoteItems.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="p-8 text-center text-gray-400 italic">Nenhum item adicionado.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                <tfoot className="bg-gray-50 font-bold">
                                                    <tr>
                                                        <td colSpan={3} className="p-3 text-right text-gray-600 text-xs uppercase tracking-wide">Subtotal</td>
                                                        <td className="p-3 text-right text-gray-700 font-bold">R$ {calculateNetTotal().toFixed(2)}</td>
                                                    </tr>

                                                    <tr className="bg-gray-100">
                                                        <td colSpan={3} className="p-3 text-right text-gray-800 uppercase text-sm tracking-wide font-bold">Total Final</td>
                                                        <td className="p-3 text-right text-gray-900 text-xl font-black">R$ {calculateGrossTotal().toFixed(2)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'photos' && (
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                            <h4 className="font-bold text-blue-900 mb-4 flex items-center">
                                                <Camera className="w-5 h-5 mr-2" /> Registro de Evidências (Diário de Obra)
                                            </h4>

                                            <div className="flex gap-3 items-start">
                                                <div className="flex-1 space-y-3">
                                                    <textarea
                                                        className="w-full border p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Descreva a atividade realizada..."
                                                        rows={3}
                                                        value={trackingNote}
                                                        onChange={(e) => setTrackingNote(e.target.value)}
                                                    />

                                                    {tempPhotos.length > 0 && (
                                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                                            {tempPhotos.map((photo, i) => {
                                                                const isImg = photo.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i) || photo.startsWith('data:image');
                                                                return (
                                                                    <div key={i} className="relative group flex-shrink-0">
                                                                        {isImg ? (
                                                                            <img src={photo} className="h-20 w-20 object-cover rounded-lg border border-blue-200 shadow-sm" alt="Preview" />
                                                                        ) : (
                                                                            <div className="h-20 w-20 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-blue-200 shadow-sm text-blue-600">
                                                                                <FileText className="w-8 h-8 mb-1" />
                                                                                <span className="text-[9px] uppercase font-bold text-blue-400">DOC</span>
                                                                            </div>
                                                                        )}
                                                                        <button onClick={() => setTempPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition">
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <label className="cursor-pointer bg-white border border-blue-200 text-blue-600 rounded-lg p-3 hover:bg-blue-50 transition shadow-sm flex items-center justify-center h-[50px] w-[50px]">
                                                        {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Paperclip className="w-6 h-6" />}
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                                                            multiple
                                                            onChange={handleTempPhotoUpload}
                                                            disabled={isUploading}
                                                        />
                                                    </label>
                                                    <Button onClick={handleAddTrackingNote} disabled={!trackingNote.trim() && tempPhotos.length === 0} className="h-[50px] w-[50px] p-0 flex items-center justify-center">
                                                        <Send className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Photos Gallery */}
                                        {request.fotos && request.fotos.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {request.fotos.map((foto: any, idx: number) => {
                                                    const url = getImageUrl(foto);
                                                    const isImg = url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i) || url.includes('imgbb.com'); // Simple check

                                                    return (
                                                        <div key={idx} className="aspect-square border rounded-lg overflow-hidden bg-gray-100 shadow-sm relative group">
                                                            {isImg ? (
                                                                <img
                                                                    src={url}
                                                                    alt={`Evidência ${idx + 1}`}
                                                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                                    onClick={() => window.open(url, '_blank')}
                                                                />
                                                            ) : (
                                                                <a href={url} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center hover:bg-gray-200 transition">
                                                                    <FileText className="w-12 h-12 text-gray-400 mb-2" />
                                                                    <span className="text-xs font-semibold text-gray-500 px-2 text-center truncate w-full">Abrir Documento</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center p-12 border-2 border-dashed border-gray-200 rounded-xl">
                                                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500">Nenhuma foto registrada ainda.</p>
                                            </div>
                                        )}

                                        {/* Diário de Atividades - Activity Log */}
                                        {request.historico && Array.isArray(request.historico) &&
                                            request.historico.filter((h: any) => h.descricao?.includes('[Diário de Obra]')).length > 0 && (
                                                <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-4">
                                                    <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                                                        <History className="w-5 h-5 mr-2 text-blue-600" /> Diário de Atividades
                                                    </h4>
                                                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                                        {request.historico
                                                            .filter((h: any) => h.descricao?.includes('[Diário de Obra]'))
                                                            .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
                                                            .map((entry: any, idx: number) => (
                                                                <div key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 group relative">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex-1">
                                                                            <p className="text-sm text-gray-800">
                                                                                {entry.descricao?.replace('[Diário de Obra] ', '')}
                                                                            </p>

                                                                            {/* Inline Photos */}
                                                                            {entry.fotos && Array.isArray(entry.fotos) && entry.fotos.length > 0 && (
                                                                                <div className="mt-3 flex gap-2 flex-wrap">
                                                                                    {entry.fotos.map((foto: string, fotoIdx: number) => (
                                                                                        <img
                                                                                            key={fotoIdx}
                                                                                            src={getImageUrl(foto)}
                                                                                            alt={`Foto ${fotoIdx + 1}`}
                                                                                            className="h-16 w-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75 transition"
                                                                                            onClick={() => window.open(getImageUrl(foto), '_blank')}
                                                                                        />
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                                                                <span className="flex items-center">
                                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                                    {new Date(entry.data).toLocaleString('pt-BR')}
                                                                                </span>
                                                                                <span className="flex items-center">
                                                                                    <UserIcon className="w-3 h-3 mr-1" />
                                                                                    {entry.usuario || 'Sistema'}
                                                                                </span>
                                                                                {entry.fotos && entry.fotos.length > 0 && (
                                                                                    <span className="flex items-center text-blue-600">
                                                                                        <Camera className="w-3 h-3 mr-1" />
                                                                                        {entry.fotos.length} foto(s)
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Linha do Tempo</h3>
                                        {request.historico && Array.isArray(request.historico) ? (
                                            <ServiceTimeline history={request.historico} currentStatus={request.status} />
                                        ) : (
                                            <p className="text-gray-500 italic text-center py-8">Nenhum histórico registrado.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">

                        {/* Actions Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Zap className="w-4 h-4 mr-2 text-yellow-500" /> Ações Rápidas</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setIsScheduleModalOpen(true)} className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition group">
                                    <CalendarCheck className="w-6 h-6 mb-2 text-gray-500 group-hover:text-blue-600" />
                                    <span className="text-xs font-medium text-gray-700">Agendar</span>
                                </button>
                                <button onClick={() => setIsQuoteModalOpen(true)} className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition group">
                                    <PenTool className="w-6 h-6 mb-2 text-gray-500 group-hover:text-blue-600" />
                                    <span className="text-xs font-medium text-gray-700">Editar Orçamento</span>
                                </button>

                                {/* Document Generators */}
                                <button onClick={() => setViewingDoc('QUOTE')} className="flex flex-col items-center justify-center p-3 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 transition group col-span-1">
                                    <FileText className="w-6 h-6 mb-2 text-blue-600" />
                                    <span className="text-xs font-bold text-blue-700">Visualizar Orçamento</span>
                                </button>
                                <button onClick={handleSendWhatsApp} className="flex flex-col items-center justify-center p-3 rounded-lg border border-brand-50 bg-brand-50 hover:bg-brand-50 transition group col-span-1">
                                    <MessageCircle className="w-6 h-6 mb-2 text-brand-500" />
                                    <span className="text-xs font-bold text-brand-600">WhatsApp</span>
                                </button>
                                <button onClick={() => setViewingDoc('REPORT')} className="flex flex-col items-center justify-center p-3 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 transition group col-span-1">
                                    <FileText className="w-6 h-6 mb-2 text-blue-600" />
                                    <span className="text-xs font-bold text-blue-700">Ordem de Serviço</span>
                                </button>

                                {request.nfse?.numero && (
                                    <button onClick={() => setShowDanfe(true)} className="flex flex-col items-center justify-center p-3 rounded-lg border border-brand-50 bg-brand-50 hover:bg-brand-50 transition group col-span-1">
                                        <FileText className="w-6 h-6 mb-2 text-brand-500" />
                                        <span className="text-xs font-bold text-brand-600">DANFE</span>
                                    </button>
                                )}

                                <button onClick={() => setIsWizardOpen(true)} className="flex flex-col items-center justify-center p-3 rounded-lg border border-brand-50 bg-brand-50 hover:bg-brand-50 transition group col-span-2">
                                    <Check className="w-6 h-6 mb-2 text-brand-500" />
                                    <span className="text-xs font-bold text-brand-600">Concluir Serviço</span>
                                </button>

                                {/* Master NFSe Button */}
                                <button
                                    onClick={() => setIsNFSeModalOpen(true)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition group col-span-2 ${request.nfse?.numero
                                        ? 'border-brand-200 bg-brand-50 hover:bg-brand-50'
                                        : 'border-brand-100 bg-brand-50 hover:bg-brand-50'
                                        }`}
                                >
                                    <Receipt className={`w-6 h-6 mb-2 ${request.nfse?.numero ? 'text-brand-500' : 'text-brand-500'}`} />
                                    <span className={`text-xs font-bold ${request.nfse?.numero ? 'text-brand-600' : 'text-brand-600'}`}>
                                        Emitir NFS-e
                                    </span>
                                </button>
                            </div>


                        </div>

                        {/* Client Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center"><UserIcon className="w-4 h-4 mr-2 text-gray-400" /> Cliente</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{request.cliente?.nome}</p>
                                    <p className="text-xs text-gray-500">{request.cliente?.email}</p>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                                    <span>{request.local?.address || "Endereço não informado"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span>{request.cliente?.telefone || "Sem telefone"}</span>
                                </div>
                                <Button variant="secondary" size="sm" className="w-full mt-2 text-xs">
                                    <Navigation className="w-3 h-3 mr-2" /> Ver no Mapa
                                </Button>
                            </div>
                        </div>

                        {/* Technician Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Wrench className="w-4 h-4 mr-2 text-gray-400" /> Responsável</h3>

                            {/* Always show tech / fallbacks */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    {(request.tech?.nome_completo || 'R').charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        {request.tech?.nome_completo || 'Responsável'}
                                    </p>
                                </div>
                            </div>

                            {(user.cargo === 'admin' || user.cargo === 'super_admin' || user.cargo === 'gerente') && (
                                <div>
                                    {!isAssigning ? (
                                        <Button variant="secondary" size="sm" className="w-full" onClick={() => setIsAssigning(true)}>
                                            {request.tech ? 'Alterar Responsável' : 'Atribuir Responsável'}
                                        </Button>
                                    ) : (
                                        <div className="space-y-2 animate-in fade-in">
                                            <select
                                                className="w-full border p-2 rounded text-sm"
                                                value={selectedTech}
                                                onChange={e => setSelectedTech(e.target.value)}
                                            >
                                                <option value="">Selecione...</option>
                                                {technicians.map(t => (
                                                    <option key={t.id} value={t.id}>{t.nome_completo}</option>
                                                ))}
                                            </select>
                                            <div className="flex gap-2">
                                                <Button variant="secondary" size="sm" onClick={() => setIsAssigning(false)} className="flex-1">Cancelar</Button>
                                                <Button size="sm" onClick={handleAssign} disabled={!selectedTech} className="flex-1">Salvar</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Danger Zone */}
                        {(user.cargo === 'admin' || user.cargo === 'super_admin') && (
                            <div className="pt-4 border-t border-gray-200">
                                <button onClick={handleDeleteOS} className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center justify-center w-full">
                                    <Trash2 className="w-3 h-3 mr-1" /> Excluir Solicitação
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {viewingDoc && (
                <ServiceDocument
                    request={{
                        ...request,
                        itens: quoteItems, // Pass local state for immediate updates
                        description: quoteDesc // Pass local description too
                    }}
                    type={viewingDoc}
                    onClose={() => setViewingDoc(null)}
                />
            )}

            {showDanfe && (
                <DocumentoNFSe
                    request={request}
                    onClose={() => setShowDanfe(false)}
                />
            )}

            {console.log('Rendering ServiceDocument with items:', quoteItems)}

            {/* Wizard Component */}
            <ServiceCompletionWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onComplete={handleWizardComplete}
                initialData={{
                    titulo: request.titulo,
                    descricao: request.descricao_detalhada || '',
                    valorTotal: request.valor_total || 0,
                    nfseExistente: Boolean(request.nfse?.numero),
                    solicitacaoId: String(request.id),
                    osDisplayNumber: String(request.sequential_id || request.id),
                    clienteNome: request.cliente?.nome || '',
                    clienteCpfCnpj: request.cliente?.cpf || (request.cliente as any)?.cnpj || '',
                    clienteTelefone: request.cliente?.telefone || '',
                    itensOs: request.itens || []
                }}
                isAdmin={user.cargo === 'admin' || user.cargo === 'prestador'}
                userSignature={user.signature_url || user.signatureUrl}
            />

            {/* Legacy Modal (kept for fallback if needed, or remove completely? Removing to avoid confusion) */}
            {/* ... removed legacy modal ... */}

            <ModalNFSe
                request={request}
                isOpen={isNFSeModalOpen}
                onClose={() => setIsNFSeModalOpen(false)}
                onRefresh={() => onBack()}
            />

            <ModalEditorOrcamento
                isOpen={isQuoteModalOpen}
                onClose={() => setIsQuoteModalOpen(false)}
                items={quoteItems}
                onSave={handleSaveQuote}
                initialDescription={quoteDesc}
                availableEquipments={clientEquipments}
            />

            <ModalAgendamento
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSave={handleUpdateSchedule}
                initialDate={scheduleDate}
            />
        </div>
    );
};
