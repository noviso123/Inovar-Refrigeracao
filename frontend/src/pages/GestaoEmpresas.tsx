import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Usuario } from '../types';
import api from '../services/api';
import { Button } from '../components/Botao';
import { Building2, Search, Edit, CheckCircle, XCircle, ShieldCheck, X, Save, Ban, Unlock } from 'lucide-react';
import { useNotification } from '../contexts/ContextoNotificacao';
import { DashboardSkeleton } from '../components/Skeleton';
import { maskCNPJ, maskPhone } from '../utils/formatadores';

interface Company {
    id: number;
    name: string;
    cnpj: string;
    email: string;
    phone: string;
    nfse_active: boolean;
    status: string;
    // Add other fields as needed
    nome_fantasia?: string;
    endereco_completo?: string;
}

interface Props {
    user: Usuario;
}

export const GestaoEmpresas: React.FC<Props> = ({ user }) => {
    const { notify } = useNotification();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('todos');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        nome_fantasia: '',
        cnpj: '',
        email: '',
        phone: '',
        endereco_completo: '',
        nfse_active: false,
        status: 'ativa'
    });

    const { data: companies, isLoading } = useQuery({
        queryKey: ['empresas'],
        queryFn: async () => {
            const res = await api.get('/empresas');
            return res.data;
        }
    });

    const updateCompanyMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.put(`/empresas/${editingCompany?.id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empresas'] });
            notify('Empresa atualizada com sucesso!', 'success');
            setIsModalOpen(false);
        },
        onError: () => {
            notify('Erro ao atualizar empresa.', 'error');
        }
    });

    const handleOpenModal = (company: Company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name || '',
            nome_fantasia: company.nome_fantasia || '',
            cnpj: company.cnpj || '',
            email: company.email || '',
            phone: company.phone || '',
            endereco_completo: company.endereco_completo || '',
            nfse_active: company.nfse_active || false,
            status: company.status || 'ativa'
        });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!editingCompany) return;
        updateCompanyMutation.mutate(formData);
    };

    const handleStatusChange = async (company: Company, newStatus: string) => {
        if (confirm(`Deseja alterar o status da empresa para ${newStatus.toUpperCase()}?`)) {
            try {
                await api.put(`/empresas/${company.id}`, { status: newStatus });
                queryClient.invalidateQueries({ queryKey: ['empresas'] });
                notify('Status atualizado com sucesso!', 'success');
            } catch (error) {
                notify('Erro ao atualizar status', 'error');
            }
        }
    };

    const filteredCompanies = companies?.filter((c: Company) => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.cnpj.includes(searchTerm) ||
            c.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'todos' || c.status === filterStatus;
        return matchesSearch && matchesStatus;
    }) || [];

    if (isLoading) return <DashboardSkeleton />;

    return (
        <div className="space-y-6 pb-20 lg:pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-800 flex items-center gap-2">
                        <Building2 className="w-7 h-7 text-brand-500" />
                        Gestão de Empresas
                    </h1>
                    <p className="text-surface-500 text-sm mt-1">
                        Gerencie todas as empresas cadastradas na plataforma
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, CNPJ ou email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input pl-10"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="input sm:w-48"
                >
                    <option value="todos">Todos os Status</option>
                    <option value="ativa">Ativas</option>
                    <option value="pendente">Pendentes</option>
                    <option value="bloqueada">Bloqueadas</option>
                </select>
            </div>

            {/* List */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NFSe</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredCompanies.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Nenhuma empresa encontrada.
                                    </td>
                                </tr>
                            ) : (
                                filteredCompanies.map((company: Company) => (
                                    <tr key={company.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-brand-100 rounded-lg flex items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-brand-600" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{company.name}</div>
                                                    <div className="text-sm text-gray-500">{company.cnpj}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{company.email}</div>
                                            <div className="text-sm text-gray-500">{company.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${company.status === 'ativa' ? 'bg-green-100 text-green-800' :
                                                company.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {company.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {company.nfse_active ? (
                                                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Ativa</span>
                                            ) : (
                                                <span className="text-gray-400 flex items-center gap-1"><XCircle className="w-4 h-4" /> Inativa</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(company)} className="text-brand-600 hover:text-brand-900">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            {company.status === 'ativa' ? (
                                                <Button variant="ghost" size="sm" onClick={() => handleStatusChange(company, 'bloqueada')} className="text-red-600 hover:text-red-900" title="Bloquear">
                                                    <Ban className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => handleStatusChange(company, 'ativa')} className="text-green-600 hover:text-green-900" title="Ativar">
                                                    <Unlock className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal - FULLSCREEN */}
            {isModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] bg-surface-50 flex flex-col animate-in fade-in duration-200">
                    {/* Header */}
                    <div className="bg-white border-b border-surface-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-surface-100 rounded-full transition-colors text-surface-500"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-surface-900">
                                    Editar Empresa
                                </h2>
                                <p className="text-sm text-surface-500">
                                    {editingCompany?.name}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave}>
                                <Save className="w-4 h-4 mr-2" />
                                Salvar Alterações
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                        <div className="max-w-5xl mx-auto space-y-6">

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Basic Info */}
                                <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6">
                                    <h3 className="text-lg font-bold text-surface-800 mb-6 flex items-center gap-2 pb-4 border-b border-surface-100">
                                        <Building2 className="w-5 h-5 text-brand-500" />
                                        Dados da Empresa
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="label">Razão Social</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Nome Fantasia</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.nome_fantasia}
                                                onChange={e => setFormData({ ...formData, nome_fantasia: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">CNPJ</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.cnpj}
                                                onChange={e => setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6">
                                    <h3 className="text-lg font-bold text-surface-800 mb-6 flex items-center gap-2 pb-4 border-b border-surface-100">
                                        <ShieldCheck className="w-5 h-5 text-brand-500" />
                                        Contato e Status
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="label">Email</label>
                                            <input
                                                type="email"
                                                className="input"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Telefone</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Status</label>
                                            <select
                                                className="input"
                                                value={formData.status}
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            >
                                                <option value="ativa">Ativa</option>
                                                <option value="pendente">Pendente</option>
                                                <option value="bloqueada">Bloqueada</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2 pt-4">
                                            <input
                                                type="checkbox"
                                                id="nfse_active"
                                                checked={formData.nfse_active}
                                                onChange={e => setFormData({ ...formData, nfse_active: e.target.checked })}
                                                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            <label htmlFor="nfse_active" className="text-sm font-medium text-gray-700">
                                                Habilitar Emissão de NFSe
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 lg:col-span-2">
                                    <h3 className="text-lg font-bold text-surface-800 mb-6 flex items-center gap-2 pb-4 border-b border-surface-100">
                                        Endereço
                                    </h3>
                                    <div>
                                        <label className="label">Endereço Completo</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.endereco_completo}
                                            onChange={e => setFormData({ ...formData, endereco_completo: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default GestaoEmpresas;
