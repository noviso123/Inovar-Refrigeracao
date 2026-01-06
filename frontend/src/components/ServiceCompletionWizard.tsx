import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Camera, PenTool, CheckCircle, ChevronRight, ChevronLeft, Wand2, Loader2, X, FileText, Paperclip, Send, Ban, Receipt, AlertTriangle, RefreshCw, DollarSign } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Button } from './Botao';
import { CanvasAssinatura } from './CanvasAssinatura';
import { useNotification } from '../contexts/ContextoNotificacao';
import { nfseService, NFSeResult } from '../services/nfseService';


interface Props {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: WizardCompletionData) => Promise<void>;
    initialData?: {
        titulo: string;
        descricao: string;
        clienteTelefone?: string;
        valorTotal?: number;
        nfseExistente?: boolean;
        solicitacaoId?: string;
        osDisplayNumber?: string;
        clienteNome?: string;
        clienteCpfCnpj?: string;
        itensOs?: any[];
    };
    isAdmin?: boolean;
    userSignature?: string | null; // New prop
}

export interface WizardCompletionData {
    technicalReport: string;
    photos: string[];
    techSignature: string | null;
    clientSignature: string | null;
    adminBypass: boolean;
    emitNFSe: boolean;
    nfseData?: {
        descricaoServico: string;
        codigoServico: string;
        valorServico: number;
    };
    nfseResult?: NFSeResult | null;
    paymentConfirmed: boolean;
}

type Step = 'evidence' | 'photos' | 'signatures' | 'review' | 'payment' | 'nfse' | 'nfse_result';

export const ServiceCompletionWizard: React.FC<Props> = ({ isOpen, onClose, onComplete, initialData, isAdmin = false, userSignature }) => {
    const { notify } = useNotification();
    const [step, setStep] = useState<Step>('evidence');

    const handleUseSavedSignature = () => {
        if (userSignature) {
            setTechSignature(userSignature);
            notify('Assinatura salva aplicada!', 'success');
        } else {
            notify('Nenhuma assinatura salva encontrada no perfil.', 'error');
        }
    };
    const [loading, setLoading] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);

    // Data State
    const [technicalReport, setTechnicalReport] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [techSignature, setTechSignature] = useState<string | null>(null);
    const [clientSignature, setClientSignature] = useState<string | null>(null);
    const [adminBypass, setAdminBypass] = useState(false);

    // Payment Confirmation
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);

    // NFSe State
    const [emitNFSe, setEmitNFSe] = useState(true);
    const [nfseDescricao, setNfseDescricao] = useState('');
    const [nfseCodigoServico, setNfseCodigoServico] = useState('');
    const [nfseValor, setNfseValor] = useState(initialData?.valorTotal || 0);
    const [generatingNFSeAI, setGeneratingNFSeAI] = useState(false);
    const [emittingNFSe, setEmittingNFSe] = useState(false);
    const [nfseResult, setNfseResult] = useState<NFSeResult | null>(null);
    const [nfseError, setNfseError] = useState<string | null>(null);

    // Refs for file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    const nfseAlreadyExists = initialData?.nfseExistente;

    // Generate step list based on conditions
    const getSteps = (): Step[] => {
        const baseSteps: Step[] = ['evidence', 'photos'];
        if (!adminBypass) {
            baseSteps.push('signatures');
        }
        baseSteps.push('review', 'payment', 'nfse');
        return baseSteps;
    };

    const steps = getSteps();
    const stepIndex = steps.indexOf(step);

    // Auto-generate NFSe data when reaching NFSe step
    useEffect(() => {
        if (step === 'nfse' && !nfseDescricao && !nfseAlreadyExists) {
            handleGenerateNFSeData();
        }
    }, [step]);

    const handleGenerateReport = async () => {
        setGeneratingAI(true);
        try {
            const osNumber = initialData?.osDisplayNumber || initialData?.solicitacaoId || 'N/A';
            const titulo = initialData?.titulo || 'Manutenção';
            const clienteNome = initialData?.clienteNome || 'Cliente';
            const descricao = initialData?.descricao || '';

            // Local template-based report generation using OS data
            const report = `Ordem de Serviço #${osNumber}

RELATÓRIO TÉCNICO DE SERVIÇO

Cliente: ${clienteNome}
Serviço: ${titulo}

Descrição do Serviço Solicitado:
${descricao || 'Manutenção preventiva/corretiva conforme solicitação do cliente.'}

Procedimentos Executados:
• Inspeção geral do sistema de refrigeração
• Verificação das condições de operação do equipamento
• Limpeza e higienização dos filtros de ar
• Verificação e limpeza do sistema de drenagem
• Medição da pressão do gás refrigerante
• Verificação das conexões elétricas
• Teste de funcionamento geral do sistema

Conclusão:
O equipamento encontra-se em condições normais de funcionamento após o serviço realizado.

Recomendações:
• Realizar manutenção preventiva a cada 3-6 meses
• Efetuar limpeza regular dos filtros (mensal)
• Manter área ao redor da unidade externa desobstruída`;

            setTechnicalReport(report);
            notify('Relatório gerado!', 'success');
        } catch (error) {
            console.error(error);
            const osNumber = initialData?.osDisplayNumber || initialData?.solicitacaoId || 'N/A';
            setTechnicalReport(`Ordem de Serviço #${osNumber}\n\nO serviço foi realizado conforme solicitado. Verificamos todos os componentes do sistema de refrigeração, realizamos a limpeza dos filtros e a medição da pressão do gás refrigerante. O equipamento encontra-se em perfeito estado de funcionamento.`);
            notify('Relatório gerado.', 'success');
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleGenerateNFSeData = async () => {
        setGeneratingNFSeAI(true);
        try {
            const osNumber = initialData?.osDisplayNumber || initialData?.solicitacaoId || 'N/A';
            const titulo = initialData?.titulo || 'Manutenção em Ar Condicionado';
            const valor = nfseValor.toFixed(2);

            // Local template-based NFSe data generation
            const descricao = `Ref. OS #${osNumber} - Serviço de manutenção em equipamento de refrigeração: ${titulo}. Valor: R$ ${valor}`;

            setNfseDescricao(descricao);
            setNfseCodigoServico('14.01'); // CNAE padrão para manutenção de ar condicionado

            notify('Dados da NFSe preenchidos!', 'success');
        } catch (error) {
            console.error(error);
            const osNumber = initialData?.osDisplayNumber || initialData?.solicitacaoId || 'N/A';
            setNfseDescricao(`Ref. OS #${osNumber} - Serviço de manutenção em equipamento de refrigeração - ${initialData?.titulo || ''}`);
            setNfseCodigoServico('14.01');
        } finally {
            setGeneratingNFSeAI(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setLoading(true); // Reuse loading state for upload spinner

            try {
                const { uploadFile } = await import('../services/uploadService');
                const uploadPromises = files.map(file => uploadFile(file, 'completion-evidence'));
                const urls = await Promise.all(uploadPromises);

                setPhotos(prev => [...prev, ...urls]);
                notify('Foto(s) enviada(s) com sucesso!', 'success');
            } catch (error) {
                console.error(error);
                notify('Erro ao enviar fotos. Tente novamente.', 'error');
            } finally {
                setLoading(false);
                // Reset input
                e.target.value = '';
            }
        }
    };

    const handleNext = () => {
        const currentSteps = getSteps();
        const currentIndex = currentSteps.indexOf(step);
        if (currentIndex < currentSteps.length - 1) {
            setStep(currentSteps[currentIndex + 1]);
        }
    };

    const handlePrev = () => {
        const currentSteps = getSteps();
        const currentIndex = currentSteps.indexOf(step);
        if (currentIndex > 0) {
            setStep(currentSteps[currentIndex - 1]);
        }
    };

    const handleEmitNFSe = async () => {
        if (!initialData?.solicitacaoId) {
            setNfseError('ID da solicitação não encontrado.');
            return;
        }

        setEmittingNFSe(true);
        setNfseError(null);

        try {
            const result = await nfseService.emit(initialData.solicitacaoId, {
                descricaoServico: nfseDescricao,
                codigoServico: nfseCodigoServico,
                valorServico: nfseValor
            });

            setNfseResult(result.nfse);
            setStep('nfse_result');
            notify(`NFS-e emitida com sucesso! Número: ${result.nfse.numero}`, 'success');
        } catch (error: any) {
            console.error('Erro ao emitir NFSe:', error);
            setNfseError(error.response?.data?.error || error.message || 'Erro ao emitir NFS-e. Tente novamente.');
            setStep('nfse_result');
        } finally {
            setEmittingNFSe(false);
        }
    };

    const handleFinish = async (skipNFSe = false) => {
        // Validate signatures if not admin bypass
        if (!adminBypass && (!techSignature || !clientSignature)) {
            notify('Assinaturas são obrigatórias (ou use Conclusão Administrativa).', 'error');
            setStep('signatures');
            return;
        }

        // Validate payment confirmation if emitting NFSe
        if (emitNFSe && !skipNFSe && !paymentConfirmed) {
            notify('Confirme o recebimento do pagamento antes de emitir a nota.', 'error');
            setStep('payment');
            return;
        }

        setLoading(true);
        try {
            const completionData: WizardCompletionData = {
                technicalReport,
                photos,
                techSignature,
                clientSignature,
                adminBypass,
                emitNFSe: emitNFSe && !skipNFSe,
                paymentConfirmed,
                nfseData: emitNFSe && !skipNFSe ? {
                    descricaoServico: nfseDescricao,
                    codigoServico: nfseCodigoServico,
                    valorServico: nfseValor
                } : undefined,
                nfseResult: nfseResult
            };

            await onComplete(completionData);
            notify('Serviço finalizado com sucesso!', 'success');
            onClose();
        } catch (error) {
            console.error(error);
            notify('Erro ao finalizar serviço.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRetryEmission = () => {
        setNfseError(null);
        setNfseResult(null);
        setStep('nfse');
    };

    const handleSignatureSave = async (base64: string, type: 'tech' | 'client') => {
        setLoading(true);
        try {
            // Convert Base64 to File
            const res = await fetch(base64);
            const blob = await res.blob();
            const filename = `signature_${type}_${Date.now()}.png`;
            const file = new File([blob], filename, { type: 'image/png' });

            // Upload
            const { uploadFile } = await import('../services/uploadService');
            const url = await uploadFile(file, 'signatures');

            if (type === 'tech') setTechSignature(url);
            else setClientSignature(url);

            notify('Assinatura salva e enviada!', 'success');
        } catch (error) {
            console.error(error);
            notify('Erro ao salvar assinatura.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useBodyScrollLock(isOpen);

    if (!isOpen) return null;



    return ReactDOM.createPortal(
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
                    <CheckCircle className="w-5 h-5 text-brand-500" />
                    <h2 className="text-lg font-bold text-surface-800">Finalizar Serviço</h2>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="flex bg-surface-100 h-1 shrink-0">
                {steps.map((s, i) => (
                    <div
                        key={s}
                        className={`flex-1 transition-all duration-500 ${i <= stepIndex ? 'bg-brand-500' : 'bg-transparent'}`}
                    />
                ))}
            </div>

            {/* Content - fills all remaining space */}
            <div className="flex-1 overflow-y-auto p-4 bg-surface-50">
                <div className="max-w-2xl mx-auto">

                    {/* Step 1: Evidence */}
                    {step === 'evidence' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-surface-800">1. Relatório Técnico</h3>
                                    <p className="text-surface-500 text-sm">Descreva o serviço realizado.</p>
                                </div>
                                <button
                                    onClick={handleGenerateReport}
                                    disabled={generatingAI}
                                    className="bg-brand-50 text-brand-600 px-3 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-brand-100 transition-colors disabled:opacity-50"
                                >
                                    {generatingAI ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
                                    <span className="hidden sm:inline">Gerar com IA</span>
                                    <span className="sm:hidden">IA</span>
                                </button>
                            </div>

                            <div className="card p-1">
                                <textarea
                                    value={technicalReport}
                                    onChange={e => setTechnicalReport(e.target.value)}
                                    className="w-full h-64 p-4 border-0 rounded-lg focus:ring-0 text-surface-700 leading-relaxed resize-none bg-transparent"
                                    placeholder="Ex: Realizada limpeza dos filtros, verificação de gás, teste de funcionamento..."
                                />
                                <div className="px-4 pb-2 text-right text-xs text-surface-400">
                                    {technicalReport.length} caracteres
                                </div>
                            </div>

                            <div className="flex gap-2 text-xs text-surface-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <p>O número da OS será adicionado automaticamente ao início do relatório.</p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Photos */}
                    {step === 'photos' && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-surface-800">2. Evidências</h3>
                            <p className="text-surface-500 text-sm">Adicione fotos ou documentos do serviço (opcional).</p>

                            <div className="grid grid-cols-3 gap-4">
                                {photos.map((photo, idx) => {
                                    const isImg = photo.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i) || photo.startsWith('data:image') || photo.includes('imgbb.com');
                                    return (
                                        <div key={idx} className="aspect-square bg-surface-100 rounded-xl overflow-hidden relative group shadow-sm border border-surface-200">
                                            {isImg ? (
                                                <img src={photo} className="w-full h-full object-cover" alt={`Foto ${idx + 1}`} />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-surface-400">
                                                    <FileText className="w-8 h-8 mb-2" />
                                                    <span className="text-[10px] font-bold uppercase">Documento</span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square bg-surface-50 border-2 border-dashed border-surface-300 rounded-xl flex flex-col items-center justify-center text-surface-400 hover:bg-surface-100 hover:border-brand-500 hover:text-brand-500 transition-all"
                                >
                                    <Paperclip className="w-8 h-8 mb-2" />
                                    <span className="text-xs font-bold text-center px-2">Adicionar Arquivo</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                                    onChange={handlePhotoUpload}
                                    multiple
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Signatures */}
                    {step === 'signatures' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-surface-800">3. Assinaturas</h3>
                                {isAdmin && (
                                    <button
                                        onClick={() => {
                                            setAdminBypass(true);
                                            handleNext();
                                        }}
                                        className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full font-bold hover:bg-yellow-200 transition"
                                    >
                                        Conclusão Administrativa →
                                    </button>
                                )}
                            </div>

                            <div className="card p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="label mb-0">Técnico Responsável</label>
                                    {userSignature && !techSignature && (
                                        <button
                                            onClick={handleUseSavedSignature}
                                            className="text-xs text-brand-600 font-medium hover:text-brand-800 flex items-center gap-1"
                                        >
                                            <PenTool className="w-3 h-3" />
                                            Usar Minha Assinatura
                                        </button>
                                    )}
                                </div>
                                <div className="border border-surface-200 rounded-xl overflow-hidden bg-surface-50">
                                    <CanvasAssinatura
                                        onSave={(data) => handleSignatureSave(data, 'tech')}
                                        initialImage={techSignature || undefined}
                                    />
                                </div>
                                {techSignature && <p className="text-xs text-brand-600 mt-2 flex items-center font-medium"><CheckCircle className="w-3 h-3 mr-1" /> Assinado</p>}
                            </div>

                            <div className="card p-4">
                                <label className="label mb-2">Cliente</label>
                                <div className="border border-surface-200 rounded-xl overflow-hidden bg-surface-50">
                                    <CanvasAssinatura onSave={(data) => handleSignatureSave(data, 'client')} />
                                </div>
                                {clientSignature && <p className="text-xs text-brand-600 mt-2 flex items-center font-medium"><CheckCircle className="w-3 h-3 mr-1" /> Assinado</p>}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review */}
                    {step === 'review' && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-surface-800">{adminBypass ? '3' : '4'}. Revisão Final</h3>

                            <div className="card p-6 space-y-3 text-sm">
                                <p><span className="font-bold text-surface-700">Relatório:</span> <span className="text-surface-600">{technicalReport ? technicalReport.substring(0, 150) + '...' : 'Não informado'}</span></p>
                                <p><span className="font-bold text-surface-700">Fotos:</span> <span className="text-surface-600">{photos.length} anexadas</span></p>
                                <p><span className="font-bold text-surface-700">Assinaturas:</span> {adminBypass ? <span className="text-yellow-600 font-bold">⚠️ Conclusão Administrativa</span> : (techSignature && clientSignature ? <span className="text-green-600 font-bold">✅ Completas</span> : <span className="text-red-500 font-bold">❌ Pendentes</span>)}</p>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-blue-800 text-sm font-medium">
                                    Nos próximos passos você poderá confirmar o pagamento e emitir a NFS-e.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Payment Confirmation */}
                    {step === 'payment' && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-surface-800 flex items-center">
                                <DollarSign className="w-5 h-5 mr-2 text-brand-500" />
                                {adminBypass ? '4' : '5'}. Pagamento
                            </h3>

                            <div className="card p-8 text-center bg-surface-50 border-surface-200">
                                <p className="text-4xl font-bold text-surface-900 mb-2">R$ {nfseValor.toFixed(2)}</p>
                                <p className="text-surface-500 text-sm">Valor total do serviço</p>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                <p className="text-yellow-800 text-sm flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span><strong>Importante:</strong> Confirme que o pagamento foi recebido antes de emitir a nota fiscal.</span>
                                </p>
                            </div>

                            <label className="card p-4 flex items-center cursor-pointer hover:border-brand-500 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={paymentConfirmed}
                                    onChange={e => setPaymentConfirmed(e.target.checked)}
                                    className="w-5 h-5 text-brand-500 rounded border-surface-300 focus:ring-brand-500 mr-4"
                                />
                                <div>
                                    <p className="font-bold text-surface-800">Confirmo o recebimento</p>
                                    <p className="text-sm text-surface-500">O valor foi recebido corretamente.</p>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Step 6: NFSe Emission */}
                    {step === 'nfse' && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-surface-800 flex items-center">
                                <Receipt className="w-5 h-5 mr-2 text-brand-500" />
                                {adminBypass ? '5' : '6'}. Emissão de NFS-e
                            </h3>

                            {nfseAlreadyExists ? (
                                <div className="bg-brand-50 p-6 rounded-xl border border-brand-200 text-center">
                                    <CheckCircle className="w-12 h-12 mx-auto text-brand-500 mb-3" />
                                    <p className="text-brand-700 font-bold">NFS-e já emitida</p>
                                    <p className="text-brand-600 text-sm mt-1">Não é possível emitir outra nota para esta OS.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-4 mb-4">
                                        <button
                                            onClick={() => setEmitNFSe(true)}
                                            className={`flex-1 p-4 rounded-xl border-2 transition-all ${emitNFSe ? 'border-brand-500 bg-brand-50' : 'border-surface-200 hover:border-surface-300 bg-white'}`}
                                        >
                                            <Receipt className={`w-8 h-8 mx-auto mb-2 ${emitNFSe ? 'text-brand-500' : 'text-surface-400'}`} />
                                            <p className={`font-bold ${emitNFSe ? 'text-brand-700' : 'text-surface-600'}`}>Emitir NFS-e</p>
                                        </button>
                                        <button
                                            onClick={() => setEmitNFSe(false)}
                                            className={`flex-1 p-4 rounded-xl border-2 transition-all ${!emitNFSe ? 'border-orange-500 bg-orange-50' : 'border-surface-200 hover:border-surface-300 bg-white'}`}
                                        >
                                            <Ban className={`w-8 h-8 mx-auto mb-2 ${!emitNFSe ? 'text-orange-600' : 'text-surface-400'}`} />
                                            <p className={`font-bold ${!emitNFSe ? 'text-orange-700' : 'text-surface-600'}`}>Não Emitir</p>
                                        </button>
                                    </div>

                                    {emitNFSe && (
                                        <div className="card p-4 space-y-4 animate-slide-up">
                                            <div className="flex justify-between items-center">
                                                <label className="label">Descrição do Serviço</label>
                                                <button
                                                    onClick={handleGenerateNFSeData}
                                                    disabled={generatingNFSeAI}
                                                    className="text-xs bg-brand-50 text-brand-600 px-2 py-1 rounded-full flex items-center hover:bg-brand-100 transition-colors"
                                                >
                                                    {generatingNFSeAI ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wand2 className="w-3 h-3 mr-1" />}
                                                    IA
                                                </button>
                                            </div>
                                            <textarea
                                                value={nfseDescricao}
                                                onChange={e => setNfseDescricao(e.target.value)}
                                                className="input w-full h-24"
                                                placeholder="Descrição do serviço para a nota fiscal..."
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="label">Código do Serviço</label>
                                                    <input
                                                        type="text"
                                                        value={nfseCodigoServico}
                                                        onChange={e => setNfseCodigoServico(e.target.value)}
                                                        className="input w-full"
                                                        placeholder="Ex: 14.01"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="label">Valor (R$)</label>
                                                    <input
                                                        type="number"
                                                        value={nfseValor}
                                                        onChange={e => setNfseValor(parseFloat(e.target.value) || 0)}
                                                        className="input w-full"
                                                    />
                                                </div>
                                            </div>

                                            {!paymentConfirmed && (
                                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-800 flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                                    Pagamento não confirmado. Volte e confirme antes de emitir.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 7: NFSe Result */}
                    {step === 'nfse_result' && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-surface-800 flex items-center">
                                <Receipt className="w-5 h-5 mr-2 text-brand-500" />
                                Resultado da Emissão
                            </h3>

                            {nfseResult ? (
                                <div className="bg-brand-50 p-6 rounded-xl border border-brand-200">
                                    <CheckCircle className="w-16 h-16 mx-auto text-brand-500 mb-4" />
                                    <h4 className="text-xl font-bold text-center text-brand-700 mb-4">NFS-e Emitida com Sucesso!</h4>

                                    <div className="bg-white p-4 rounded-xl space-y-2 text-sm shadow-sm">
                                        <p><span className="font-bold text-surface-700">Número:</span> {nfseResult.numero}</p>
                                        <p><span className="font-bold text-surface-700">Código Verificação:</span> {nfseResult.codigo_verificacao}</p>
                                        <p><span className="font-bold text-surface-700">Data de Emissão:</span> {new Date(nfseResult.data_emissao).toLocaleString('pt-BR')}</p>
                                        <p><span className="font-bold text-surface-700">Status:</span> <span className="text-brand-600 font-bold uppercase">{nfseResult.status}</span></p>
                                    </div>

                                    <div className="mt-4 text-center text-sm text-brand-600">
                                        A nota foi armazenada e será enviada ao cliente via WhatsApp.
                                    </div>
                                </div>
                            ) : nfseError ? (
                                <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                                    <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                                    <h4 className="text-xl font-bold text-center text-red-800 mb-4">Erro na Emissão</h4>

                                    <div className="bg-white p-4 rounded-xl text-sm text-red-700 shadow-sm">
                                        {nfseError}
                                    </div>

                                    <div className="mt-4 flex gap-2 justify-center">
                                        <Button onClick={handleRetryEmission} variant="secondary">
                                            <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
                                        </Button>
                                        <Button onClick={() => handleFinish(true)} variant="secondary" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                                            Continuar Sem Nota
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto" />
                                    <p className="mt-4 text-surface-500">Processando emissão...</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-surface-200 flex justify-between items-center bg-white shrink-0">
                {stepIndex > 0 && step !== 'nfse_result' ? (
                    <Button variant="secondary" onClick={handlePrev}>
                        <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                ) : <div></div>}

                {step === 'nfse' && !nfseAlreadyExists ? (
                    <div className="flex gap-2">
                        {!emitNFSe ? (
                            <Button onClick={() => handleFinish(true)} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                                Concluir Sem Nota
                            </Button>
                        ) : (
                            <Button onClick={handleEmitNFSe} disabled={emittingNFSe || !paymentConfirmed} className="bg-brand-500 hover:bg-brand-600 text-white">
                                {emittingNFSe ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Receipt className="w-4 h-4 mr-2" />}
                                Emitir NFS-e
                            </Button>
                        )}
                    </div>
                ) : step === 'nfse_result' && nfseResult ? (
                    <Button onClick={() => handleFinish(false)} disabled={loading} className="bg-brand-500 hover:bg-brand-600 text-white">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Finalizar e Enviar
                    </Button>
                ) : step !== 'nfse' && step !== 'nfse_result' ? (
                    <Button onClick={handleNext}>
                        Próximo <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : nfseAlreadyExists ? (
                    <Button onClick={() => handleFinish(true)} disabled={loading} className="bg-brand-500 hover:bg-brand-600 text-white">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Finalizar Serviço
                    </Button>
                ) : null}
            </div>
        </div>,
        document.body
    );
};
