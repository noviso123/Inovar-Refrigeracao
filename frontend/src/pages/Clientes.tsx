import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Edit, Trash2, User, MapPin, Phone, Mail, ChevronRight, X, Loader2 } from 'lucide-react';
import { Button, FAB } from '../components/Botao';
import { Cliente, Usuario } from '../types';
import { useNotification } from '../contexts/ContextoNotificacao';
import { maskPhone, maskCEP, maskCPF, maskCNPJ } from '../utils/formatadores';
import { fetchAddressByCEP } from '../services/servicoCep';
import { clienteService } from '../services/clienteService';
import { ListaEquipamentosCliente } from '../components/ListaEquipamentosCliente';

interface ClientesProps {
    user?: Usuario | null;
}

export const Clientes: React.FC<ClientesProps> = ({ user }) => {
    const { notify } = useNotification();

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

    const [formData, setFormData] = useState({
        nome: '',
        cpf: '',
        cnpj: '',
        email: '',
        telefone: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        periodoManutencaoMeses: ''
    });

    const [isLoadingCep, setIsLoadingCep] = useState(false);

    const [activeTab, setActiveTab] = useState<'dados' | 'equipamentos'>('dados');

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async () => {
        try {
            setLoading(true);
            const data = await clienteService.listar();
            setClientes(Array.isArray(data) ? data : []);
        } catch (error) {
            notify('Erro ao carregar clientes.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                periodoManutencaoMeses: Number(formData.periodoManutencaoMeses) || 0
            };

            if (editingCliente) {
                await clienteService.atualizar(editingCliente.id, payload);
                notify('Cliente atualizado com sucesso!', 'success');
                setIsModalOpen(false);
                resetForm();
            } else {
                const newClient = await clienteService.criar(payload);
                notify('Cliente criado! Adicione os equipamentos.', 'success');
                setEditingCliente(newClient);
                setActiveTab('equipamentos');
            }
            fetchClientes();
        } catch (error: any) {
            console.error(error);
            const detail = error.response?.data?.detail || error.response?.data?.message || 'Erro ao salvar cliente';
            notify(detail, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
        try {
            await clienteService.remover(id);
            notify('Cliente removido.', 'success');
            fetchClientes();
        } catch (error) {
            notify('Erro ao excluir cliente.', 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            nome: '', cpf: '', cnpj: '', email: '', telefone: '',
            cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', periodoManutencaoMeses: ''
        });
        setEditingCliente(null);
        setActiveTab('dados');
    };

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = maskCEP(e.target.value);
        setFormData(prev => ({ ...prev, cep: value }));

        if (value.replace(/\D/g, '').length === 8) {
            setIsLoadingCep(true);
            try {
                const addressData = await fetchAddressByCEP(value);
                if (addressData) {
                    setFormData(prev => ({
                        ...prev,
                        endereco: addressData.logradouro || '',
                        bairro: addressData.bairro || '',
                        cidade: addressData.cidade || '',
                        estado: addressData.estado || ''
                    }));
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            }
            setIsLoadingCep(false);
        }
    };

    const openEdit = (cliente: Cliente) => {
        setEditingCliente(cliente);
        setFormData({
            nome: cliente.nome,
            cpf: cliente.cpf || '',
            cnpj: cliente.cnpj || '',
            email: cliente.email || '',
            telefone: cliente.telefone || '',
            cep: cliente.cep || '',
            endereco: cliente.endereco || '',
            numero: cliente.numero || '',
            complemento: cliente.complemento || '',
            bairro: cliente.bairro || '',
            cidade: cliente.cidade || '',
            estado: cliente.estado || '',
            periodoManutencaoMeses: cliente.periodoManutencaoMeses?.toString() || ''
        });
        setActiveTab('dados');
        setIsModalOpen(true);
    };

    const filteredClientes = clientes.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 pb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-surface-800 flex items-center gap-2">
                        <User className="w-6 h-6 text-brand-500" />
                        Clientes
                    </h1>
                    <p className="text-sm text-surface-500 mt-0.5 hidden sm:block">
                        Gerencie sua base de clientes
                    </p>
                </div>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="hidden sm:flex">
                    <Plus className="w-5 h-5" />
                    <span>Novo Cliente</span>
                </Button>
            </div>

            {/* Search */}
            <div className="card p-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input
                        type="text"
                        placeholder="Buscar clientes..."
                        className="input pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Results count */}
            <p className="text-sm text-surface-500 px-1">
                {filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''} encontrado{filteredClientes.length !== 1 ? 's' : ''}
            </p>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
            ) : filteredClientes.length === 0 ? (
                <div className="card p-12 text-center">
                    <User className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-surface-600">Nenhum cliente encontrado</p>
                    <p className="text-sm text-surface-400 mt-1">Comece adicionando seu primeiro cliente</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClientes.map(cliente => (
                        <div
                            key={cliente.id}
                            className="card card-interactive overflow-hidden"
                            onClick={() => openEdit(cliente)}
                        >
                            <div className="p-4">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-lg flex-shrink-0">
                                        {cliente.nome.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold bg-surface-200 text-surface-700 px-1.5 py-0.5 rounded">
                                                #{cliente.sequential_id || cliente.id}
                                            </span>
                                            <h3 className="font-semibold text-surface-800 truncate">{cliente.nome}</h3>
                                        </div>
                                        <p className="text-xs text-surface-400 uppercase">
                                            {cliente.cnpj ? 'Empresa' : 'Pessoa Física'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(cliente.id); }}
                                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-500 hover:text-red-700"
                                        title="Excluir cliente"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className="w-5 h-5 text-surface-300 flex-shrink-0" />
                                </div>

                                <div className="space-y-2">
                                    {cliente.email && (
                                        <div className="flex items-center text-sm text-surface-600">
                                            <Mail className="w-4 h-4 mr-2 text-surface-400 flex-shrink-0" />
                                            <span className="truncate">{cliente.email}</span>
                                        </div>
                                    )}
                                    {cliente.telefone && (
                                        <div className="flex items-center text-sm text-surface-600">
                                            <Phone className="w-4 h-4 mr-2 text-surface-400 flex-shrink-0" />
                                            <span>{maskPhone(cliente.telefone)}</span>
                                        </div>
                                    )}
                                    {(cliente.endereco || cliente.cidade) && (
                                        <div className="flex items-start text-sm text-surface-500">
                                            <MapPin className="w-4 h-4 mr-2 text-surface-400 flex-shrink-0 mt-0.5" />
                                            <span className="line-clamp-1">
                                                {cliente.cidade}{cliente.estado && `/${cliente.estado}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* FAB Mobile */}
            <FAB
                icon={<Plus className="w-6 h-6" />}
                label="Novo Cliente"
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="lg:hidden"
            />

            {/* Modal - Fullscreen via Portal */}
            {isModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-surface-200 flex items-center gap-3 bg-white shrink-0">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-surface-100 rounded-xl transition-colors text-surface-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h3 className="text-lg font-bold text-surface-800">
                                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
                            </h3>
                        </div>

                        {/* Tabs */}
                        {editingCliente && (
                            <div className="flex border-b border-surface-100 px-4 sm:px-6 bg-white">
                                <button
                                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dados'
                                        ? 'border-brand-500 text-brand-600'
                                        : 'border-transparent text-surface-500'
                                        }`}
                                    onClick={() => setActiveTab('dados')}
                                >
                                    Dados Gerais
                                </button>
                                <button
                                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'equipamentos'
                                        ? 'border-brand-500 text-brand-600'
                                        : 'border-transparent text-surface-500'
                                        }`}
                                    onClick={() => setActiveTab('equipamentos')}
                                >
                                    Equipamentos
                                </button>
                            </div>
                        )}

                        {/* Content - fills all remaining space */}
                        <div className="flex-1 overflow-y-auto p-4 bg-surface-50">
                            {activeTab === 'dados' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 mb-1.5">
                                            Nome Completo / Razão Social *
                                        </label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.nome}
                                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                            placeholder="Ex: João Silva ou Empresa LTDA"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
                                            <input
                                                type="email"
                                                className="input"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="cliente@email.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">Telefone</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.telefone}
                                                onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                                                placeholder="(00) 00000-0000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">CPF</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.cpf}
                                                onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                                                placeholder="000.000.000-00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">CNPJ</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.cnpj}
                                                onChange={e => setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })}
                                                placeholder="00.000.000/0000-00"
                                            />
                                        </div>
                                    </div>

                                    {/* Endereço */}
                                    <div className="pt-4 border-t border-surface-100">
                                        <h4 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-brand-500" />
                                            Endereço
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="relative">
                                                <label className="block text-xs text-surface-500 mb-1">CEP *</label>
                                                <input
                                                    type="text"
                                                    className="input pr-8"
                                                    value={formData.cep}
                                                    onChange={handleCepChange}
                                                    placeholder="00000-000"
                                                    maxLength={9}
                                                />
                                                {isLoadingCep && <Loader2 className="absolute right-2 top-7 w-4 h-4 animate-spin text-brand-500" />}
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs text-surface-500 mb-1">Rua/Logradouro</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={formData.endereco}
                                                    onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                                                    placeholder="Rua, Avenida..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-surface-500 mb-1">Número *</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={formData.numero}
                                                    onChange={e => setFormData({ ...formData, numero: e.target.value })}
                                                    placeholder="123"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-surface-500 mb-1">Complemento</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={formData.complemento}
                                                    onChange={e => setFormData({ ...formData, complemento: e.target.value })}
                                                    placeholder="Apto, Sala..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-surface-500 mb-1">Bairro</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={formData.bairro}
                                                    onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                                                    placeholder="Bairro"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-surface-500 mb-1">Cidade</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={formData.cidade}
                                                    onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-surface-500 mb-1">Estado</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={formData.estado}
                                                    onChange={e => setFormData({ ...formData, estado: e.target.value })}
                                                    maxLength={2}
                                                    placeholder="UF"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <ListaEquipamentosCliente clienteId={Number(editingCliente!.id)} />
                            )}
                        </div>

                        {/* Footer */}
                        {activeTab === 'dados' && (
                            <div className="p-4 border-t border-surface-200 flex gap-3 bg-white shrink-0">
                                <Button variant="secondary" onClick={() => setIsModalOpen(false)} fullWidth>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSave} fullWidth>
                                    Salvar Cliente
                                </Button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Clientes;
