import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { solicitacaoService } from '../services/solicitacaoService';
import { SolicitacaoServico } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, FileText, Download, AlertCircle, TrendingUp, Wallet, Receipt, XCircle } from 'lucide-react';
import { StatusBadge } from '../components/EmblemaStatus';
import { Button } from '../components/Botao';
import { generateFinancialReportCSV } from '../utils/formatadores';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Props {
    requests?: SolicitacaoServico[];
}

export const Financeiro: React.FC<Props> = ({ requests: initialRequests }) => {
    const [reportType, setReportType] = useState<'MONTHLY' | 'ANNUAL' | 'CUSTOM'>('MONTHLY');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // React Query Implementation
    const { data: requests = [] } = useQuery({
        queryKey: ['requests'],
        queryFn: solicitacaoService.listar,
        initialData: initialRequests,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const getFilteredRequests = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const safeRequests = Array.isArray(requests) ? requests : [];
        return safeRequests.filter(r => {
            const rawDate = r.criado_em || r.criadoEm;
            let date: Date;

            if (rawDate?.seconds) {
                date = new Date(rawDate.seconds * 1000);
            } else if (rawDate?._seconds) {
                date = new Date(rawDate._seconds * 1000);
            } else {
                date = new Date(rawDate);
            }

            if (isNaN(date.getTime())) return false;

            if (reportType === 'MONTHLY') {
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            } else if (reportType === 'ANNUAL') {
                return date.getFullYear() === currentYear;
            } else if (reportType === 'CUSTOM') {
                if (!startDate || !endDate) return true;
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return date >= start && date <= end;
            }
            return false;
        });
    };

    const filteredRequests = getFilteredRequests();

    const stats = useMemo(() => {
        let revenue = 0;
        let pending = 0;
        let potential = 0;
        let lost = 0;
        let issuedCount = 0;
        let pendingCount = 0;

        filteredRequests.forEach(r => {
            const val = r.valor_total || r.valorTotal || ((r.valor_mao_obra || 0) + (r.valor_pecas || 0));

            if (r.status === 'faturado' || r.status === 'concluido') {
                revenue += val;
                if (r.status === 'concluido' && !r.nfse?.numero) pendingCount++;
            } else if (r.status === 'aprovado' || r.status === 'em_andamento') {
                pending += val;
            } else if (r.status === 'orcamento' || r.status === 'pendente') {
                potential += val;
            } else if (r.status === 'cancelado') {
                lost += val;
            }

            if (r.nfse?.numero) {
                issuedCount++;
            }
        });

        return { revenue, pending, potential, lost, issuedCount, pendingCount };
    }, [filteredRequests]);

    const monthlyData = useMemo(() => {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const data = months.map(m => ({ name: m, faturado: 0, previsto: 0 }));

        filteredRequests.forEach(r => {
            const rawDate = r.criado_em || r.criadoEm;
            let date: Date;

            if (rawDate?.seconds) {
                date = new Date(rawDate.seconds * 1000);
            } else if (rawDate?._seconds) {
                date = new Date(rawDate._seconds * 1000);
            } else {
                date = new Date(rawDate);
            }

            if (isNaN(date.getTime())) return;

            const idx = date.getMonth();
            const val = r.valor_total || r.valorTotal || 0;

            if (r.status === 'faturado' || r.status === 'concluido') {
                data[idx].faturado += val;
            } else if (['aprovado', 'em_andamento'].includes(r.status)) {
                data[idx].previsto += val;
            }
        });
        return data;
    }, [filteredRequests]);

    const transactions = filteredRequests
        .filter(r => (r.valor_total || r.valorTotal) && (r.valor_total || r.valorTotal) > 0)
        .sort((a, b) => {
            const getRawDate = (r: any) => r.atualizado_em || r.atualizadoEm || r.criado_em || r.criadoEm;
            const parseDate = (raw: any) => {
                if (raw?.seconds) return new Date(raw.seconds * 1000);
                if (raw?._seconds) return new Date(raw._seconds * 1000);
                return new Date(raw);
            };

            const dateA = parseDate(getRawDate(a));
            const dateB = parseDate(getRawDate(b));
            return dateB.getTime() - dateA.getTime();
        });

    const handleExportReport = () => {
        const filteredRequests = getFilteredRequests();
        if (filteredRequests.length === 0) {
            alert('Nenhum registro encontrado para o período selecionado.');
            return;
        }
        const suffix = reportType === 'CUSTOM' ? `${startDate}_ate_${endDate}` : `${reportType.toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
        const csvContent = generateFinancialReportCSV(filteredRequests, reportType as any);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `relatorio_financeiro_${suffix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportXMLs = async () => {
        if (reportType === 'CUSTOM' && (!startDate || !endDate)) {
            alert('Por favor, selecione as datas de início e fim.');
            return;
        }

        const filteredRequests = getFilteredRequests();
        if (filteredRequests.length === 0) {
            alert('Nenhuma Nota Fiscal encontrada para o período selecionado.');
            return;
        }

        const zip = new JSZip();
        const suffix = reportType === 'CUSTOM' ? `${startDate}_ate_${endDate}` : `${reportType.toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
        const folderName = `xmls_${suffix}`;
        const folder = zip.folder(folderName);

        let count = 0;
        filteredRequests.forEach(r => {
            if (r.nfse?.numero) {
                const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nfse>
  <numero>${r.nfse.numero}</numero>
  <codigoVerificacao>${r.nfse.codigo_verificacao}</codigoVerificacao>
  <dataEmissao>${r.nfse.data_emissao}</dataEmissao>
  <prestador>
    <cnpj>00.000.000/0001-00</cnpj>
    <razaoSocial>Inovar Refrigeração Ltda</razaoSocial>
  </prestador>
  <tomador>
    <cpfCnpj>${r.clientes?.cpf || '000.000.000-00'}</cpfCnpj>
    <razaoSocial>${r.clientes?.nome}</razaoSocial>
  </tomador>
  <servico>
    <discriminacao>${r.titulo}</discriminacao>
    <valor>${(r.valor_total || 0).toFixed(2)}</valor>
    <valorLiquido>${(r.valor_total || 0).toFixed(2)}</valorLiquido>
    <iss>${((r.valor_total || 0) * 0.02).toFixed(2)}</iss>
  </servico>
</nfse>`;
                folder?.file(`nfse_${r.nfse.numero}.xml`, xmlContent);
                count++;
            }
        });

        if (count === 0) {
            alert('Nenhuma Nota Fiscal com XML disponível para o período selecionado.');
            return;
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `notas_fiscais_${suffix}.zip`);
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-4">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-surface-800 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-brand-500" />
                    Dashboard Financeiro
                </h1>
                <p className="text-surface-500 text-sm mt-0.5">
                    Acompanhe o fluxo de caixa do seu negócio
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-brand-50">
                            <TrendingUp className="w-5 h-5 text-brand-500" />
                        </div>
                        <span className="text-xs font-medium text-surface-500 uppercase">Receita</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-surface-800">
                        R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-brand-50">
                            <Wallet className="w-5 h-5 text-brand-500" />
                        </div>
                        <span className="text-xs font-medium text-surface-500 uppercase">A Receber</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-surface-800">
                        R$ {stats.pending.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-yellow-50">
                            <Receipt className="w-5 h-5 text-yellow-500" />
                        </div>
                        <span className="text-xs font-medium text-surface-500 uppercase">Potencial</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-surface-800">
                        R$ {stats.potential.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-red-50">
                            <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-xs font-medium text-surface-500 uppercase">Perdido</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-surface-800">
                        R$ {stats.lost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                </div>
            </div>

            {/* Métricas de NFSe */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="card p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-surface-500">Notas Emitidas</p>
                        <p className="text-2xl font-bold text-surface-800">{stats.issuedCount}</p>
                    </div>
                    <div className="p-3 bg-brand-50 rounded-xl">
                        <FileText className="w-6 h-6 text-brand-500" />
                    </div>
                </div>
                <div className="card p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-surface-500">Pendentes</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.pendingCount}</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-xl">
                        <AlertCircle className="w-6 h-6 text-orange-500" />
                    </div>
                </div>
            </div>

            {/* Exportação */}
            <div className="card p-4 sm:p-6">
                <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-500" />
                    Exportação Contábil
                </h3>

                <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-surface-700 mb-1.5">Tipo de Relatório</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value as any)}
                            className="input"
                        >
                            <option value="MONTHLY">Mensal</option>
                            <option value="ANNUAL">Anual</option>
                            <option value="CUSTOM">Personalizado</option>
                        </select>
                    </div>

                    {reportType === 'CUSTOM' && (
                        <>
                            <div className="w-full sm:w-auto">
                                <label className="block text-sm font-medium text-surface-700 mb-1.5">Início</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="input"
                                />
                            </div>
                            <div className="w-full sm:w-auto">
                                <label className="block text-sm font-medium text-surface-700 mb-1.5">Fim</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="input"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button onClick={handleExportReport} className="flex-1 sm:flex-none">
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline ml-1">CSV</span>
                        </Button>
                        <Button onClick={handleExportXMLs} variant="secondary" className="flex-1 sm:flex-none">
                            <FileText className="w-4 h-4" />
                            <span className="hidden sm:inline ml-1">XMLs</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="card p-4 sm:p-6">
                    <h3 className="font-semibold text-surface-800 mb-4">Fluxo Mensal</h3>
                    <div className="h-56 sm:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Legend />
                                <Bar dataKey="faturado" fill="#22c55e" name="Faturado" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="previsto" fill="#3b82f6" name="Previsto" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card p-4 sm:p-6">
                    <h3 className="font-semibold text-surface-800 mb-4">Composição de Receita</h3>
                    <div className="h-56 sm:h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Confirmada', value: stats.revenue },
                                        { name: 'A Receber', value: stats.pending },
                                        { name: 'Potencial', value: stats.potential },
                                        { name: 'Perdida', value: stats.lost }
                                    ]}
                                    cx="50%" cy="50%"
                                    innerRadius={50} outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="#22c55e" />
                                    <Cell fill="#3b82f6" />
                                    <Cell fill="#eab308" />
                                    <Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Lista de Transações */}
            <div className="card overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-surface-100 bg-surface-50">
                    <h3 className="font-semibold text-surface-800">Extrato de Movimentações</h3>
                </div>

                {/* Mobile: Cards */}
                <div className="sm:hidden divide-y divide-surface-100">
                    {transactions.slice(0, 10).map(t => (
                        <div key={t.id} className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-medium text-surface-800">#{t.numero || t.codigo_os || t.codigoOs || 'N/A'}</p>
                                    <p className="text-sm text-surface-500 truncate max-w-[200px]">{t.titulo}</p>
                                </div>
                                <StatusBadge status={t.status} />
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-surface-400">{t.clientes?.nome}</p>
                                <p className={`font-bold ${t.status === 'faturado' ? 'text-brand-500' : t.status === 'cancelado' ? 'text-red-400 line-through' : 'text-surface-700'}`}>
                                    R$ {(t.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop: Table */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-surface-100">
                        <thead className="bg-surface-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase">Ref. Serviço</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-surface-500 uppercase">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-surface-100">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-surface-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                                        {(() => {
                                            const raw = t.atualizado_em || t.atualizadoEm || t.criado_em || t.criadoEm;
                                            if (!raw) return 'Sem data';
                                            let date;
                                            if (raw?.seconds) date = new Date(raw.seconds * 1000);
                                            else if (raw?._seconds) date = new Date(raw._seconds * 1000);
                                            else date = new Date(raw);
                                            return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleDateString('pt-BR');
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-surface-800">
                                        #{t.numero || t.codigo_os || t.codigoOs || 'N/A'} - {t.titulo}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                                        {t.clientes?.nome}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={t.status} />
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${t.status === 'faturado' ? 'text-brand-500' : t.status === 'cancelado' ? 'text-red-400 line-through' : 'text-surface-700'}`}>
                                        R$ {(t.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Financeiro;
