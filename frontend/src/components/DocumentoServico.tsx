import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { ServiceRequest } from '../types';
import { formatAddress } from '../utils/formatadores';
import { FileText, Printer, X, QrCode, AlertTriangle, Wrench, DollarSign, MessageCircle, Loader2, Download, ArrowLeft, CheckCircle } from 'lucide-react';
import { solicitacaoService } from '../services/solicitacaoService';
import { pixService } from '../services/pixService';
import { whatsappService } from '../services/whatsappService';
import api from '../services/api';
import { useNotification } from '../contexts/ContextoNotificacao';
import html2pdf from 'html2pdf.js';

interface Props {
  request: ServiceRequest;
  type?: 'QUOTE' | 'REPORT' | 'UNIFIED';
  onClose: () => void;
}

export const ServiceDocument: React.FC<Props> = ({ request, type, onClose }) => {
  const { notify } = useNotification();
  const [localRequest, setLocalRequest] = useState<ServiceRequest>(request);
  const [logoUrl, setLogoUrl] = useState('');
  const [pixData, setPixData] = useState<{ qr_code_base64: string; pix_copiacola: string } | null>(null);
  const [pixConfig, setPixConfig] = useState<{ chave_pix: string; tipo_chave: string; nome_beneficiario: string } | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    cnpj: string;
    email: string;
    telefone: string;
    endereco: string | null;
    logoUrl: string;
  }>({ name: 'Inovar Refrigeração', cnpj: '', email: '', telefone: '', endereco: null, logoUrl: '' });

  useEffect(() => {
    console.log('DEBUG: DocumentoServico received request:', request);
    setLocalRequest(request);
  }, [request]);

  // Fetch company data from API
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const res = await api.get('/empresas/me');
        const e = res.data;
        setCompanyInfo({
          name: e.nomeFantasia || e.nome_fantasia || e.razao_social || e.nome || 'Inovar Refrigeração',
          cnpj: e.cnpj || '',
          email: e.emailContato || e.email_contato || e.email || '',
          telefone: e.telefoneContato || e.telefone_contato || e.telefone || '',
          endereco: e.enderecoCompleto || e.endereco_completo || e.endereco || null,
          logoUrl: e.logoUrl || e.logo_url || ''
        });
        if (e.logoUrl || e.logo_url) {
          setLogoUrl(e.logoUrl || e.logo_url);
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        // Fallback to localStorage
        const userStr = localStorage.getItem('user') || localStorage.getItem('AUTH_USER');
        if (userStr) {
          const user = JSON.parse(userStr);
          const empresa = user.empresas || user.empresa || {};
          setCompanyInfo({
            name: empresa.nomeFantasia || empresa.nome_fantasia || empresa.razao_social || empresa.nome || user.nome_completo || 'Inovar Refrigeração',
            cnpj: empresa.cnpj || empresa.cpf || user.cpf || '',
            email: empresa.emailContato || empresa.email_contato || empresa.email || user.email || '',
            telefone: empresa.telefoneContato || empresa.telefone_contato || empresa.telefone || user.telefone || '',
            endereco: empresa.enderecoCompleto || empresa.endereco_completo || empresa.endereco || user.endereco || null,
            logoUrl: empresa.logoUrl || empresa.logo_url || ''
          });
          if (empresa.logoUrl || empresa.logo_url) {
            setLogoUrl(empresa.logoUrl || empresa.logo_url);
          }
        }
      }
    };
    fetchCompanyData();
  }, []);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        // 1. Tentar pegar do localStorage (dados do usuário/empresa)
        const userStr = localStorage.getItem('user') || localStorage.getItem('AUTH_USER');
        if (userStr) {
          const user = JSON.parse(userStr);
          const empresa = user.empresas || user.empresa || {};

          // Tentar várias propriedades possíveis para a logo
          const possibleLogo =
            empresa.logo_url ||
            empresa.logoUrl ||
            empresa.logo ||
            user.logo_url ||
            user.logoUrl ||
            user.logo;

          if (possibleLogo) {
            console.log('Logo encontrada no localStorage:', possibleLogo);
            setLogoUrl(possibleLogo);
            return; // Se achou, para por aqui
          }
        }

        // 2. Se não achou, tentar buscar da API de configuração
        const token = localStorage.getItem('token') || localStorage.getItem('AUTH_TOKEN');
        if (!token) return;

        const API_URL = import.meta.env.VITE_API_URL || 'https://inovar-backend.onrender.com/api';
        const res = await fetch(`${API_URL}/qrcode/config`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.logoUrl) {
            console.log('Logo encontrada na API:', data.logoUrl);
            setLogoUrl(data.logoUrl);
          }
        }
      } catch (e) {
        console.error('Falha ao carregar logo', e);
      }
    };
    fetchLogo();
  }, []);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    const docEl = document.getElementById('document-content');
    if (!docEl) {
      notify('Erro ao gerar PDF', 'error');
      return;
    }

    try {
      notify('Gerando PDF...', 'info');

      // Aguardar todas as imagens carregarem completamente
      const images = docEl.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // Pequeno delay para garantir renderização completa
      await new Promise(resolve => setTimeout(resolve, 500));

      const docTitle = type === 'QUOTE' ? 'Orcamento' : 'OrdemServico';
      const fileName = `${docTitle}_${localRequest.numero || localRequest.id}_${new Date().toISOString().slice(0, 10)}.pdf`;

      // Configurações otimizadas para A4 com imagens
      await html2pdf().set({
        margin: [10, 10, 10, 10], // Margem de 10mm em todos os lados
        filename: fileName,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: true, // Ativar logs para debug
          backgroundColor: '#ffffff',
          windowWidth: 794, // Largura A4 em pixels
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(docEl).save();

      notify('PDF baixado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      notify('Erro ao gerar PDF', 'error');
    }
  };

  const handleSendWhatsApp = async () => {
    const telefone = clientData?.telefone || localRequest.clientes?.telefone;
    if (!telefone) {
      notify('Telefone do cliente não encontrado', 'error');
      return;
    }

    setSendingWhatsApp(true);
    try {
      // Preparar lista de serviços
      const itens = localRequest.itens_os || localRequest.itensOs || [];
      const servicosTexto = itens.map((item: any) => {
        const desc = item.descricao_tarefa || item.descricaoTarefa || item.descricao || 'Serviço';
        const valor = item.valor_total ? `R$ ${item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
        return `• ${desc}${valor ? ` - ${valor}` : ''}`;
      }).join('\n');

      // Valor total
      const valorTotal = localRequest.valor_total || localRequest.valorTotal || 0;
      const valorFormatado = `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

      // Construir mensagem detalhada
      const tipoDoc = type === 'QUOTE' ? 'Orçamento' : 'Ordem de Serviço';
      const numeroDoc = localRequest.numero || localRequest.id;

      let mensagem = `*${companyInfo.name}*\n\n`;
      mensagem += `📋 *${tipoDoc} #${numeroDoc}*\n`;
      mensagem += `📅 Data: ${date}\n\n`;
      mensagem += `👤 *Cliente:* ${clientData?.nome || 'N/A'}\n\n`;

      if (servicosTexto) {
        mensagem += `🔧 *Serviços:*\n${servicosTexto}\n\n`;
      }

      mensagem += `💰 *Valor Total: ${valorFormatado}*\n\n`;

      if (type === 'QUOTE') {
        mensagem += `⏰ *Validade:* 15 dias a partir desta data\n`;
        mensagem += `🛡️ *Garantia:* 90 dias sobre os serviços executados\n\n`;
      }

      // Adicionar PIX se configurado
      if (pixConfig?.chave_pix) {
        mensagem += `💳 *Pagamento via PIX:*\n`;
        mensagem += `Chave: ${pixConfig.chave_pix}\n`;
        mensagem += `Tipo: ${pixConfig.tipo_chave?.toUpperCase() || 'ALEATÓRIA'}\n`;
        if (pixConfig.nome_beneficiario) {
          mensagem += `Beneficiário: ${pixConfig.nome_beneficiario}\n`;
        }
        mensagem += `\n`;
      }

      mensagem += `📎 O documento em PDF será enviado em seguida.\n\n`;
      mensagem += `_${companyInfo.name} - Qualidade e Confiança_`;

      // Limpar número de telefone
      const numeroLimpo = telefone.replace(/\D/g, '');
      const whatsappNumber = numeroLimpo.length === 11 ? `55${numeroLimpo}` : numeroLimpo;

      // Tentar enviar via API Evolution primeiro
      try {
        await whatsappService.sendMessage(whatsappNumber, mensagem);
        notify('Mensagem enviada com sucesso!', 'success');
      } catch (apiError) {
        // Fallback: Abrir WhatsApp Web
        console.log('Fallback para WhatsApp Web:', apiError);
        const encodedMessage = encodeURIComponent(mensagem);
        window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
        notify('WhatsApp aberto com mensagem pronta', 'info');
      }
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      notify('Erro ao enviar mensagem', 'error');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const docNumber = `OS-${localRequest.numero || localRequest.codigoOs || localRequest.id}`;
  const date = new Date().toLocaleDateString('pt-BR');
  const clientData = Array.isArray(localRequest.clientes) ? localRequest.clientes[0] : localRequest.clientes;
  const clientCpf = clientData?.cpf || (clientData as any)?.cnpj || 'Não informado';
  const valorTotal = localRequest.itens_os?.reduce((acc, item) => acc + (item.valor_total || 0), 0) || 0;

  // Use companyInfo from state (already populated by useEffect)

  const handleSendToClient = async () => {
    if (!clientData?.telefone) {
      notify('Cliente sem telefone cadastrado.', 'error');
      return;
    }
    const phone = clientData.telefone.replace(/\D/g, '');
    try {
      setSendingWhatsApp(true);
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userName = user?.nome || user?.nomeCompleto || user?.nome_completo || user?.name || 'User';
      const userInstanceName = userName.replace(/[^a-zA-Z0-9]/g, '');

      const instances = await whatsappService.getInstances();
      const myInstance = instances.find(inst =>
        inst.instance?.instanceName === userInstanceName &&
        (inst.instance?.status === 'open' || inst.instance?.state === 'open')
      );

      if (!myInstance) {
        notify('WhatsApp não conectado. Conecte na página WhatsApp.', 'error');
        return;
      }

      notify('Gerando PDF e enviando...', 'info');
      const docEl = document.getElementById('document-content');
      if (!docEl) {
        notify('Erro ao localizar documento.', 'error');
        return;
      }

      const pdfBlob = await html2pdf().set({
        margin: [5, 5, 5, 5],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(docEl).output('blob');

      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      const docFileName = type === 'QUOTE' ? `Orcamento_${docNumber}.pdf` : `OrdemServico_${docNumber}.pdf`;

      // Construir mensagem detalhada
      let messageDetails = '';

      if (type === 'QUOTE') {
        // Preparar lista de serviços
        const itens = localRequest.itens_os || localRequest.itensOs || [];
        const servicosTexto = itens.map((item: any) => {
          const desc = item.descricao_tarefa || item.descricaoTarefa || item.descricao || 'Serviço';
          return `• ${desc}`;
        }).join('\n');

        messageDetails += `Olá *${clientData.nome?.split(' ')[0]}*! 👋\n\n`;
        messageDetails += `📋 *Orçamento #${localRequest.numero || docNumber}*\n`;
        messageDetails += `📅 Data: ${date}\n\n`;

        if (servicosTexto) {
          messageDetails += `🔧 *Serviços:*\n${servicosTexto}\n\n`;
        }

        messageDetails += `💰 *Valor Total: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
        messageDetails += `⏰ *Validade:* 15 dias\n`;
        messageDetails += `🛡️ *Garantia:* 90 dias\n\n`;

        if (pixConfig?.chave_pix) {
          messageDetails += `💳 A chave PIX para pagamento será enviada na próxima mensagem.\n\n`;
        }

        messageDetails += `📎 Segue em anexo o orçamento completo em PDF.\n\n`;
        messageDetails += `_${companyInfo.name} - Qualidade e Confiança_`;
      } else {
        messageDetails += `Olá *${clientData.nome?.split(' ')[0]}*! 👋\n\n`;
        messageDetails += `🛠️ *Ordem de Serviço #${localRequest.numero || docNumber}*\n`;
        messageDetails += `📅 Data: ${date}\n`;
        messageDetails += `📌 *Status:* ${localRequest.status.toUpperCase()}\n\n`;
        messageDetails += `📎 Segue em anexo o documento completo.\n\n`;
        messageDetails += `_${companyInfo.name}_`;
      }

      await api.post('/whatsapp/send-quote', {
        number: `55${phone}`,
        quoteDetails: messageDetails,
        pixKey: type === 'QUOTE' ? pixConfig?.chave_pix : null,
        pdfBase64,
        fileName: docFileName,
        osId: localRequest.id || localRequest.numero,
        instanceName: userInstanceName,
        documentType: type // QUOTE ou REPORT
      });

      notify('Enviado com sucesso via WhatsApp! 🎉', 'success');
    } catch (error: any) {
      notify(`Erro ao enviar: ${error.message || 'Verifique WhatsApp.'}`, 'error');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  useEffect(() => {
    if (valorTotal > 0 && clientData) {
      const loadPayment = async () => {
        setLoadingPayment(true);
        try {
          const prestadorId = localRequest.tecnicos?.id || localRequest.tecnico_id || localRequest.criado_por || '';
          if (prestadorId) {
            const config = await pixService.getPixConfig(prestadorId.toString());
            if (config) setPixConfig(config);
            const pix = await pixService.generatePixQRCode(
              prestadorId.toString(),
              Number(valorTotal.toFixed(2)),
              `OS${localRequest.id}`.substring(0, 25)
            );
            if (pix) setPixData(pix);
          }
        } catch (error) {
          console.error('Erro PIX:', error);
        } finally {
          setLoadingPayment(false);
        }
      };
      loadPayment();
    }
  }, [valorTotal, clientData]);

  useBodyScrollLock(true);


  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col animate-in">
      {/* Mobile Header - Fixed */}
      <div className="bg-surface-800 text-white p-3 sm:p-4 flex justify-between items-center shrink-0 safe-area-top print:hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"
            aria-label="Fechar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">
              {type === 'QUOTE' ? 'Orçamento' : 'Ordem de Serviço'}
            </h3>
            <p className="text-xs text-surface-300 truncate">#{localRequest.numero || docNumber}</p>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 shrink-0">
          <button
            onClick={handleSendToClient}
            disabled={sendingWhatsApp}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition disabled:opacity-50"
          >
            {sendingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            <span className="hidden sm:inline">{sendingWhatsApp ? 'Enviando...' : 'WhatsApp'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition hidden sm:block"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Document Content - Scrollable A4 Fullscreen */}
      <div className="flex-1 overflow-auto bg-surface-200 safe-area-bottom pb-6" id="printable-area">
        <div className="min-h-full p-4 flex justify-center items-start">
          <div
            id="document-content"
            className="bg-white shadow-2xl print:shadow-none"
            style={{
              width: '794px',
              maxWidth: '100%',
              padding: '24px 32px',
              fontSize: '10px',
              lineHeight: '1.3',
              boxSizing: 'border-box'
            }}
          >
            {/* Header - Estilos inline fixos para PDF */}
            <div style={{ borderBottom: '2px solid #3b82f6', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" crossOrigin="anonymous" style={{ height: '50px', width: 'auto', objectFit: 'contain', maxWidth: '100px' }} />
                  ) : (
                    <div style={{ height: '50px', width: '50px', backgroundColor: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 'bold', fontSize: '10px' }}>LOGO</div>
                  )}
                  <div>
                    <h1 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{companyInfo.name}</h1>
                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                      {companyInfo.cnpj && <p style={{ margin: 0 }}>CNPJ: {companyInfo.cnpj}</p>}
                      {companyInfo.telefone && <p style={{ margin: 0 }}>Tel: {companyInfo.telefone}</p>}
                      {companyInfo.email && <p style={{ margin: 0 }}>Email: {companyInfo.email}</p>}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    backgroundColor: '#dbeafe',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '2px solid #3b82f6',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#1e3a5f',
                    letterSpacing: '1px'
                  }}>
                    {type === 'QUOTE' ? 'ORÇAMENTO' : 'ORDEM DE SERVIÇO'}
                  </span>
                  <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#475569', marginTop: '6px', marginBottom: 0 }}>#{localRequest.numero || docNumber}</p>
                  <p style={{ fontSize: '9px', color: '#94a3b8', margin: 0 }}>{date}</p>
                </div>
              </div>
            </div>

            {/* Company Info Section */}
            <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px', margin: 0 }}>Dados da Empresa</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '11px', margin: 0 }}>{companyInfo.name}</p>
                  <p style={{ fontSize: '9px', color: '#64748b', margin: '2px 0 0 0' }}>CNPJ: {companyInfo.cnpj || 'Não informado'}</p>
                  {companyInfo.email && <p style={{ fontSize: '9px', color: '#64748b', margin: '2px 0 0 0' }}>Email: {companyInfo.email}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '9px', color: '#475569', margin: 0 }}>{formatAddress(companyInfo.endereco) || 'Endereço não cadastrado'}</p>
                  {companyInfo.telefone && <p style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', marginBottom: 0 }}>Tel: {companyInfo.telefone}</p>}
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px', margin: 0 }}>Dados do Cliente</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '11px', margin: 0 }}>{clientData?.nome || 'Cliente não informado'}</p>
                  <p style={{ fontSize: '9px', color: '#64748b', margin: '2px 0 0 0' }}>CPF/CNPJ: {clientCpf}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '9px', color: '#475569', margin: 0 }}>{formatAddress(clientData?.endereco) || 'Endereço não cadastrado'}</p>
                  {clientData?.telefone && <p style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', marginBottom: 0 }}>Tel: {clientData.telefone}</p>}
                </div>
              </div>
            </div>

            {/* Technician Info - Uses OS creator as fallback */}
            <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px', margin: 0 }}>Responsável Técnico</h4>
              <div>
                <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '11px', margin: 0 }}>
                  {localRequest.tecnicos?.nome_completo || localRequest.tecnicos?.nome || (localRequest.tecnicos as any)?.name || (localRequest as any).criado_por_nome || (localRequest as any).criadoPorNome || 'Responsável'}
                </p>
              </div>
            </div>

            {/* Equipment Info - Deduplicated */}
            {localRequest.itens_os && localRequest.itens_os.some((item: any) => item.equipamentos) && (
              <div style={{ marginBottom: '16px', backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wrench style={{ width: '12px', height: '12px' }} /> Dados do Equipamento
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Array.from(new Map(
                    localRequest.itens_os
                      .filter((item: any) => item.equipamentos)
                      .map((item: any) => [item.equipamentos.id, item.equipamentos])
                  ).values()).map((equip: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: idx < (localRequest.itens_os?.filter((i: any) => i.equipamentos)?.length || 0) - 1 ? '1px solid #dbeafe' : 'none', paddingBottom: '6px', marginBottom: '6px' }}>
                      <div>
                        <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '11px', margin: 0 }}>{equip.nome || 'Equipamento'}</p>
                        <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}>
                          {equip.marca && <span style={{ marginRight: '8px' }}><strong>Marca:</strong> {equip.marca}</span>}
                          {equip.modelo && <span><strong>Modelo:</strong> {equip.modelo}</span>}
                        </p>
                      </div>
                      {equip.numero_serie && (
                        <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}><strong>S/N:</strong> {equip.numero_serie}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items Table */}
            {(localRequest.itens_os || localRequest.itens_orcamento || []).length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign style={{ width: '14px', height: '14px' }} /> Serviços
                </h3>

                <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Item</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Qtd</th>
                      <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>Unit.</th>
                      <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(localRequest.itens_os || localRequest.itens_orcamento || []).map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px' }}>
                          <p style={{ fontWeight: '500', color: '#1e293b', margin: 0 }}>{item.descricao_tarefa || item.descricao}</p>
                          {item.equipamentos && (
                            <p style={{ fontSize: '9px', color: '#3b82f6', margin: '2px 0 0 0' }}>{item.equipamentos.nome}</p>
                          )}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#475569' }}>{item.quantidade}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>R$ {(item.valor_unitario || 0).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>R$ {(item.valor_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                      <td colSpan={3} style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '10px' }}>Total</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>R$ {valorTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* PIX Section - Only for Quote */}
            {type === 'QUOTE' && valorTotal > 0 && (
              <div className="mb-6 bg-brand-50 p-4 rounded-xl border border-brand-100">
                <h4 className="text-xs font-bold text-brand-700 uppercase mb-3 flex items-center gap-2">
                  <QrCode className="w-4 h-4" /> Pagamento via PIX
                </h4>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {pixData?.qr_code_base64 ? (
                    <img src={pixData.qr_code_base64} alt="QR Pix" className="w-24 h-24 sm:w-28 sm:h-28" />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-brand-100 flex items-center justify-center rounded-xl text-xs text-brand-400">
                      {loadingPayment ? '...' : 'QR'}
                    </div>
                  )}
                  <div className="text-center sm:text-left">
                    <p className="font-bold text-brand-800 text-lg">R$ {valorTotal.toFixed(2)}</p>
                    {pixConfig?.chave_pix && (
                      <p className="text-xs text-surface-600 mt-1">
                        <span className="font-medium">Chave:</span> {pixConfig.chave_pix}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Technical Report - Only for OS */}
            {type === 'REPORT' && (
              <>
                {/* Problem Description */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-surface-700 uppercase mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Relato do Problema
                  </h3>
                  <div className="bg-surface-50 p-3 sm:p-4 rounded-xl border border-surface-200">
                    <p className="font-medium text-surface-800 mb-1">{localRequest.titulo}</p>
                    {(localRequest.descricao_detalhada || localRequest.descricaoDetalhada) && (
                      <p className="text-sm text-surface-600 whitespace-pre-wrap">
                        {(localRequest.descricao_detalhada || localRequest.descricaoDetalhada || '').replace(/\(Simulação IA\):?/g, '').replace(/\(Gerado por IA - Mock\):?/g, '').trim()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Technical Report / Solution */}
                {(localRequest.relatorio_tecnico || localRequest.relatorioTecnico) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-surface-700 uppercase mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Relatório Técnico / Solução
                    </h3>
                    <div className="bg-surface-50 p-3 sm:p-4 rounded-xl border border-surface-200">
                      <p className="text-sm text-surface-600 whitespace-pre-wrap">
                        {localRequest.relatorio_tecnico || localRequest.relatorioTecnico}
                      </p>
                    </div>
                  </div>
                )}

                {/* Activity Log / Diário de Obra */}
                {localRequest.historico_json && Array.isArray(localRequest.historico_json) &&
                  localRequest.historico_json.filter((h: any) => h.descricao?.includes('[Diário de Obra]')).length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-surface-700 uppercase mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Relatório de Atividades
                      </h3>
                      <div className="space-y-2">
                        {localRequest.historico_json
                          .filter((h: any) => h.descricao?.includes('[Diário de Obra]'))
                          .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
                          .map((h: any, i: number) => (
                            <div key={i} className="p-2 bg-surface-50 rounded text-xs">
                              <p className="text-surface-600">{h.descricao?.replace('[Diário de Obra] ', '')}</p>
                              <p className="text-surface-400 text-[10px] mt-1">{new Date(h.data).toLocaleDateString('pt-BR')}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Evidence Photos */}
                        {localRequest.fotos_os && localRequest.fotos_os.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-sm font-bold text-surface-700 uppercase mb-3 flex items-center gap-2">
                              <Wrench className="w-4 h-4" /> Evidências
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {localRequest.fotos_os.slice(0, 6).map((foto, i) => (
                                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-surface-100">
                                  <img src={foto.imagem_base64} className="w-full h-full object-cover" alt={`Evidência ${i + 1}`} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Signatures */}
                        <div className="mt-8 pt-6 border-t border-surface-200">
                          <div className="grid grid-cols-2 gap-6 sm:gap-10">
                            <div className="text-center">
                              <div className="h-12 flex items-end justify-center mb-2">
                                {localRequest.assinatura_tecnico ? (
                                  <img src={localRequest.assinatura_tecnico} className="h-10 object-contain" alt="Assinatura Técnico" />
                                ) : (
                                  <span className="text-[9px] text-surface-300">Assinatura</span>
                                )}
                              </div>
                              <div className="border-t border-surface-300 pt-1">
                                <p className="text-[10px] font-bold uppercase text-surface-600">Técnico</p>
                                <p className="text-[9px] text-surface-400">{localRequest.tecnicos?.nome_completo}</p>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="h-12 flex items-end justify-center mb-2">
                                {localRequest.assinatura_cliente ? (
                                  <img src={localRequest.assinatura_cliente} className="h-10 object-contain" alt="Assinatura Cliente" />
                                ) : (
                                  <span className="text-[9px] text-surface-300">Assinatura</span>
                                )}
                              </div>
                              <div className="border-t border-surface-300 pt-1">
                                <p className="text-[10px] font-bold uppercase text-surface-600">Cliente</p>
                                <p className="text-[9px] text-surface-400">{clientData?.nome}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
            )}

                      {/* Termos e Condições - Apenas para Orçamento */}
                      {type === 'QUOTE' && (
                        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '8px', margin: 0 }}>
                            Termos e Condições
                          </h4>
                          <div style={{ fontSize: '8px', color: '#64748b', lineHeight: '1.4' }}>
                            <p style={{ margin: '0 0 4px 0' }}>
                              <strong>1. Validade:</strong> Este orçamento é válido por 15 (quinze) dias a partir da data de emissão.
                            </p>
                            <p style={{ margin: '0 0 4px 0' }}>
                              <strong>2. Garantia:</strong> Os serviços executados possuem garantia de 90 (noventa) dias, exceto para peças sujeitas a desgaste natural.
                            </p>
                            <p style={{ margin: '0 0 4px 0' }}>
                              <strong>3. Pagamento:</strong> Condições de pagamento conforme acordado entre as partes. PIX, transferência ou cartão.
                            </p>
                            <p style={{ margin: '0 0 4px 0' }}>
                              <strong>4. Execução:</strong> Prazo de execução a ser definido após aprovação do orçamento e agendamento prévio.
                            </p>
                            <p style={{ margin: 0 }}>
                              <strong>5. Observações:</strong> Valores podem sofrer alteração caso sejam identificados serviços adicionais durante a execução.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Signatures - Para Orçamento */}
                      {type === 'QUOTE' && (
                        <div className="mt-8 pt-6 border-t border-surface-200">
                          <p style={{ fontSize: '9px', color: '#64748b', textAlign: 'center', marginBottom: '16px' }}>
                            Ao assinar este documento, o cliente autoriza a execução dos serviços descritos e concorda com os termos e condições acima.
                          </p>
                          <div className="grid grid-cols-2 gap-6 sm:gap-10">
                            <div className="text-center">
                              <div className="h-12 flex items-end justify-center mb-2">
                                {localRequest.assinatura_tecnico ? (
                                  <img src={localRequest.assinatura_tecnico} className="h-10 object-contain" alt="Assinatura Técnico" />
                                ) : (
                                  <span className="text-[9px] text-surface-300">Assinatura</span>
                                )}
                              </div>
                              <div className="border-t border-surface-300 pt-1">
                                <p className="text-[10px] font-bold uppercase text-surface-600">Responsável Técnico</p>
                                <p className="text-[9px] text-surface-400">
                                  {localRequest.tecnicos?.nome_completo || localRequest.tecnicos?.nome || (localRequest as any).criado_por_nome || 'Responsável'}
                                </p>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="h-12 flex items-end justify-center mb-2">
                                {localRequest.assinatura_cliente ? (
                                  <img src={localRequest.assinatura_cliente} className="h-10 object-contain" alt="Assinatura Cliente" />
                                ) : (
                                  <span className="text-[9px] text-surface-300">Assinatura</span>
                                )}
                              </div>
                              <div className="border-t border-surface-300 pt-1">
                                <p className="text-[10px] font-bold uppercase text-surface-600">Cliente</p>
                                <p className="text-[9px] text-surface-400">{clientData?.nome}</p>
                              </div>
                            </div>
                          </div>
                          <p style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'center', marginTop: '12px' }}>
                            A assinatura neste orçamento autoriza automaticamente a Ordem de Serviço correspondente.
                          </p>
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <p style={{ fontSize: '8px', color: '#94a3b8', margin: 0 }}>{companyInfo.name} - Documento gerado em {date}</p>
                        {type === 'QUOTE' && (
                          <p style={{ fontSize: '7px', color: '#cbd5e1', margin: '4px 0 0 0' }}>
                            Este documento não possui valor fiscal. Após aprovação, será emitida Nota Fiscal de Serviço correspondente.
                          </p>
                        )}
                      </div>
                    </div>
        </div>
          </div>
        </div>,
        document.body
        );
};
