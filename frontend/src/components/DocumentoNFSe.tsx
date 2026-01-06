import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { SolicitacaoServico, Empresa } from '../types';
import { formatarData, formatAddress, maskCNPJ, maskCPF, maskPhone } from '../utils/formatadores';
import { FileText, Printer, Download, X, MessageCircle, QrCode, ArrowLeft, Loader2, Building2, User } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { useNotification } from '../contexts/ContextoNotificacao';
import { whatsappBrain } from '../services/whatsappBrain';
import api from '../services/api';

interface Props {
    request: SolicitacaoServico;
    onClose: () => void;
}

// Configuração de tributação padrão para NFS-e Nacional 2026
interface TaxConfig {
    issAliquota: number;
    pisAliquota: number;
    cofinsAliquota: number;
    csllAliquota: number;
    irrfAliquota: number;
    inssAliquota: number;
    ibsAliquota: number;
    cbsAliquota: number;
    ibptCargaTributaria: number;
    regimeTributario: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei';
}

const getDefaultTaxConfig = (regime: string = 'simples_nacional'): TaxConfig => {
    switch (regime) {
        case 'mei':
            return {
                issAliquota: 0,
                pisAliquota: 0,
                cofinsAliquota: 0,
                csllAliquota: 0,
                irrfAliquota: 0,
                inssAliquota: 0,
                ibsAliquota: 0,
                cbsAliquota: 0,
                ibptCargaTributaria: 0.0845,
                regimeTributario: 'mei'
            };
        case 'simples_nacional':
            return {
                issAliquota: 0.02,
                pisAliquota: 0,
                cofinsAliquota: 0,
                csllAliquota: 0,
                irrfAliquota: 0,
                inssAliquota: 0,
                ibsAliquota: 0.01,
                cbsAliquota: 0.01,
                ibptCargaTributaria: 0.1345,
                regimeTributario: 'simples_nacional'
            };
        case 'lucro_presumido':
            return {
                issAliquota: 0.05,
                pisAliquota: 0.0065,
                cofinsAliquota: 0.03,
                csllAliquota: 0.01,
                irrfAliquota: 0.015,
                inssAliquota: 0.11,
                ibsAliquota: 0.01,
                cbsAliquota: 0.01,
                ibptCargaTributaria: 0.2033,
                regimeTributario: 'lucro_presumido'
            };
        case 'lucro_real':
            return {
                issAliquota: 0.05,
                pisAliquota: 0.0165,
                cofinsAliquota: 0.076,
                csllAliquota: 0.01,
                irrfAliquota: 0.015,
                inssAliquota: 0.11,
                ibsAliquota: 0.01,
                cbsAliquota: 0.01,
                ibptCargaTributaria: 0.2533,
                regimeTributario: 'lucro_real'
            };
        default:
            return getDefaultTaxConfig('simples_nacional');
    }
};

export const DocumentoNFSe: React.FC<Props> = ({ request, onClose }) => {
    const { notify } = useNotification();
    const reportRef = useRef<HTMLDivElement>(null);
    const [company, setCompany] = useState<Empresa | null>(null);
    const [loading, setLoading] = useState(false);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [logoUrl, setLogoUrl] = useState('');
    const [taxConfig, setTaxConfig] = useState<TaxConfig>(getDefaultTaxConfig());

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            if (user.empresas) {
                setCompany(user.empresas);
                const regime = user.empresas.regime_tributario || user.empresas.regimeTributario || 'simples_nacional';
                setTaxConfig(getDefaultTaxConfig(regime));
            }
        }
    }, []);

    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                const res = await api.get('/empresas/me');
                if (res.data) {
                    setCompany(res.data);
                    const regime = res.data.regime_tributario || res.data.regimeTributario || 'simples_nacional';
                    setTaxConfig(getDefaultTaxConfig(regime));
                    if (res.data.logo_url || res.data.logoUrl || res.data.logo) {
                        setLogoUrl(res.data.logo_url || res.data.logoUrl || res.data.logo);
                    }
                }
            } catch (e) {
                console.log('Using localStorage company data');
            }
        };
        fetchCompanyInfo();
    }, []);

    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const userStr = localStorage.getItem('user') || localStorage.getItem('AUTH_USER');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    const empresa = user.empresas || user.empresa || {};
                    const userLogo = empresa.logo_url || empresa.logoUrl || empresa.logo || empresa.logo_base64;
                    if (userLogo) {
                        setLogoUrl(userLogo);
                        return;
                    }
                }
            } catch (e) {
                console.error('Falha ao carregar logo', e);
            }
        };
        fetchLogo();
    }, []);

    const handleDownloadPDF = async () => {
        setLoading(true);
        const element = reportRef.current;
        if (!element) {
            notify('Erro ao gerar PDF', 'error');
            setLoading(false);
            return;
        }
        try {
            await html2pdf().set({
                margin: 0,
                filename: `NFSe_${request.nfse?.numero || request.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(element).save();
            notify('PDF baixado com sucesso!', 'success');
        } catch (error) {
            notify('Erro ao baixar PDF', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => window.print();

    const handleSendWhatsApp = async () => {
        const tomador = getTomador();
        if (!tomador?.telefone) {
            notify('Tomador sem telefone cadastrado.', 'warning');
            return;
        }

        try {
            setSendingWhatsApp(true);

            // 1. Check Connection Status
            const status = await whatsappBrain.getStatus();
            const phone = tomador.telefone.replace(/\D/g, '');
            const cleanPhone = phone.length === 11 ? `55${phone}` : phone;
            const message = `Olá ${tomador.nome}! Segue sua NFS-e #${request.nfse?.numero || request.id}.`;


            if (!status || status.status !== 'conectado') {
                // Fallback to Web if not connected
                console.warn('Neonize Brain not connected. Floating to WhatsApp Web.');
                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
                notify('WhatsApp não conectado no sistema. Abrindo Web...', 'warning');
                return;
            }

            // 2. Generate PDF Blob
            notify('Gerando documento para envio...', 'info');
            const element = reportRef.current;
            if (!element) throw new Error('Elemento do relatório não encontrado');

            const pdfBlob = await html2pdf().set({
                margin: 0,
                filename: `NFSe_${request.nfse?.numero || request.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(element).output('blob');

            // 3. Upload PDF
            notify('Enviando para o servidor...', 'info');
            const formData = new FormData();
            formData.append('file', pdfBlob, `NFSe_${request.nfse?.numero || request.id}.pdf`);
            const uploadRes = await api.post('/upload', formData);
            const pdfUrl = uploadRes.data.url;

            // 4. Send via Brain
            notify('Enviando mensagem...', 'info');
            await whatsappBrain.sendMessage(cleanPhone, message, pdfUrl);

            notify('NFS-e enviada com sucesso! 🎉', 'success');

        } catch (error: any) {
            console.error('Erro ao enviar WhatsApp:', error);
            notify(`Erro ao enviar: ${error.message}`, 'error');
             // Last resort fallback
             const tomador = getTomador();
             const phone = tomador?.telefone?.replace(/\D/g, '') || '';
             if (phone) {
                 window.open(`https://wa.me/55${phone}`, '_blank');
             }
        } finally {
            setSendingWhatsApp(false);
        }
    };

    const cliente = Array.isArray(request.clientes) ? request.clientes[0] : request.clientes;
    const isTomadorEmpresa = (request as any).tomador_empresa === true || (request as any).tomadorEmpresa === true || !cliente?.nome;

    const getTomador = () => {
        if (isTomadorEmpresa && company) {
            return {
                nome: company.nome_razao_social || company.nomeRazaoSocial || company.nome || 'Empresa',
                cnpj: company.cnpj,
                cpf: null,
                endereco: company.endereco_completo || company.enderecoCompleto,
                email: company.email_contato || company.emailContato,
                telefone: company.telefone_contato || company.telefoneContato
            };
        }
        return {
            nome: cliente?.nome || 'Cliente não identificado',
            cnpj: cliente?.cnpj,
            cpf: cliente?.cpf,
            endereco: cliente?.endereco,
            email: cliente?.email,
            telefone: cliente?.telefone
        };
    };

    const tomador = getTomador();
    const valorTotal = request.valor_total || request.valorTotal || 0;

    const calcularImpostos = () => {
        const base = valorTotal;
        return {
            valorServicos: base,
            deducoes: 0,
            baseCalculo: base,
            issAliquota: taxConfig.issAliquota * 100,
            issValor: base * taxConfig.issAliquota,
            pisRetido: base * taxConfig.pisAliquota,
            cofinsRetido: base * taxConfig.cofinsAliquota,
            csllRetido: base * taxConfig.csllAliquota,
            irrfRetido: base * taxConfig.irrfAliquota,
            inssRetido: base * taxConfig.inssAliquota,
            ibsValor: base * taxConfig.ibsAliquota,
            cbsValor: base * taxConfig.cbsAliquota,
            ibptValor: base * taxConfig.ibptCargaTributaria,
            valorLiquido: base - (base * taxConfig.issAliquota)
        };
    };

    const impostos = calcularImpostos();

    const getRegimeLabel = () => {
        switch (taxConfig.regimeTributario) {
            case 'mei': return 'MEI - Microempreendedor Individual';
            case 'simples_nacional': return 'Simples Nacional';
            case 'lucro_presumido': return 'Lucro Presumido';
            case 'lucro_real': return 'Lucro Real';
            default: return 'Simples Nacional';
        }
    };

    useBodyScrollLock(true);

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col animate-in">
            {/* Header */}
            <div className="bg-surface-800 text-white p-3 sm:p-4 flex justify-between items-center shrink-0 print:hidden">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">NFS-e (DANFE) - Padrão Nacional 2026</h3>
                        <p className="text-xs text-surface-300 truncate">#{request.nfse?.numero || request.id}</p>
                    </div>
                </div>
                <div className="flex gap-1 sm:gap-2 shrink-0">
                    <button onClick={handleSendWhatsApp} disabled={sendingWhatsApp} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition disabled:opacity-50">
                        {sendingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                        <span className="hidden sm:inline">{sendingWhatsApp ? 'Enviando...' : 'WhatsApp'}</span>
                    </button>
                    <button onClick={handleDownloadPDF} disabled={loading} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition disabled:opacity-50">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        <span className="hidden sm:inline">{loading ? 'Gerando...' : 'PDF'}</span>
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition">
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">Imprimir</span>
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition hidden sm:block">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-auto bg-surface-200 pb-6" id="printable-area">
                <div className="min-h-full p-4 flex justify-center items-start">
                    <div ref={reportRef} className="bg-white shadow-2xl print:shadow-none text-gray-900 font-sans" style={{ width: '794px', maxWidth: '100%', padding: '24px 32px', fontSize: '10px', lineHeight: '1.3', position: 'relative' }}>

                        {/* Marca de Cancelamento */}
                        {(request.nfse?.status === 'CANCELADA' || request.nfse?.status === 'cancelada') && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <div className="transform -rotate-45 border-8 border-red-600 px-12 py-4 opacity-40">
                                    <span className="text-red-600 text-6xl font-black tracking-wider">CANCELADA</span>
                                </div>
                            </div>
                        )}

                        {/* Header Nacional 2026 */}
                        <div className="border-2 border-gray-800 mb-4 flex">
                            <div className="w-1/4 border-r-2 border-gray-800 p-2 flex flex-col items-center justify-center">
                                {logoUrl || company?.logo_base64 || company?.logoUrl ? (
                                    <img src={logoUrl || company?.logo_base64 || company?.logoUrl} alt="Logo" className="max-h-16 mb-1 object-contain" />
                                ) : (
                                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 mb-1">
                                        <Building2 className="w-8 h-8" />
                                    </div>
                                )}
                                <p className="font-bold text-[9px] uppercase text-center">{company?.nome_fantasia || company?.nomeFantasia || 'Sua Empresa'}</p>
                            </div>
                            <div className="w-1/2 border-r-2 border-gray-800 p-2 text-center flex flex-col justify-center">
                                <h2 className="text-lg font-black uppercase tracking-tighter">NFS-e - PADRÃO NACIONAL</h2>
                                <p className="font-bold text-[10px]">NOTA FISCAL DE SERVIÇOS ELETRÔNICA</p>
                                <p className="text-[9px] mt-1">DANFE NFS-e - Versão 2.0.26 - LC 214/2025</p>
                            </div>
                            <div className="w-1/4 p-2 flex flex-col justify-between text-center">
                                <div>
                                    <p className="font-bold">Número da Nota</p>
                                    <p className="text-lg font-black text-brand-600">NFS-e {request.nfse?.numero || 'PROVISÓRIO'}</p>
                                </div>
                                <div className="border-t border-gray-800 pt-1">
                                    <p className="font-bold">Data de Emissão</p>
                                    <p className="text-sm font-bold">{formatarData(request.nfse?.data_emissao || new Date())}</p>
                                </div>
                            </div>
                        </div>

                        {/* Código de Verificação */}
                        <div className="border-2 border-gray-800 mb-4 flex divide-x-2 divide-gray-800">
                            <div className="flex-1 p-2">
                                <p className="font-bold uppercase text-[9px] text-gray-600">Chave de Acesso Nacional</p>
                                <p className="font-mono text-sm font-bold break-all">{request.nfse?.codigo_verificacao || 'NFSE-NAC-2026-XXXX-XXXX-XXXX'}</p>
                            </div>
                            <div className="w-1/3 p-2 flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-100 border border-gray-300 flex items-center justify-center">
                                    <QrCode className="w-8 h-8 text-gray-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-[8px] uppercase">Portal Nacional</p>
                                    <p className="text-[8px] text-gray-500">nfse.gov.br</p>
                                </div>
                            </div>
                        </div>

                        {/* Prestador */}
                        <div className="border-2 border-gray-800 mb-4">
                            <h4 className="font-bold bg-gray-900 text-white p-1 px-2 uppercase flex items-center gap-2">
                                <Building2 className="w-3 h-3" /> Prestador de Serviços
                            </h4>
                            <div className="p-2 grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <p className="font-bold text-sm">{company?.nome_razao_social || company?.nomeRazaoSocial || 'EMPRESA'}</p>
                                    <p>CNPJ: <span className="font-bold">{maskCNPJ(company?.cnpj || '00.000.000/0001-00')}</span></p>
                                    <p>Endereço: {company?.endereco_completo || company?.enderecoCompleto || 'Endereço'}</p>
                                </div>
                                <div className="text-right">
                                    <p>IM: <span className="font-bold">{company?.inscricao_municipal || '123456'}</span></p>
                                    <p>Tel: {maskPhone(company?.telefone_contato || company?.telefoneContato || '')}</p>
                                    <p>E-mail: {company?.email_contato || company?.emailContato || ''}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tomador - Dinâmico (Cliente ou Empresa) */}
                        <div className="border-2 border-gray-800 mb-4">
                            <h4 className="font-bold bg-gray-200 p-1 px-2 border-b border-gray-800 uppercase flex items-center gap-2">
                                {isTomadorEmpresa ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                Tomador de Serviços {isTomadorEmpresa && <span className="text-[8px] font-normal">(Auto-Serviço)</span>}
                            </h4>
                            <div className="p-2 grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <p className="font-bold text-sm">{tomador.nome}</p>
                                    <p>CNPJ/CPF: <span className="font-bold">{tomador.cnpj ? maskCNPJ(tomador.cnpj) : (tomador.cpf ? maskCPF(tomador.cpf) : 'Não informado')}</span></p>
                                    <p>Endereço: {formatAddress(tomador.endereco)}</p>
                                </div>
                                <div className="text-right">
                                    <p>E-mail: {tomador.email || 'Não informado'}</p>
                                    <p>Telefone: {tomador.telefone ? maskPhone(tomador.telefone) : 'Não informado'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Discriminação dos Serviços */}
                        <div className="border-2 border-gray-800 mb-4 min-h-[100px]">
                            <h4 className="font-bold bg-gray-200 p-1 px-2 border-b border-gray-800 uppercase">Discriminação dos Serviços</h4>
                            <div className="p-3 text-sm whitespace-pre-wrap leading-relaxed">
                                <p className="font-bold mb-2">OS #{request.numero || request.id} - {request.titulo}</p>
                                {request.descricao_detalhada || request.descricaoDetalhada || 'Prestação de serviços de manutenção em refrigeração e climatização.'}
                                {request.itens_os && request.itens_os.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-dashed border-gray-300">
                                        {request.itens_os.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-[10px] py-0.5">
                                                <span>• {item.descricao_tarefa}</span>
                                                <span className="font-mono">R$ {(item.valor_total || 0).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Valores e Impostos - Padrão Nacional 2026 */}
                        <div className="border-2 border-gray-800 mb-4">
                            <h4 className="font-bold bg-gray-900 text-white p-1 px-2 uppercase">Valores e Tributação - Padrão Nacional 2026</h4>

                            {/* Linha 1 */}
                            <div className="grid grid-cols-6 text-center divide-x divide-gray-800 border-b border-gray-800">
                                <div className="p-1"><p className="font-bold text-[9px]">Valor Serviços</p><p className="text-sm font-bold">R$ {impostos.valorServicos.toFixed(2)}</p></div>
                                <div className="p-1"><p className="font-bold text-[9px]">Deduções</p><p>R$ {impostos.deducoes.toFixed(2)}</p></div>
                                <div className="p-1"><p className="font-bold text-[9px]">Base Cálculo</p><p>R$ {impostos.baseCalculo.toFixed(2)}</p></div>
                                <div className="p-1"><p className="font-bold text-[9px]">Alíquota ISS</p><p>{impostos.issAliquota.toFixed(2)}%</p></div>
                                <div className="p-1"><p className="font-bold text-[9px]">Valor ISS</p><p className="font-bold">R$ {impostos.issValor.toFixed(2)}</p></div>
                                <div className="p-1 bg-brand-50"><p className="font-bold text-[9px] text-brand-700">Valor Líquido</p><p className="text-sm font-black text-brand-800">R$ {impostos.valorLiquido.toFixed(2)}</p></div>
                            </div>

                            {/* Linha 2 - Retenções Federais */}
                            <div className="grid grid-cols-5 text-center divide-x divide-gray-800 bg-gray-50 border-b border-gray-800">
                                <div className="p-1"><p className="font-bold text-[8px]">PIS (Retido)</p><p>R$ {impostos.pisRetido.toFixed(2)}</p></div>
                                <div className="p-1"><p className="font-bold text-[8px]">COFINS (Retido)</p><p>R$ {impostos.cofinsRetido.toFixed(2)}</p></div>
                                <div className="p-1"><p className="font-bold text-[8px]">CSLL (Retido)</p><p>R$ {impostos.csllRetido.toFixed(2)}</p></div>
                                <div className="p-1"><p className="font-bold text-[8px]">IRRF (Retido)</p><p>R$ {impostos.irrfRetido.toFixed(2)}</p></div>
                                <div className="p-1"><p className="font-bold text-[8px]">INSS (Retido)</p><p>R$ {impostos.inssRetido.toFixed(2)}</p></div>
                            </div>

                            {/* Linha 3 - Novos Tributos 2026 */}
                            <div className="grid grid-cols-4 text-center divide-x divide-gray-800 bg-blue-50">
                                <div className="p-1"><p className="font-bold text-[8px] text-blue-700">IBS (Transição)</p><p className="text-blue-800">R$ {impostos.ibsValor.toFixed(2)} ({(taxConfig.ibsAliquota * 100).toFixed(1)}%)</p></div>
                                <div className="p-1"><p className="font-bold text-[8px] text-blue-700">CBS (Transição)</p><p className="text-blue-800">R$ {impostos.cbsValor.toFixed(2)} ({(taxConfig.cbsAliquota * 100).toFixed(1)}%)</p></div>
                                <div className="p-1 col-span-2"><p className="font-bold text-[8px] text-blue-700">IBPT - Tributos Aproximados (Lei 12.741/2012)</p><p className="font-bold text-blue-800">R$ {impostos.ibptValor.toFixed(2)} ({(taxConfig.ibptCargaTributaria * 100).toFixed(2)}%)</p></div>
                            </div>
                        </div>

                        {/* Outras Informações */}
                        <div className="border-2 border-gray-800">
                            <h4 className="font-bold bg-gray-200 p-1 px-2 border-b border-gray-800 uppercase">Outras Informações</h4>
                            <div className="p-2 grid grid-cols-2 gap-4">
                                <div className="text-[9px] space-y-1">
                                    <p>• Regime: <span className="font-bold">{getRegimeLabel()}</span></p>
                                    <p>• Natureza: <span className="font-bold">Tributação no município</span></p>
                                    <p>• Código LC 116: <span className="font-bold">14.01 - Manutenção e Conservação</span></p>
                                </div>
                                <div className="text-[9px] border-l border-gray-300 pl-4">
                                    <p className="italic text-gray-600">
                                        {taxConfig.regimeTributario === 'simples_nacional' && 'Optante pelo Simples Nacional. Não gera crédito fiscal de IPI.'}
                                        {taxConfig.regimeTributario === 'mei' && 'MEI - Isento de ISS na nota.'}
                                        {(taxConfig.regimeTributario === 'lucro_presumido' || taxConfig.regimeTributario === 'lucro_real') && 'Sujeito às retenções federais.'}
                                    </p>
                                    <p className="mt-2 text-[8px]">IBS/CBS: Alíquotas de transição conforme LC 214/2025</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-6 pt-4 border-t-2 border-gray-200 flex justify-between items-end opacity-50">
                            <div>
                                <p className="text-[8px]">Gerado por Inovar Refrigeração Manager</p>
                                <p className="text-[8px]">www.inovar.com.br</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-bold">Padrão Nacional NFS-e - v2.0.26</p>
                                <p className="text-[8px]">LC 214/2025 - Reforma Tributária</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
