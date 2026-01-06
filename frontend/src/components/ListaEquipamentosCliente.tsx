import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Wrench, Package, Calendar, Loader2, MapPin } from 'lucide-react';
import { Button } from './Botao';
import api from '../services/api';
import { Equipamento, Local } from '../types';
import { useNotification } from '../contexts/ContextoNotificacao';

interface ListaEquipamentosClienteProps {
    clienteId: number;
    locations: Local[];
}

export const ListaEquipamentosCliente: React.FC<ListaEquipamentosClienteProps> = ({ clienteId, locations }) => {
    const { notify } = useNotification();
    const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [formData, setFormData] = useState({
        nome: '',
        marca: '',
        modelo: '',
        numero_serie: '',
        tipo_equipamento: 'ar_condicionado',
        data_instalacao: '',
        location_id: locations[0]?.id || 0
    });

    useEffect(() => {
        fetchEquipamentos();
    }, [clienteId]);

    const fetchEquipamentos = async () => {
        try {
            setLoading(true);
            // Fetch equipments for all client locations
            const allEquips: Equipamento[] = [];
            for (const loc of locations) {
                const res = await api.get<Equipamento[]>(`/equipamentos?locationId=${loc.id}`);
                allEquips.push(...res.data);
            }
            setEquipamentos(allEquips);
        } catch (error) {
            notify('Erro ao buscar equipamentos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!formData.location_id) {
            notify('Selecione um local para o equipamento.', 'warning');
            return;
        }
        try {
            await api.post('/equipamentos', formData);
            notify('Equipamento adicionado!', 'success');
            setIsAdding(false);
            setFormData({ ...formData, nome: '', marca: '', modelo: '', numero_serie: '' });
            fetchEquipamentos();
        } catch (error) {
            notify('Erro ao adicionar equipamento.', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Excluir este equipamento?')) return;
        try {
            await api.delete(`/equipamentos/${id}`);
            notify('Equipamento removido.', 'success');
            fetchEquipamentos();
        } catch (error) {
            notify('Erro ao remover equipamento.', 'error');
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-surface-700 flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Equipamentos Instalados
                </h4>
                <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'}>
                    {isAdding ? 'Cancelar' : 'Novo'}
                </Button>
            </div>

            {isAdding && (
                <div className="card p-4 border-2 border-brand-100 bg-brand-50/30 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-surface-600 mb-1">Local de Instalação *</label>
                            <select
                                className="input"
                                value={formData.location_id}
                                onChange={e => setFormData({...formData, location_id: Number(e.target.value)})}
                            >
                                <option value={0}>Selecione um local...</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.nickname} - {loc.address}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-surface-600 mb-1">Nome do Equipamento *</label>
                            <input className="input" placeholder="Ex: Ar Condicionado Sala" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-surface-600 mb-1">Marca</label>
                            <input className="input" placeholder="LG, Samsung..." value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-surface-600 mb-1">Modelo</label>
                            <input className="input" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-surface-600 mb-1">Nº de Série</label>
                            <input className="input" value={formData.numero_serie} onChange={e => setFormData({...formData, numero_serie: e.target.value})} />
                        </div>
                    </div>
                    <Button onClick={handleAdd} fullWidth>Cadastrar Equipamento</Button>
                </div>
            )}

            <div className="space-y-2">
                {equipamentos.length === 0 ? (
                    <p className="text-center py-8 text-surface-400 text-sm italic">Nenhum equipamento cadastrado.</p>
                ) : (
                    equipamentos.map(eq => (
                        <div key={eq.id} className="p-3 bg-white border border-surface-200 rounded-xl flex items-center justify-between group">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-surface-100 rounded-lg group-hover:bg-brand-100 transition-colors">
                                    <Package className="w-4 h-4 text-surface-600 group-hover:text-brand-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-surface-800 text-sm">{eq.nome}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                                        <span className="text-xs text-surface-500 uppercase">{eq.marca} {eq.modelo}</span>
                                        <span className="text-xs text-surface-400 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {locations.find(l => l.id === eq.location_id)?.nickname || 'Local Desconhecido'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(eq.id)} className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
