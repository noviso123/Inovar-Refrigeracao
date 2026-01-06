import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Shield, User, Mail, ChevronRight, X, AlertCircle } from 'lucide-react';
import { Button, FAB } from '../components/Botao';
import { Usuario } from '../types';
import { useNotification } from '../contexts/ContextoNotificacao';
import api from '../services/api';

export const Users: React.FC = () => {
    const { notify } = useNotification();
    const [users, setUsers] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        nome_completo: '',
        cargo: 'prestador'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/usuarios');
            setUsers(res.data);
        } catch (error) {
            notify('Erro ao carregar usuários.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await api.post('/usuarios', formData);
            notify('Usuário criado com sucesso!', 'success');
            setIsModalOpen(false);
            setFormData({ email: '', password: '', nome_completo: '', cargo: 'prestador' });
            fetchUsers();
        } catch (error: any) {
            notify(error.response?.data?.detail || 'Erro ao criar usuário', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Excluir este usuário?')) return;
        try {
            await api.delete(`/usuarios/${id}`);
            notify('Usuário removido.', 'success');
            fetchUsers();
        } catch (error) {
            notify('Erro ao remover usuário.', 'error');
        }
    };

    const filteredUsers = users.filter(u =>
        u.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Shield className="w-6 h-6 text-brand-500" />
                    Equipe / Usuários
                </h1>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-5 h-5" />
                    Novo Usuário
                </Button>
            </div>

            <div className="card p-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input type="text" placeholder="Buscar usuários..." className="input pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <p className="col-span-full text-center py-10">Carregando...</p>
                ) : filteredUsers.map(u => (
                    <div key={u.id} className="card p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-600">
                                {u.nome_completo.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold text-surface-800">{u.nome_completo}</p>
                                <p className="text-xs text-surface-400 uppercase tracking-wider">{u.cargo}</p>
                            </div>
                        </div>
                        <button onClick={() => handleDelete(u.id)} className="p-2 text-surface-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-surface-400"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-bold mb-6">Convidar para a Equipe</h3>
                        <div className="space-y-4">
                            <input className="input" placeholder="Nome Completo" value={formData.nome_completo} onChange={e => setFormData({ ...formData, nome_completo: e.target.value })} />
                            <input className="input" placeholder="E-mail" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            <input className="input" type="password" placeholder="Senha Temporária" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            <select className="input" value={formData.cargo} onChange={e => setFormData({ ...formData, cargo: e.target.value })}>
                                <option value="prestador">Prestador (Acesso Operacional)</option>
                                <option value="admin">Administrador (Acesso Total)</option>
                            </select>
                            <Button onClick={handleSave} fullWidth>Criar Acesso</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
