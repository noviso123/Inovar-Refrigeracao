import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Edit, Trash2, User, MapPin, Phone, Mail, ChevronRight, X, Loader2 } from 'lucide-react';
import { Button, FAB } from '../components/Botao';
import { Cliente, Usuario, Local } from '../types';
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
        estado: ''
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
            if (editingCliente) {
                await clienteService.atualizar(editingCliente.id, formData);
                notify('Cliente atualizado!', 'success');
                setIsModalOpen(false);
                resetForm();
            } else {
                const newClient = await clienteService.criar(formData);
                notify('Cliente criado!', 'success');
                setEditingCliente(newClient);
                setActiveTab('equipamentos');
            }
            fetchClientes();
        } catch (error: any) {
            console.error(error);
            const detail = error.response?.data?.detail || 'Erro ao salvar cliente';
            notify(detail, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Excluir este cliente e todos os seus vínculos?')) return;
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
            cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''
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
            } catch (error) { console.error(error); }
            setIsLoadingCep(false);
        }
    };

    const openEdit = (cliente: Cliente) => {
        setEditingCliente(cliente);
        const primary = cliente.locations?.[0] || {};
        setFormData({
            nome: cliente.nome,
            cpf: cliente.cpf || '',
            cnpj: cliente.cnpj || '',
            email: cliente.email || '',
            telefone: cliente.telefone || '',
            cep: (primary as Local).zip_code || '',
            endereco: (primary as Local).address || '',
            numero: (primary as Local).street_number || '',
            complemento: (primary as Local).complement || '',
            bairro: (primary as Local).neighborhood || '',
            cidade: (primary as Local).city || '',
            estado: (primary as Local).state || ''
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-800 flex items-center gap-2">
                        <User className="w-6 h-6 text-brand-500" />
                        Clientes
                    </h1>
                </div>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
                    <Plus className="w-5 h-5" />
                    <span>Novo Cliente</span>
                </Button>
            </div>

            <div className="card p-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input type="text" placeholder="Buscar clientes..." className="input pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
                ) : filteredClientes.map(cliente => (
                    <div key={cliente.id} className="card card-interactive p-4" onClick={() => openEdit(cliente)}>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                                {cliente.nome.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-surface-800 truncate">{cliente.nome}</h3>
                                {cliente.locations?.[0] && (
                                    <p className="text-xs text-surface-500 flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" />
                                        {(cliente.locations[0] as Local).city}/{(cliente.locations[0] as Local).state}
                                    </p>
                                )}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(cliente.id); }} className="p-2 hover:bg-red-50 text-surface-300 hover:text-red-500 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
                    <div className="p-4 border-b flex items-center gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-100 rounded-xl"><X className="w-5 h-5" /></button>
                        <h3 className="text-lg font-bold">{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    </div>

                    {editingCliente && (
                        <div className="flex border-b px-4">
                            <button className={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'dados' ? 'border-brand-500 text-brand-600' : 'border-transparent'}`} onClick={() => setActiveTab('dados')}>Dados</button>
                            <button className={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'equipamentos' ? 'border-brand-500 text-brand-600' : 'border-transparent'}`} onClick={() => setActiveTab('equipamentos')}>Equipamentos</button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeTab === 'dados' ? (
                            <>
                                <div className="space-y-4">
                                    <input className="input" placeholder="Nome Completo / Razão Social" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input className="input" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        <input className="input" placeholder="Telefone" value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: maskPhone(e.target.value) })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input className="input" placeholder="CPF" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })} />
                                        <input className="input" placeholder="CNPJ" value={formData.cnpj} onChange={e => setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })} />
                                    </div>
                                    <div className="pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <input className="input" placeholder="CEP" value={formData.cep} onChange={handleCepChange} />
                                        <input className="input md:col-span-2" placeholder="Endereço" value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} />
                                        <input className="input" placeholder="Nº" value={formData.numero} onChange={e => setFormData({ ...formData, numero: e.target.value })} />
                                        <input className="input" placeholder="Bairro" value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })} />
                                        <input className="input" placeholder="Cidade" value={formData.cidade} onChange={e => setFormData({ ...formData, cidade: e.target.value })} />
                                        <input className="input" placeholder="UF" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} maxLength={2} />
                                    </div>
                                </div>
                                <Button onClick={handleSave} className="mt-6" fullWidth>Salvar</Button>
                            </>
                        ) : (
                            <ListaEquipamentosCliente clienteId={Number(editingCliente!.id)} locations={editingCliente!.locations || []} />
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
