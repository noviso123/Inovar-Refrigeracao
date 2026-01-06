import React, { useState, useEffect } from 'react';
import {
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Search,
    RefreshCw,
    DollarSign,
    Calendar
} from 'lucide-react';
import { invoicesService, InvoicePending, InvoiceResponse } from '../services/invoicesService';
import { useNotification } from '../contexts/ContextoNotificacao';

export const AdminInvoices: React.FC = () => {
    const { notify } = useNotification();
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [loading, setLoading] = useState(true);
    const [pendingInvoices, setPendingInvoices] = useState<InvoicePending[]>([]);
    const [historyInvoices, setHistoryInvoices] = useState<InvoiceResponse[]>([]);

    // Modal States
    const [emitModalOpen, setEmitModalOpen] = useState(false);
    const [selectedPending, setSelectedPending] = useState<InvoicePending | null>(null);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<InvoiceResponse | null>(null);
    const [processing, setProcessing] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pending, history] = await Promise.all([
                invoicesService.listPending(),
                invoicesService.listHistory()
            ]);
            setPendingInvoices(pending);
            setHistoryInvoices(history);
        } catch (error) {
            console.error(error);
            notify('Erro ao carregar notas fiscais', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEmitClick = (invoice: InvoicePending) => {
        setSelectedPending(invoice);
        setEmitModalOpen(true);
    };

    const handleConfirmEmit = async () => {
        if (!selectedPending) return;

        setProcessing(true);
        try {
            await invoicesService.emit({
                subscription_id: selectedPending.subscription_id,
                month_ref: selectedPending.month_ref,
                amount: selectedPending.amount,
                description: `Assinatura ${selectedPending.plan_name} - Ref: ${selectedPending.month_ref}`,
                service_code: "1.07"
            });
            notify('Nota Fiscal emitida com sucesso!', 'success');
            setEmitModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            notify('Erro ao emitir nota fiscal', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleCancelClick = (invoice: InvoiceResponse) => {
        setSelectedHistory(invoice);
        setCancelModalOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!selectedHistory) return;

        setProcessing(true);
        try {
            await invoicesService.cancel(selectedHistory.id);
            notify('Nota Fiscal cancelada com sucesso!', 'success');
            setCancelModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            notify('Erro ao cancelar nota fiscal', 'error');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">Emissão de Notas Fiscais</h1>
                    <p className="text-surface-500">Gerencie as notas fiscais das assinaturas do sistema</p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 hover:bg-surface-100 rounded-lg transition-colors text-surface-600"
                    title="Atualizar"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-surface-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'pending'
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-surface-500 hover:text-surface-700'
                        }`}
                >
                    A Emitir ({pendingInvoices.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'history'
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-surface-500 hover:text-surface-700'
                        }`}
                >
                    Histórico de Notas
                </button>
            </div>

            {/* Content */}
            {loading && pendingInvoices.length === 0 && historyInvoices.length === 0 ? (
                <div className="flex justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
                </div>
            ) : (
                <>
                    {activeTab === 'pending' && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {pendingInvoices.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-surface-500 bg-surface-50 rounded-xl border border-dashed border-surface-200">
                                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                                    <p>Nenhuma nota pendente para este mês!</p>
                                </div>
                            ) : (
                                pendingInvoices.map((invoice) => (
                                    <div key={invoice.subscription_id} className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded uppercase">
                                                Pendente
                                            </div>
                                            <span className="text-sm text-surface-500 font-mono">{invoice.month_ref}</span>
                                        </div>

                                        <h3 className="font-bold text-surface-900 mb-1">{invoice.company_name}</h3>
                                        <p className="text-sm text-surface-500 mb-4">CNPJ: {invoice.company_cnpj}</p>

                                        <div className="bg-surface-50 p-3 rounded-lg mb-4 space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-surface-700">
                                                <FileText className="w-4 h-4 text-brand-500" />
                                                <span>{invoice.plan_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-surface-900 font-bold">
                                                <DollarSign className="w-4 h-4 text-green-600" />
                                                <span>R$ {invoice.amount.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleEmitClick(invoice)}
                                            className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Emitir Nota
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-surface-50 border-b border-surface-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-surface-700">Número</th>
                                        <th className="px-6 py-3 font-semibold text-surface-700">Empresa</th>
                                        <th className="px-6 py-3 font-semibold text-surface-700">Valor</th>
                                        <th className="px-6 py-3 font-semibold text-surface-700">Ref</th>
                                        <th className="px-6 py-3 font-semibold text-surface-700">Status</th>
                                        <th className="px-6 py-3 font-semibold text-surface-700 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100">
                                    {historyInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                                                Nenhuma nota emitida ainda.
                                            </td>
                                        </tr>
                                    ) : (
                                        historyInvoices.map((nf) => (
                                            <tr key={nf.id} className="hover:bg-surface-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-surface-600">{nf.numero}</td>
                                                <td className="px-6 py-4 font-medium text-surface-900">{nf.company_name}</td>
                                                <td className="px-6 py-4 text-surface-900">R$ {nf.amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-surface-500">{nf.month_ref}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${nf.status === 'autorizada' ? 'bg-green-100 text-green-800' :
                                                            nf.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {nf.status === 'autorizada' ? 'Autorizada' :
                                                            nf.status === 'cancelada' ? 'Cancelada' : nf.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {nf.pdf_url && (
                                                            <a
                                                                href={nf.pdf_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 text-brand-600 hover:bg-brand-50 rounded transition-colors"
                                                                title="Baixar PDF"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        {nf.status !== 'cancelada' && (
                                                            <button
                                                                onClick={() => handleCancelClick(nf)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                                title="Cancelar Nota"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Emit Modal */}
            {emitModalOpen && selectedPending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-surface-200 bg-surface-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-surface-900">Emitir Nota Fiscal</h3>
                            <button onClick={() => setEmitModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <p className="text-sm text-blue-800">
                                    Os dados foram preenchidos automaticamente com base no plano de assinatura.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-surface-500 uppercase mb-1">Tomador</label>
                                <div className="p-3 bg-surface-50 rounded-lg border border-surface-200">
                                    <p className="font-bold text-surface-900">{selectedPending.company_name}</p>
                                    <p className="text-sm text-surface-500">{selectedPending.company_cnpj}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-surface-500 uppercase mb-1">Valor</label>
                                    <div className="p-3 bg-surface-50 rounded-lg border border-surface-200 font-mono font-bold text-green-700">
                                        R$ {selectedPending.amount.toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-surface-500 uppercase mb-1">Referência</label>
                                    <div className="p-3 bg-surface-50 rounded-lg border border-surface-200 font-mono">
                                        {selectedPending.month_ref}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-surface-500 uppercase mb-1">Descrição do Serviço</label>
                                <textarea
                                    className="w-full p-3 bg-white rounded-lg border border-surface-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    rows={3}
                                    readOnly
                                    value={`Assinatura ${selectedPending.plan_name} - Ref: ${selectedPending.month_ref}`}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-surface-500 uppercase mb-1">Código de Serviço (Sugestão IA)</label>
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-800 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    1.07 - Licenciamento de uso de programas...
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-surface-200 bg-surface-50 flex justify-end gap-3">
                            <button
                                onClick={() => setEmitModalOpen(false)}
                                className="px-4 py-2 text-surface-600 hover:bg-surface-200 rounded-lg font-medium transition-colors"
                                disabled={processing}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmEmit}
                                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                disabled={processing}
                            >
                                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                Confirmar Emissão
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {cancelModalOpen && selectedHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-surface-200 bg-surface-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-red-600">Cancelar Nota Fiscal</h3>
                            <button onClick={() => setCancelModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-surface-600">
                                Tem certeza que deseja cancelar a Nota Fiscal <strong>{selectedHistory.numero}</strong>?
                            </p>
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-800">
                                Esta ação é irreversível e será comunicada à prefeitura.
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-surface-500 uppercase mb-1">Motivo do Cancelamento</label>
                                <select className="w-full p-2.5 bg-white rounded-lg border border-surface-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500">
                                    <option>Erro na emissão</option>
                                    <option>Serviço não prestado</option>
                                    <option>Duplicidade</option>
                                    <option>Outros</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-4 border-t border-surface-200 bg-surface-50 flex justify-end gap-3">
                            <button
                                onClick={() => setCancelModalOpen(false)}
                                className="px-4 py-2 text-surface-600 hover:bg-surface-200 rounded-lg font-medium transition-colors"
                                disabled={processing}
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                disabled={processing}
                            >
                                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Confirmar Cancelamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminInvoices;
