import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/react-query';
import { Usuario, CargoUsuario } from '../types';
import { Button } from '../components/Botao';
import { SecureImage } from '../components/SecureImage';
import { maskCPF, maskPhone } from '../utils/formatadores';
import { Edit, Trash2, Plus, Search, Lock, Unlock, User as UserIcon, Briefcase, Wrench, Shield, X, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../contexts/ContextoNotificacao';

interface Props {
    user?: Usuario; // Current logged in user
    technicianMode?: boolean; // If true, only manages technicians
}

export const Users: React.FC<Props> = ({ user: currentUser, technicianMode = false }) => {
    const { notify } = useNotification();

    // React Query for fetching users
    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/usuarios');
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<CargoUsuario>('tecnico');
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    const handleOpenModal = (userToEdit?: Usuario) => {
        if (userToEdit) {
            setEditingUser(userToEdit);
            setName(userToEdit.nome_completo);
            setEmail(userToEdit.email);
            setRole(userToEdit.cargo);
            setCpf(userToEdit.cpf || '');
            setPhone(userToEdit.telefone || '');
            setPassword('');
        } else {
            setEditingUser(null);
            setName('');
            setEmail('');
            setRole(technicianMode ? 'tecnico' : 'tecnico'); // Default to tecnico
            setCpf('');
            setPhone('');
            setPassword('');
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!name || !email) {
            notify('Nome e Email são obrigatórios', 'error');
            return;
        }

        try {
            const payload: any = {
                nome_completo: name,
                email,
                cargo: role,
                cpf,
                telefone: phone
            };

            if (editingUser) {
                // Update
                if (password) payload.senha = password;
                await api.put(`/usuarios/${editingUser.id}`, payload);
                notify(`Usuário ${name} atualizado.`, 'success');
            } else {
                // Create
                if (!password) {
                    notify('Senha é obrigatória para novos usuários', 'error');
                    return;
                }
                payload.senha = password;
                // Default active
                payload.ativo = true;

                await api.post('/usuarios', payload);
                notify('Usuário criado com sucesso!', 'success');
            }

            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            notify('Erro ao salvar usuário.', 'error');
        }
    };

    const handleToggleStatus = async (userToEdit: Usuario) => {
        if (confirm(`Deseja ${userToEdit.ativo ? 'bloquear' : 'desbloquear'} este usuário?`)) {
            try {
                await api.put(`/usuarios/${userToEdit.id}`, { ativo: !userToEdit.ativo });
                queryClient.invalidateQueries({ queryKey: ['users'] });
                notify('Status atualizado.', 'success');
            } catch (e: any) {
                console.error(e);
                notify('Erro ao atualizar status.', 'error');
            }
        }
    };

    const handleDelete = async (userId: string | number) => {
        if (confirm('Tem certeza? Isso pode afetar históricos de serviço.')) {
            try {
                await api.delete(`/usuarios/${userId}`);
                queryClient.invalidateQueries({ queryKey: ['users'] });
                notify('Usuário removido.', 'success');
            } catch (e: any) {
                console.error(e);
                notify('Erro ao excluir usuário.', 'error');
            }
        }
    };

    // Filter Logic - filter by technicianMode
    const filteredUsers = users.filter(u => {
        // Safe access to fields
        const nome = u.nome_completo || '';
        const emailUser = u.email || '';
        const cargoUser = u.cargo || 'tecnico';

        // In technician mode, only show technicians
        if (technicianMode && cargoUser !== 'tecnico') {
            return false;
        }

        const matchSearch = nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emailUser.toLowerCase().includes(searchTerm.toLowerCase());
        const matchRole = filterRole ? cargoUser === filterRole : true;
        return matchSearch && matchRole;
    });

    const getRoleBadgeColor = (role: CargoUsuario) => {
        switch (role) {
            case 'super_admin': return 'bg-brand-50 text-brand-700';
            case 'prestador': return 'bg-purple-100 text-purple-800';
            case 'tecnico': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleIcon = (role: CargoUsuario) => {
        switch (role) {
            case 'super_admin': return <Shield className="w-3 h-3" />;
            case 'prestador': return <Briefcase className="w-3 h-3" />;
            case 'tecnico': return <Wrench className="w-3 h-3" />;
            default: return <UserIcon className="w-3 h-3" />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        {technicianMode ? (
                            <><Wrench className="w-6 h-6 mr-2 text-brand-600" /> Gestão de Técnicos</>
                        ) : (
                            <><UserIcon className="w-6 h-6 mr-2 text-brand-600" /> Gestão de Usuários</>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {technicianMode ? 'Gerencie seus técnicos de campo.' : 'Gerencie todos os usuários do sistema.'}
                    </p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus className="w-4 h-4 mr-2" /> {technicianMode ? 'Novo Técnico' : 'Novo Usuário'}
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`relative ${technicianMode ? 'col-span-3' : 'col-span-2'}`}>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 bg-white text-gray-900"
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                </div>
                {/* Role filter only in user management mode */}
                {!technicianMode && (
                    <select
                        className="border border-gray-300 rounded-md p-2 bg-white text-gray-900"
                        value={filterRole}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterRole(e.target.value)}
                    >
                        <option value="">Todos os Perfis</option>
                        <option value="prestador">Prestador</option>
                        <option value="tecnico">Técnico</option>
                    </select>
                )}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Carregando usuários...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((userItem: Usuario) => (
                                        <tr key={userItem.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden bg-brand-100 flex items-center justify-center">
                                                        {userItem.avatar_url ? (
                                                            <SecureImage
                                                                src={userItem.avatar_url}
                                                                alt={userItem.nome_completo || 'Avatar'}
                                                                className="h-10 w-10 object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-brand-600 font-bold text-lg">
                                                                {(userItem.nome_completo || 'U').charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{userItem.nome_completo || 'N/D'}</div>
                                                        <div className="text-sm text-gray-500">{userItem.cpf || 'CPF N/D'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full flex items-center w-fit gap-1 ${getRoleBadgeColor(userItem.cargo || 'tecnico')}`}>
                                                    {getRoleIcon(userItem.cargo || 'tecnico')}
                                                    {(userItem.cargo || 'tecnico').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{userItem.email || 'N/D'}</div>
                                                <div className="text-sm text-gray-500">{userItem.telefone || ''}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {/* SuperAdmin é sempre ativo */}
                                                {userItem.cargo === 'super_admin' ? (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                                        Sempre Ativo
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${userItem.ativo !== false ? 'bg-brand-50 text-brand-700' : 'bg-red-100 text-red-800'}`}>
                                                        {userItem.ativo !== false ? 'Ativo' : 'Bloqueado'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal(userItem)} className="text-brand-500 hover:text-brand-700" title="Editar">
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                {/* Não pode bloquear/excluir a si mesmo */}
                                                {userItem.id !== currentUser?.id && (
                                                    <>
                                                        <button onClick={() => handleToggleStatus(userItem)} className={`${userItem.ativo !== false ? 'text-orange-500 hover:text-orange-700' : 'text-green-500 hover:text-green-700'}`} title={userItem.ativo !== false ? 'Bloquear' : 'Desbloquear'}>
                                                            {userItem.ativo !== false ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                                                        </button>
                                                        <button onClick={() => handleDelete(userItem.id)} className="text-red-600 hover:text-red-900" title="Excluir">
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit/Create Modal - FULLSCREEN via Portal */}
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
                                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                                </h2>
                                <p className="text-sm text-surface-500">
                                    {editingUser ? 'Atualize os dados do usuário' : 'Preencha os dados para criar um novo usuário'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button id="user-save-btn" onClick={handleSave}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Salvar Usuário
                            </Button>
                        </div>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                        <div className="max-w-7xl mx-auto space-y-6">

                            {/* Main Grid Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                {/* Column 1: Basic Info */}
                                <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6">
                                    <h3 className="text-lg font-bold text-surface-800 mb-6 flex items-center gap-2 pb-4 border-b border-surface-100">
                                        <UserIcon className="w-5 h-5 text-brand-500" />
                                        Dados Pessoais
                                    </h3>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">Nome Completo *</label>
                                            <input
                                                id="user-name"
                                                type="text"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="Ex: João da Silva"
                                                className="w-full border border-surface-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">CPF</label>
                                            <input
                                                id="user-cpf"
                                                type="text"
                                                value={cpf}
                                                onChange={e => setCpf(maskCPF(e.target.value))}
                                                maxLength={14}
                                                placeholder="000.000.000-00"
                                                className="w-full border border-surface-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">Telefone</label>
                                            <input
                                                id="user-phone"
                                                type="text"
                                                value={phone}
                                                onChange={e => setPhone(maskPhone(e.target.value))}
                                                placeholder="(00) 00000-0000"
                                                className="w-full border border-surface-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Column 2: Access & Security */}
                                <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6">
                                    <h3 className="text-lg font-bold text-surface-800 mb-6 flex items-center gap-2 pb-4 border-b border-surface-100">
                                        <Shield className="w-5 h-5 text-brand-500" />
                                        Acesso e Segurança
                                    </h3>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">Email de Acesso *</label>
                                            <input
                                                id="user-email"
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="usuario@empresa.com"
                                                className="w-full border border-surface-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-surface-700 mb-1.5">
                                                {editingUser ? 'Redefinir Senha' : 'Senha Inicial *'}
                                            </label>
                                            <input
                                                id="user-password"
                                                type="password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder={editingUser ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                                                className="w-full border border-surface-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                            />
                                        </div>

                                        {/* Role selection only in user management mode */}
                                        {!technicianMode && (
                                            <div>
                                                <label className="block text-sm font-medium text-surface-700 mb-1.5">Perfil de Acesso</label>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <label className={`
                                                        relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all
                                                        ${role === 'tecnico' ? 'border-brand-500 bg-brand-50' : 'border-surface-200 hover:border-brand-200'}
                                                    `}>
                                                        <input
                                                            type="radio"
                                                            name="role"
                                                            value="tecnico"
                                                            checked={role === 'tecnico'}
                                                            onChange={() => setRole('tecnico')}
                                                            className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500"
                                                        />
                                                        <div className="ml-3">
                                                            <span className="block text-sm font-medium text-surface-900">Técnico</span>
                                                            <span className="block text-xs text-surface-500">Acesso ao App e execução de serviços</span>
                                                        </div>
                                                    </label>

                                                    <label className={`
                                                        relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all
                                                        ${role === 'prestador' ? 'border-purple-500 bg-purple-50' : 'border-surface-200 hover:border-purple-200'}
                                                    `}>
                                                        <input
                                                            type="radio"
                                                            name="role"
                                                            value="prestador"
                                                            checked={role === 'prestador'}
                                                            onChange={() => setRole('prestador')}
                                                            className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                                        />
                                                        <div className="ml-3">
                                                            <span className="block text-sm font-medium text-surface-900">Prestador (Admin)</span>
                                                            <span className="block text-xs text-surface-500">Gestão completa da empresa</span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Column 3: Summary & Tips */}
                                <div className="space-y-6">
                                    <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
                                        <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                                            <Briefcase className="w-5 h-5" />
                                            Resumo do Perfil
                                        </h3>

                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg shrink-0 ${role === 'tecnico' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                                    {role === 'tecnico' ? <Wrench className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-blue-900">
                                                        {role === 'tecnico' ? 'Perfil Técnico' : 'Perfil Prestador'}
                                                    </p>
                                                    <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                                                        {role === 'tecnico'
                                                            ? 'Este usuário poderá acessar o aplicativo móvel, visualizar sua agenda e executar ordens de serviço atribuídas a ele.'
                                                            : 'Este usuário terá acesso total ao painel administrativo, podendo gerenciar clientes, serviços, financeiro e outros usuários.'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-surface-50 rounded-2xl border border-surface-200 p-6">
                                        <h4 className="font-medium text-surface-900 mb-2">Informações Importantes</h4>
                                        <ul className="space-y-2 text-sm text-surface-600">
                                            <li className="flex items-start gap-2">
                                                <span className="text-brand-500 mt-0.5">•</span>
                                                O email será usado para login no sistema.
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-brand-500 mt-0.5">•</span>
                                                A senha deve ser forte para garantir segurança.
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-brand-500 mt-0.5">•</span>
                                                O CPF é importante para identificação em documentos.
                                            </li>
                                        </ul>
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
