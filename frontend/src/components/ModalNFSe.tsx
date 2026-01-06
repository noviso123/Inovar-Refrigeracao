import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { SolicitacaoServico } from '../types';
import { useNotification } from '../contexts/ContextoNotificacao';
import { Button } from './Botao';
import { Check, FileText, AlertTriangle, Loader2, Wand2, MessageCircle, Ban, Send, X } from 'lucide-react';
import { DocumentoNFSe } from './DocumentoNFSe';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import api from '../services/api';

interface Props {
    request: SolicitacaoServico;
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

type Tab = 'status' | 'emit' | 'send' | 'cancel';

export const ModalNFSe: React.FC<Props> = ({ request, isOpen, onClose, onRefresh }) => {
    const { notify } = useNotification();
    const [activeTab, setActiveTab] = useState<Tab>('status');
    const [loading, setLoading] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [showDanfe, setShowDanfe] = useState(false);

    const nfse = request.nfse;
    const hasNFSe = !!nfse;

    const [value, setValue] = useState(request.valor_total || 0);
    const [serviceCode, setServiceCode] = useState<string>('14.01');
    const [description, setDescription] = useState('');
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        if (isOpen) {
            setValue(request.valor_total || 0);
            setDescription(`Serviço de manutenção - OS #${request.numero}`);
        }
    }, [isOpen, request]);

    const handleGenerateDescription = async () => {
        setGeneratingAI(true);
        try {
            // Mock AI generation
            await new Promise(resolve => setTimeout(resolve, 1000));
            setDescription("Serviço de manutenção preventiva e corretiva em sistema de refrigeração.");
            notify('Descrição gerada com sucesso!', 'success');
        } catch (error) {
            notify('Erro ao gerar descrição.', 'error');
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleEmit = async () => {
        setLoading(true);
        try {
            const response = await api.post('/nfse/emit', {
                solicitacaoId: request.id,
                nfseData: {
                    valorServico: value,
                    codigoServico: serviceCode,
                    descricaoServico: description
                }
            });

            if (response.data.success) {
                notify('NFS-e emitida com sucesso!', 'success');
                onRefresh();
                setActiveTab('status');
            } else {
                throw new Error(response.data.error || 'Erro ao emitir');
            }
        } catch (error: any) {
            console.error('Erro ao emitir NFSe:', error);
            notify(error.response?.data?.error || error.message || 'Erro ao emitir NFS-e.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendWhatsApp = async () => {
        if (!request.clientes?.telefone) {
            notify('Cliente sem telefone cadastrado.', 'error');
            return;
        }

        setLoading(true);
        try {
            const phone = request.clientes.telefone.replace(/\D/g, '');
            const message = encodeURIComponent(`Olá ${request.clientes.nome}! Segue os dados da sua NFS-e #${nfse?.numero}.\n\nCódigo de Verificação: ${nfse?.codigo_verificacao}\nValor: R$ ${request.valor_total?.toFixed(2)}`);
            window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
            notify('WhatsApp aberto!', 'success');
        } catch (error) {
            notify('Erro ao abrir WhatsApp.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason) {
            notify('Informe o motivo do cancelamento.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/nfse/cancel', {
                nfseId: nfse?.id,
                motivo: cancelReason
            });

            if (response.data.success) {
                notify('NFS-e cancelada com sucesso!', 'success');
                onRefresh();
                setActiveTab('status');
            } else {
                throw new Error(response.data.error || 'Erro ao cancelar');
            }
        } catch (error: any) {
            console.error('Erro ao cancelar NFSe:', error);
            notify(error.response?.data?.error || error.message || 'Erro ao cancelar NFS-e.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useBodyScrollLock(isOpen);

    if (!isOpen) return null;


    return ReactDOM.createPortal(
        <>
            {showDanfe && (
                <DocumentoNFSe
                    request={request}
                    onClose={() => setShowDanfe(false)}
                />
            )}

            <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-surface-200 flex items-center gap-3 bg-white shrink-0">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-surface-100 rounded-xl transition-colors text-surface-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-brand-500" />
                        <h2 className="text-lg font-bold text-surface-800">Gestão de NFS-e</h2>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-surface-200 overflow-x-auto shrink-0 bg-white">
                    <button
                        onClick={() => setActiveTab('status')}
                        className={`flex-1 min-w-max p-4 text-sm font-medium transition-all relative ${activeTab === 'status' ? 'text-brand-600' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'}`}
                    >
                        Status
                        {activeTab === 'status' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('emit')}
                        className={`flex-1 min-w-max p-4 text-sm font-medium transition-all relative ${activeTab === 'emit' ? 'text-brand-600' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'}`}
                    >
                        Emitir
                        {activeTab === 'emit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('send')}
                        className={`flex-1 min-w-max p-4 text-sm font-medium transition-all relative ${activeTab === 'send' ? 'text-brand-600' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'}`}
                    >
                        Enviar
                        {activeTab === 'send' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('cancel')}
                        className={`flex-1 min-w-max p-4 text-sm font-medium transition-all relative ${activeTab === 'cancel' ? 'text-brand-600' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'}`}
                    >
                        Cancelar
                        {activeTab === 'cancel' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-t-full" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-surface-50/50">
                    {/* Status Tab */}
                    {activeTab === 'status' && (
                        <div className="space-y-4 animate-fade-in">
                            {hasNFSe ? (
                                <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
                                    <div className="text-center mb-6">
                                        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Check className="w-8 h-8 text-brand-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-surface-800">NFS-e Emitida</h3>
                                        <p className="text-surface-500 text-sm">A nota fiscal foi processada com sucesso.</p>
                                    </div>

                                    <div className="bg-surface-50 p-4 rounded-xl space-y-3 text-sm border border-surface-100">
                                        <div className="flex justify-between items-center py-1 border-b border-surface-200/50 last:border-0">
                                            <span className="text-surface-500">Número</span>
                                            <span className="font-bold text-lg text-surface-900">{nfse?.numero}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-surface-200/50 last:border-0">
                                            <span className="text-surface-500">Código Verificação</span>
                                            <span className="font-mono text-surface-700 bg-surface-200 px-2 py-0.5 rounded text-xs">{nfse?.codigo_verificacao || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-surface-200/50 last:border-0">
                                            <span className="text-surface-500">Data Emissão</span>
                                            <span className="text-surface-700 font-medium">{nfse?.data_emissao ? new Date(nfse.data_emissao).toLocaleString('pt-BR') : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-surface-200/50 last:border-0">
                                            <span className="text-surface-500">Status</span>
                                            <span className={`font-bold uppercase px-2 py-0.5 rounded text-xs ${nfse?.status === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {nfse?.status || 'Emitida'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-surface-200/50 last:border-0">
                                            <span className="text-surface-500">Valor Total</span>
                                            <span className="font-bold text-brand-600">R$ {(request.valor_total || 0).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <Button onClick={() => setShowDanfe(true)} fullWidth>
                                            <FileText className="w-4 h-4 mr-2" /> Visualizar DANFE
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="card p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                                    <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="w-10 h-10 text-surface-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-surface-700 mb-2">Nenhuma NFS-e Emitida</h3>
                                    <p className="text-surface-500 text-sm mb-6 max-w-xs mx-auto">Esta solicitação ainda não possui uma nota fiscal emitida. Clique abaixo para gerar.</p>
                                    <Button onClick={() => setActiveTab('emit')}>
                                        <FileText className="w-4 h-4 mr-2" /> Emitir NFS-e Agora
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Emit Tab */}
                    {activeTab === 'emit' && (
                        <div className="space-y-4 animate-fade-in">
                            {hasNFSe ? (
                                <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 text-center">
                                    <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
                                    <p className="text-yellow-800 font-bold text-lg">NFS-e já emitida</p>
                                    <p className="text-yellow-700 text-sm mt-1">Não é possível emitir outra nota para esta OS.</p>
                                    <Button variant="secondary" onClick={() => setActiveTab('status')} className="mt-4">
                                        Ver Status
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                                        <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-800">
                                            <p className="font-bold">Confira os dados antes de emitir.</p>
                                            <p className="opacity-90">A nota será registrada na prefeitura e enviada automaticamente ao cliente.</p>
                                        </div>
                                    </div>

                                    <div className="card p-4 sm:p-6 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Tomador (Cliente)</label>
                                                <div className="p-3 bg-surface-50 rounded-lg border border-surface-200 text-sm">
                                                    <p className="font-bold text-surface-800">{request.clientes?.nome}</p>
                                                    <p className="text-surface-500 text-xs mt-1">CPF/CNPJ: {request.clientes?.cpf || request.clientes?.cnpj || 'Não informado'}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label">Valor (R$)</label>
                                                <input
                                                    type="number"
                                                    value={value}
                                                    onChange={e => setValue(parseFloat(e.target.value))}
                                                    className="input w-full font-bold text-surface-900"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="label">Código de Serviço (LC 116)</label>
                                            <select
                                                value={serviceCode}
                                                onChange={e => setServiceCode(e.target.value)}
                                                className="input w-full"
                                            >
                                                <option value="14.01">14.01 - Lubrificação, limpeza, lustração, revisão</option>
                                                <option value="14.02">14.02 - Assistência técnica</option>
                                                <option value="14.06">14.06 - Instalação e montagem de aparelhos</option>
                                            </select>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="label mb-0">Discriminação do Serviço</label>
                                                <button
                                                    onClick={handleGenerateDescription}
                                                    disabled={generatingAI}
                                                    className="text-xs bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full flex items-center hover:bg-brand-100 transition-colors font-medium"
                                                >
                                                    {generatingAI ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Wand2 className="w-3 h-3 mr-1.5" />}
                                                    Gerar com IA
                                                </button>
                                            </div>
                                            <textarea
                                                value={description}
                                                onChange={e => setDescription(e.target.value)}
                                                rows={4}
                                                className="input w-full"
                                                placeholder="Descreva o serviço realizado..."
                                            />
                                        </div>

                                        <Button onClick={handleEmit} disabled={loading} fullWidth>
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                            Confirmar Emissão
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Send Tab */}
                    {activeTab === 'send' && (
                        <div className="space-y-4 animate-fade-in">
                            {hasNFSe ? (
                                <>
                                    <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                                        <p className="text-brand-700 font-bold flex items-center gap-2">
                                            <MessageCircle className="w-5 h-5" />
                                            Enviar NFS-e por WhatsApp
                                        </p>
                                        <p className="text-brand-600 text-sm mt-1 ml-7">O cliente receberá os dados da nota fiscal e o link do PDF.</p>
                                    </div>

                                    <div className="card p-4">
                                        <p className="label mb-2">Destinatário</p>
                                        <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg border border-surface-200">
                                            <div className="w-10 h-10 bg-surface-200 rounded-full flex items-center justify-center text-surface-500 font-bold">
                                                {request.clientes?.nome?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-surface-800 text-sm">{request.clientes?.nome}</p>
                                                <p className="text-surface-500 text-xs">{request.clientes?.telefone || 'Sem telefone cadastrado'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card p-4">
                                        <p className="label mb-2">Preview da mensagem</p>
                                        <div className="bg-surface-50 p-4 rounded-lg border border-surface-200">
                                            <pre className="text-xs text-surface-600 whitespace-pre-wrap font-sans leading-relaxed">
                                                {`📄 *NOTA FISCAL DE SERVIÇO*\n\nNúmero: ${nfse?.numero}\nCódigo Verificação: ${nfse?.codigo_verificacao || 'N/A'}\nData Emissão: ${nfse?.data_emissao ? new Date(nfse.data_emissao).toLocaleDateString('pt-BR') : 'N/A'}\nValor: R$ ${(request.valor_total || 0).toFixed(2)}\n\nStatus: ${nfse?.status?.toUpperCase() || 'EMITIDA'}`}
                                            </pre>
                                        </div>
                                    </div>

                                    <Button onClick={handleSendWhatsApp} disabled={loading || !request.clientes?.telefone} fullWidth>
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                        Enviar via WhatsApp
                                    </Button>
                                </>
                            ) : (
                                <div className="card p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                                    <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mb-4">
                                        <MessageCircle className="w-10 h-10 text-surface-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-surface-700 mb-2">Emissão Necessária</h3>
                                    <p className="text-surface-500 text-sm mb-6 max-w-xs mx-auto">Você precisa emitir a nota fiscal antes de enviá-la ao cliente.</p>
                                    <Button onClick={() => setActiveTab('emit')}>
                                        Ir para Emissão
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cancel Tab */}
                    {activeTab === 'cancel' && (
                        <div className="space-y-4 animate-fade-in">
                            {hasNFSe && nfse?.status !== 'cancelada' ? (
                                <>
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex gap-3 items-start">
                                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-red-800 font-bold">Atenção: Esta ação é irreversível.</p>
                                            <p className="text-red-700 text-sm mt-1">A NFS-e será cancelada junto à prefeitura e não terá mais validade fiscal.</p>
                                        </div>
                                    </div>

                                    <div className="card p-4 sm:p-6">
                                        <label className="label">Motivo do Cancelamento <span className="text-red-500">*</span></label>
                                        <textarea
                                            value={cancelReason}
                                            onChange={e => setCancelReason(e.target.value)}
                                            rows={4}
                                            className="input w-full"
                                            placeholder="Descreva o motivo do cancelamento (ex: Erro na emissão, serviço não realizado)..."
                                        />

                                        <div className="mt-6">
                                            <Button onClick={handleCancel} disabled={loading} fullWidth className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500">
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                                                Confirmar Cancelamento
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : nfse?.status === 'cancelada' ? (
                                <div className="bg-surface-50 p-8 rounded-xl border border-surface-200 text-center">
                                    <Ban className="w-16 h-16 mx-auto text-surface-400 mb-4" />
                                    <h3 className="text-lg font-bold text-surface-600 mb-2">NFS-e Cancelada</h3>
                                    <p className="text-surface-500 text-sm">Esta nota fiscal já foi cancelada anteriormente.</p>
                                </div>
                            ) : (
                                <div className="card p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                                    <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mb-4">
                                        <Ban className="w-10 h-10 text-surface-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-surface-700 mb-2">Nada para Cancelar</h3>
                                    <p className="text-surface-500 text-sm mb-6 max-w-xs mx-auto">Não há nota fiscal ativa para ser cancelada nesta solicitação.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-surface-200 flex justify-end gap-3 bg-white shrink-0">
                    <Button variant="secondary" onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </>,
        document.body
    );
};
